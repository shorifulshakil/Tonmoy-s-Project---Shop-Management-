import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/ProductCard";
import { AddProductDialog } from "@/components/AddProductDialog";
import { SellDialog } from "@/components/SellDialog";
import { AppSidebar, type SectionKey } from "@/components/AppSidebar";
import { BarChart } from "@/components/charts/BarChart";
import { Donut } from "@/components/charts/Donut";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Package, AlertTriangle, ShoppingBag, DollarSign, CheckCircle2, Zap, XCircle, Boxes } from "lucide-react";
import { fmtBDT, fmtBDTk } from "@/lib/currency";

type Product = Tables<"products">;
type Sale = Tables<"sales">;

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Zebra Outfit" }] }),
});

const DONUT_COLORS = ["#c8a951", "#27ae60", "#2980b9", "#e74c3c", "#9b59b6", "#16a085", "#e67e22"];

function Dashboard() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [sellTarget, setSellTarget] = useState<Product | null>(null);
  const [section, setSection] = useState<SectionKey>("dashboard");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("All");

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/auth" });
  }, [session, authLoading, navigate]);

  const load = useCallback(async () => {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("sales").select("*").order("sale_date", { ascending: false }).limit(1000),
    ]);
    setProducts(p ?? []);
    setSales(s ?? []);
  }, []);

  useEffect(() => { if (session) load(); }, [session, load]);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    const todaySales = sales.filter((s) => new Date(s.sale_date) >= today);
    const yestSales = sales.filter((s) => { const d = new Date(s.sale_date); return d >= yest && d < today; });
    const todayRevenue = todaySales.reduce((a, s) => a + Number(s.total), 0);
    const yestRevenue = yestSales.reduce((a, s) => a + Number(s.total), 0);
    const change = yestRevenue > 0 ? ((todayRevenue - yestRevenue) / yestRevenue) * 100 : (todayRevenue > 0 ? 100 : 0);
    const todayUnits = todaySales.reduce((a, s) => a + s.quantity, 0);
    const yestUnits = yestSales.reduce((a, s) => a + s.quantity, 0);
    const unitsChange = yestUnits > 0 ? ((todayUnits - yestUnits) / yestUnits) * 100 : (todayUnits > 0 ? 100 : 0);
    const totalRevenue = sales.reduce((a, s) => a + Number(s.total), 0);
    const totalUnits = sales.reduce((a, s) => a + s.quantity, 0);
    const lowStock = products.filter((p) => p.stock > 0 && p.stock < 5).length;
    const outOfStock = products.filter((p) => p.stock === 0).length;
    const inStock = products.filter((p) => p.stock >= 5).length;
    const avgOrder = sales.length ? totalRevenue / sales.length : 0;

    const soldMap = new Map<string, number>();
    sales.forEach((s) => soldMap.set(s.product_id, (soldMap.get(s.product_id) ?? 0) + s.quantity));

    // Weekly bars (last 7 days)
    const weekly = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (6 - i));
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const v = sales.filter((s) => { const sd = new Date(s.sale_date); return sd >= d && sd < next; })
        .reduce((a, s) => a + Number(s.total), 0);
      return { label: d.toLocaleDateString("en", { weekday: "short" }).slice(0, 3), value: Math.round(v / 1000) };
    });

    // Hourly bars today (every 3h)
    const hourly = Array.from({ length: 8 }).map((_, i) => {
      const start = new Date(today); start.setHours(i * 3);
      const end = new Date(today); end.setHours(i * 3 + 3);
      const v = sales.filter((s) => { const sd = new Date(s.sale_date); return sd >= start && sd < end; })
        .reduce((a, s) => a + Number(s.total), 0);
      return { label: `${i * 3}h`, value: Math.round(v) };
    });

    // Category split (revenue)
    const catRev = new Map<string, number>();
    sales.forEach((s) => {
      const p = products.find((p) => p.id === s.product_id);
      const cat = p?.category ?? "Other";
      catRev.set(cat, (catRev.get(cat) ?? 0) + Number(s.total));
    });
    const catSlices = Array.from(catRev.entries())
      .filter(([, v]) => v > 0)
      .map(([label, value], i) => ({ label, value, color: DONUT_COLORS[i % DONUT_COLORS.length] }));

    return {
      todayRevenue, yestRevenue, change, todayUnits, unitsChange,
      totalRevenue, totalUnits, lowStock, outOfStock, inStock, avgOrder,
      soldMap, weekly, hourly, catSlices,
    };
  }, [sales, products]);

  const categories = useMemo(() => {
    const set = new Set<string>(products.map((p) => p.category ?? "Other"));
    return ["All", ...Array.from(set)];
  }, [products]);

  const filtered = products.filter((p) => {
    const matchCat = catFilter === "All" || (p.category ?? "Other") === catFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });
  const discounted = products.filter((p) => p.discount_percent > 0);
  const trending = [...products]
    .map((p) => ({ p, sold: stats.soldMap.get(p.id) ?? 0, rev: 0 }))
    .map((x) => ({
      ...x,
      rev: sales.filter((s) => s.product_id === x.p.id).reduce((a, s) => a + Number(s.total), 0),
    }))
    .filter((x) => x.sold > 0 || x.p.is_featured)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 12);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product permanently?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted");
    load();
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/" }); };

  if (authLoading || !session) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  const titleMap: Record<SectionKey, string> = {
    dashboard: "Dashboard", products: "Products", discounted: "Discounted",
    trending: "Trending", daily: "Daily Sales", stock: "Stock Overview",
  };
  const today = new Date().toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen">
      <AppSidebar active={section} onChange={setSection} email={session.user.email ?? "admin"} onSignOut={signOut} />

      <main className="ml-[260px] min-h-screen">
        <header className="bg-card border-b border-border px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          <h1 className="font-display text-xl font-bold">{titleMap[section]}</h1>
          <div className="text-xs text-muted-foreground font-mono">{today}</div>
        </header>

        <div className="p-8">
          {section === "dashboard" && <DashboardSection stats={stats} sales={sales} products={products} />}
          {section === "products" && (
            <ProductsSection
              products={filtered} categories={categories} catFilter={catFilter} setCatFilter={setCatFilter}
              search={search} setSearch={setSearch} userId={session.user.id} onAdded={load}
              onDelete={handleDelete} onSell={setSellTarget} soldMap={stats.soldMap}
            />
          )}
          {section === "discounted" && <DiscountedSection products={discounted} onSell={setSellTarget} onDelete={handleDelete} soldMap={stats.soldMap} />}
          {section === "trending" && <TrendingSection items={trending} />}
          {section === "daily" && <DailySection stats={stats} sales={sales} products={products} />}
          {section === "stock" && <StockSection stats={stats} products={products} />}
        </div>
      </main>

      <SellDialog product={sellTarget} onClose={() => setSellTarget(null)} onSold={load} userId={session.user.id} />
    </div>
  );
}

/* ─── Sections ─── */

function KpiCard({
  label, value, sub, icon, accent = "gold", trend,
}: { label: string; value: string; sub?: string; icon: React.ReactNode; accent?: "gold" | "success" | "danger" | "info"; trend?: "up" | "down" }) {
  const border = {
    gold: "border-t-gold", success: "border-t-success", danger: "border-t-destructive", info: "border-t-info",
  }[accent];
  return (
    <div className={`bg-card border border-border ${border} border-t-[3px] rounded-[4px] p-6 relative overflow-hidden hover:border-gold transition-all`}>
      <div className="text-[0.7rem] tracking-luxe uppercase text-muted-foreground mb-2.5">{label}</div>
      <div className="font-display text-[2rem] font-bold leading-none">{value}</div>
      {sub && (
        <div className={`text-xs mt-2 ${trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>
          {trend === "up" ? "↑ " : trend === "down" ? "↓ " : ""}{sub}
        </div>
      )}
      <div className="absolute right-4 top-4 text-3xl opacity-10">{icon}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-[4px] p-6">
      <div className="text-[0.75rem] tracking-luxe uppercase text-muted-foreground mb-5">{title}</div>
      {children}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      {sub && <p className="text-[0.78rem] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function DashboardSection({ stats, sales, products }: { stats: ReturnType<typeof Object>; sales: Sale[]; products: Product[] }) {
  const recent = sales.slice(0, 8);
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <KpiCard label="Today's Revenue" value={fmtBDT(stats.todayRevenue)} sub={`${stats.change.toFixed(1)}%`} trend={stats.change >= 0 ? "up" : "down"} icon={<DollarSign />} accent="gold" />
        <KpiCard label="Units Sold Today" value={String(stats.todayUnits)} sub={`${stats.unitsChange.toFixed(1)}%`} trend={stats.unitsChange >= 0 ? "up" : "down"} icon={<ShoppingBag />} accent="success" />
        <KpiCard label="Total Products" value={String(products.length)} sub="in stock" icon={<Package />} accent="info" />
        <KpiCard label="Low Stock Alerts" value={String(stats.lowStock)} sub="items need restocking" icon={<AlertTriangle />} accent="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <ChartCard title="Weekly Sales (BDT Thousands)">
          <BarChart data={stats.weekly} formatVal={(n) => `${n}k`} />
        </ChartCard>
        <ChartCard title="Category Revenue Split">
          {stats.catSlices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No sales yet</div>
          ) : (
            <Donut slices={stats.catSlices} />
          )}
        </ChartCard>
      </div>

      <SectionHeader title="Recent Transactions" sub="Latest sales activity" />
      <div className="bg-card border border-border rounded-[4px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-white/[0.02]">
              {["Product", "Category", "Qty", "Amount", "Time"].map((h) => (
                <th key={h} className="text-left px-5 py-3.5 text-[0.68rem] tracking-luxe uppercase text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">No transactions yet</td></tr>
            ) : recent.map((s) => {
              const p = products.find((p) => p.id === s.product_id);
              return (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 text-sm font-medium">{p?.name ?? "—"}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{p?.category ?? "—"}</td>
                  <td className="px-5 py-3.5 text-sm font-mono">{s.quantity}</td>
                  <td className="px-5 py-3.5 text-sm font-mono text-gold">{fmtBDT(Number(s.total))}</td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">{new Date(s.sale_date).toLocaleString("en", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProductsSection({
  products, categories, catFilter, setCatFilter, search, setSearch, userId, onAdded, onDelete, onSell, soldMap,
}: {
  products: Product[]; categories: string[]; catFilter: string; setCatFilter: (s: string) => void;
  search: string; setSearch: (s: string) => void; userId: string; onAdded: () => void;
  onDelete: (id: string) => void; onSell: (p: Product) => void; soldMap: Map<string, number>;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="flex-1 min-w-[200px] bg-card border-border" />
        {categories.map((c) => (
          <button key={c} onClick={() => setCatFilter(c)} className={`px-4 py-2.5 border rounded-sm text-[0.82rem] transition ${catFilter === c ? "border-gold text-gold" : "border-border text-muted-foreground hover:text-foreground"}`}>{c}</button>
        ))}
        <AddProductDialog onAdded={onAdded} userId={userId} />
      </div>
      {products.length === 0 ? (
        <Empty icon="👗" text="No products match your filters." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((p) => <ProductCard key={p.id} product={p} onDelete={onDelete} onSell={onSell} soldCount={soldMap.get(p.id)} />)}
        </div>
      )}
    </>
  );
}

function DiscountedSection({ products, onDelete, onSell, soldMap }:
  { products: Product[]; onDelete: (id: string) => void; onSell: (p: Product) => void; soldMap: Map<string, number> }) {
  return (
    <>
      <SectionHeader title="🏷️ Discounted Products" sub={`${products.length} items currently on sale`} />
      {products.length === 0 ? (
        <Empty icon="🏷️" text="No discounts active right now." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((p) => <ProductCard key={p.id} product={p} onDelete={onDelete} onSell={onSell} soldCount={soldMap.get(p.id)} />)}
        </div>
      )}
    </>
  );
}

function TrendingSection({ items }: { items: { p: Product; sold: number; rev: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.sold));
  return (
    <>
      <SectionHeader title="🔥 Trending & High-Demand Products" sub="Ranked by units sold" />
      {items.length === 0 ? (
        <Empty icon="🔥" text="Record sales or feature products to populate this list." />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((it, i) => (
            <div key={it.p.id} className="bg-card border border-border rounded-[4px] px-5 py-4 flex items-center gap-4 hover:border-gold transition">
              <div className={`font-display text-2xl font-black w-9 text-center shrink-0 ${i < 3 ? "text-gold" : "text-gold/25"}`}>#{i + 1}</div>
              <div className="w-12 h-12 rounded-sm bg-[#1e1e1e] overflow-hidden shrink-0 flex items-center justify-center text-xl">
                {it.p.image_url ? <img src={it.p.image_url} alt={it.p.name} className="w-full h-full object-cover" /> : "👗"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{it.p.name}</div>
                <div className="text-[0.72rem] text-muted-foreground">{it.p.category ?? "—"}</div>
              </div>
              <div className="w-28 hidden md:block">
                <div className="bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-gradient-bar rounded-full transition-all" style={{ width: `${(it.sold / max) * 100}%` }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-sm text-gold">{it.sold} units</div>
                <div className="text-[0.72rem] text-muted-foreground">{fmtBDT(it.rev)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function DailySection({ stats, sales, products }: { stats: ReturnType<typeof Object>; sales: Sale[]; products: Product[] }) {
  const catRows = useMemo(() => {
    const map = new Map<string, { units: number; revenue: number }>();
    sales.forEach((s) => {
      const p = products.find((p) => p.id === s.product_id);
      const cat = p?.category ?? "Other";
      const cur = map.get(cat) ?? { units: 0, revenue: 0 };
      cur.units += s.quantity; cur.revenue += Number(s.total);
      map.set(cat, cur);
    });
    const total = Array.from(map.values()).reduce((a, v) => a + v.revenue, 0) || 1;
    return Array.from(map.entries()).map(([cat, v]) => ({ cat, ...v, share: (v.revenue / total) * 100 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [sales, products]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <KpiCard label="Daily Sale %" value={`${stats.change.toFixed(1)}%`} sub="vs yesterday" trend={stats.change >= 0 ? "up" : "down"} icon={<TrendingUp />} accent="gold" />
        <KpiCard label="Total Sales" value={String(sales.length)} sub="all-time orders" icon={<CheckCircle2 />} accent="success" />
        <KpiCard label="Avg Order Value" value={fmtBDT(stats.avgOrder)} sub="per transaction" icon={<DollarSign />} accent="info" />
      </div>

      <ChartCard title="Hourly Sales Today (BDT)">
        <BarChart data={stats.hourly} formatVal={(n) => fmtBDTk(n)} />
      </ChartCard>

      <div className="mt-8">
        <SectionHeader title="Category Performance" />
        <div className="bg-card border border-border rounded-[4px] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-white/[0.02]">
                {["Category", "Units Sold", "Revenue", "Share"].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-[0.68rem] tracking-luxe uppercase text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catRows.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-muted-foreground text-sm">No category data yet</td></tr>
              ) : catRows.map((r) => (
                <tr key={r.cat} className="border-b border-border last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 text-sm font-medium">{r.cat}</td>
                  <td className="px-5 py-3.5 text-sm font-mono">{r.units}</td>
                  <td className="px-5 py-3.5 text-sm font-mono text-gold">{fmtBDT(r.revenue)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/[0.06] rounded-full h-1.5 w-24 overflow-hidden">
                        <div className="h-full bg-gradient-bar" style={{ width: `${r.share}%` }} />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{r.share.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function StockSection({ stats, products }: { stats: ReturnType<typeof Object>; products: Product[] }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <KpiCard label="In Stock" value={String(stats.inStock)} icon={<CheckCircle2 />} accent="success" />
        <KpiCard label="Low Stock" value={String(stats.lowStock)} icon={<Zap />} accent="gold" />
        <KpiCard label="Out of Stock" value={String(stats.outOfStock)} icon={<XCircle />} accent="danger" />
        <KpiCard label="Total SKUs" value={String(products.length)} icon={<Boxes />} accent="info" />
      </div>

      <SectionHeader title="Stock Status by Product" />
      <div className="bg-card border border-border rounded-[4px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-white/[0.02]">
              {["Product", "Category", "Sizes", "Stock", "Status", "Price"].map((h) => (
                <th key={h} className="text-left px-5 py-3.5 text-[0.68rem] tracking-luxe uppercase text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No products in inventory</td></tr>
            ) : products.map((p) => {
              const status = p.stock === 0 ? { l: "Out", c: "text-destructive" } : p.stock < 5 ? { l: "Low", c: "text-gold" } : { l: "OK", c: "text-success" };
              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 text-sm font-medium">{p.name}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{p.category ?? "—"}</td>
                  <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">{p.size}</td>
                  <td className="px-5 py-3.5 text-sm font-mono">{p.stock}</td>
                  <td className={`px-5 py-3.5 text-sm font-semibold ${status.c}`}>{status.l}</td>
                  <td className="px-5 py-3.5 text-sm font-mono text-gold">{fmtBDT(Number(p.price))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-[4px]">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
