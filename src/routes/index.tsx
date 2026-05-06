import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Lock, BarChart3, Package, Tag } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Zebra Outfit — Sales & Stock Management" },
      { name: "description", content: "Secure sales and inventory dashboard for Zebra Outfit clothing brand." },
    ],
  }),
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-3xl w-full text-center">
        <div className="inline-block w-32 h-1.5 zebra-stripes mb-8 rounded-sm" />
        <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight leading-[1.05]">
          ZEBRA <span className="text-gold">OUTFIT</span>
        </h1>
        <p className="text-muted-foreground text-xs md:text-sm tracking-luxe uppercase mt-3">
          Sales &amp; Stock Management System
        </p>
        <p className="mt-8 text-muted-foreground max-w-xl mx-auto leading-relaxed">
          A private command center for the Zebra Outfit team — inventory,
          daily sales, discounts, and demand insights in one secure place.
        </p>
        <div className="mt-10 flex gap-3 justify-center flex-wrap">
          <Link to="/auth"><Button size="lg" className="bg-gold text-primary-foreground hover:opacity-90 px-8 rounded-sm font-bold tracking-luxe uppercase"><Lock className="w-4 h-4 mr-2" />Secure Login</Button></Link>
          <Link to="/auth" search={{ mode: "signup" }}><Button size="lg" variant="outline" className="border-gold/40 text-gold hover:bg-gold/10 rounded-sm font-bold tracking-luxe uppercase">Create Account</Button></Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
          {[
            { icon: <BarChart3 className="w-5 h-5" />, title: "Live Analytics", text: "Daily sale %, weekly trends, category splits — at a glance." },
            { icon: <Package className="w-5 h-5" />, title: "Stock Control", text: "Track sizes, low-stock alerts, and full SKU history." },
            { icon: <Tag className="w-5 h-5" />, title: "Discounts & Demand", text: "Surface trending products and active discounts instantly." },
          ].map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-[4px] p-5 hover:border-gold transition">
              <div className="text-gold mb-2">{f.icon}</div>
              <div className="font-display text-lg font-bold">{f.title}</div>
              <p className="text-xs text-muted-foreground mt-1">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
