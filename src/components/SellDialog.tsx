import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fmtBDT } from "@/lib/currency";

type Product = Tables<"products">;

export function SellDialog({
  product,
  onClose,
  onSold,
  userId,
}: {
  product: Product | null;
  onClose: () => void;
  onSold: () => void;
  userId: string;
}) {
  const [qty, setQty] = useState("1");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setQty("1");
  }, [product]);

  if (!product) return null;
  const unitPrice =
    product.discount_percent > 0
      ? Number(product.price) * (1 - product.discount_percent / 100)
      : Number(product.price);
  const quantity = Math.max(1, parseInt(qty) || 1);
  const total = unitPrice * quantity;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity > product.stock) {
      toast.error("Not enough stock");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("sales").insert({
      product_id: product.id,
      quantity,
      unit_price: unitPrice,
      total,
      recorded_by: userId,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Sale recorded: ${fmtBDT(total)}`);
    onSold();
    onClose();
  };

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record sale — {product.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Unit price: <span className="text-gold">{fmtBDT(unitPrice)}</span> ·
            Available: {product.stock}
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              max={product.stock}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
            />
          </div>
          <div className="text-2xl">
            Total: <span className="text-gold">{fmtBDT(total)}</span>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-primary-foreground hover:opacity-90"
          >
            {loading ? "Recording…" : "Confirm sale"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
