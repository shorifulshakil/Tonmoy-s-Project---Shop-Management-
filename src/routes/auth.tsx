import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(72),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ mode: (s.mode as string) === "signup" ? "signup" : "login" }),
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — Zebra Outfit" }] }),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-card border border-border rounded-[4px] p-12 w-[420px] max-w-[95vw] relative shadow-luxe">
        <div className="absolute top-0 left-0 right-0 h-[6px] zebra-stripes rounded-t-[4px]" />
        <h1 className="font-display text-[2.4rem] font-black text-center tracking-tight">
          ZEBRA <span className="text-gold">OUTFIT</span>
        </h1>
        <p className="text-center text-muted-foreground text-xs tracking-luxe uppercase mt-1 mb-10">
          Management System — Secure Access
        </p>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[0.72rem] tracking-luxe uppercase text-muted-foreground">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[0.72rem] tracking-luxe uppercase text-muted-foreground">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={isSignup ? "new-password" : "current-password"} />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gold text-primary-foreground hover:opacity-90 rounded-sm font-bold tracking-luxe uppercase py-3.5">
            <Lock className="w-4 h-4 mr-2" />
            {loading ? "Please wait…" : isSignup ? "Create Account" : "Secure Login"}
          </Button>
        </form>
        <button type="button" onClick={() => setIsSignup((v) => !v)} className="mt-6 text-xs text-muted-foreground hover:text-gold w-full text-center">
          {isSignup ? "Already have an account? Sign in" : "Need an account? Create one"}
        </button>
        <p className="text-center text-[0.72rem] text-muted-foreground mt-5">
          Demo: <span className="text-gold">demo@zebraoutfit.com</span> / <span className="text-gold">ZebraDemo2026!</span>
        </p>
        <Link to="/" className="block text-center text-[0.7rem] text-muted-foreground hover:text-gold mt-3 tracking-luxe uppercase">← Back</Link>
      </div>
    </main>
  );
}
