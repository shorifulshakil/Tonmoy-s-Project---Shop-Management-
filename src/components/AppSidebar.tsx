import {
  LayoutDashboard,
  Shirt,
  Tag,
  Flame,
  TrendingUp,
  Boxes,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type SectionKey =
  | "dashboard"
  | "products"
  | "discounted"
  | "trending"
  | "daily"
  | "stock";

const main: {
  key: SectionKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "products", label: "Products", icon: Shirt },
  { key: "discounted", label: "Discounted", icon: Tag },
  { key: "trending", label: "Trending", icon: Flame },
];
const reports: typeof main = [
  { key: "daily", label: "Daily Sales", icon: TrendingUp },
  { key: "stock", label: "Stock Overview", icon: Boxes },
];

export function AppSidebar({
  active,
  onChange,
  email,
  onSignOut,
}: {
  active: SectionKey;
  onChange: (k: SectionKey) => void;
  email: string;
  onSignOut: () => void;
}) {
  const initial = (email[0] || "A").toUpperCase();
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-card border-r border-border z-40 flex flex-col">
      <div className="px-6 pt-7 pb-5 border-b border-border relative">
        <div className="absolute top-0 left-0 right-0 h-[6px] zebra-stripes" />
        <div className="font-display text-2xl font-black tracking-tight">
          ZEBRA <span className="text-gold">OUTFIT</span>
        </div>
        <div className="text-[0.65rem] text-muted-foreground tracking-luxe uppercase mt-1">
          Management Console
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <SectionLabel>Main</SectionLabel>
        {main.map((it) => (
          <NavItem
            key={it.key}
            label={it.label}
            icon={it.icon}
            active={active === it.key}
            onClick={() => onChange(it.key)}
          />
        ))}
        <SectionLabel className="mt-3">Reports</SectionLabel>
        {reports.map((it) => (
          <NavItem
            key={it.key}
            label={it.label}
            icon={it.icon}
            active={active === it.key}
            onClick={() => onChange(it.key)}
          />
        ))}
      </nav>

      <div className="px-5 py-5 border-t border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gold text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">
            {email.split("@")[0] || "Admin"}
          </div>
          <div className="text-[0.7rem] text-muted-foreground">
            Store Manager
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSignOut}
          className="text-muted-foreground hover:text-destructive"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </aside>
  );
}

function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-6 pt-2 pb-1.5 text-[0.62rem] tracking-luxe uppercase text-foreground/20 ${className}`}
    >
      {children}
    </div>
  );
}

function NavItem({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium border-l-[3px] transition-colors ${
        active
          ? "text-gold border-gold bg-gold/[0.08]"
          : "text-muted-foreground border-transparent hover:text-foreground hover:bg-gold/[0.06]"
      }`}
    >
      <Icon className="w-[18px] h-[18px]" />
      <span>{label}</span>
    </button>
  );
}
