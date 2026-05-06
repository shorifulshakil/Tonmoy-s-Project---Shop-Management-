import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Trash2, Flame } from "lucide-react";
import { fmtBDT } from "@/lib/currency";

type Product = Tables<"products">;

export function ProductCard({
  product, onDelete, onSell, soldCount,
}: { product: Product; onDelete: (id: string) => void; onSell: (p: Product) => void; soldCount?: number }) {
  const finalPrice = product.discount_percent > 0
    ? Number(product.price) * (1 - product.discount_percent / 100)
    : Number(product.price);
  const stockColor = product.stock === 0 ? "bg-destructive" : product.stock < 5 ? "bg-gold" : "bg-success";
  const stockLabel = product.stock === 0 ? "Out of stock" : product.stock < 5 ? `Low stock · ${product.stock}` : `${product.stock} in stock`;

  return (
    <div className="bg-card border border-border rounded-[4px] overflow-hidden group hover:border-gold hover:-translate-y-1 transition-all shadow-card relative">
      <div className="aspect-[4/5] relative overflow-hidden bg-[#1e1e1e]">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/10 text-6xl">👗</div>
        )}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {product.discount_percent > 0 && (
            <span className="bg-destructive text-white px-2.5 py-1 rounded-sm text-[0.65rem] font-bold tracking-wider uppercase">−{product.discount_percent}%</span>
          )}
          {product.is_featured && (
            <span className="bg-gold text-primary-foreground px-2.5 py-1 rounded-sm text-[0.65rem] font-bold tracking-wider uppercase flex items-center gap-1">
              <Flame className="w-3 h-3" />Hot
            </span>
          )}
        </div>
      </div>
      <div className="p-4 space-y-2.5">
        <div>
          <h3 className="font-semibold text-[0.95rem] leading-tight">{product.name}</h3>
          <p className="text-[0.72rem] text-muted-foreground tracking-luxe uppercase mt-0.5">{product.category ?? "Uncategorized"}</p>
        </div>
        <div className="flex items-baseline gap-2">
          {product.discount_percent > 0 && (
            <span className="font-mono text-xs text-muted-foreground line-through">{fmtBDT(Number(product.price))}</span>
          )}
          <span className="font-mono text-base text-gold font-bold">{fmtBDT(finalPrice)}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {product.size.split(",").map((s) => (
            <span key={s} className="text-[0.65rem] font-mono px-1.5 py-0.5 border border-gold/30 text-gold rounded-sm">{s.trim()}</span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground">
          <span className={`w-1.5 h-1.5 rounded-full ${stockColor}`} />
          {stockLabel}
          {soldCount && soldCount > 0 ? <span className="ml-auto text-gold font-mono">{soldCount} sold</span> : null}
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => onSell(product)} disabled={product.stock === 0} className="flex-1 bg-gold text-primary-foreground hover:opacity-90 rounded-sm font-semibold">
            Record sale
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(product.id)} className="border-border hover:border-destructive hover:text-destructive rounded-sm">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
