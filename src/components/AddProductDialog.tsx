import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const CATEGORIES = ["Shirt", "Pants", "Dress", "Jacket", "Accessory"];

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(60),
  size: z.string().trim().min(1).max(60),
  price: z.number().min(0).max(10_000_000),
  discount_percent: z.number().min(0).max(100),
  stock: z.number().int().min(0).max(100000),
  image_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional(),
  is_featured: z.boolean(),
});

export function AddProductDialog({
  onAdded,
  userId,
}: {
  onAdded: () => void;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sizes, setSizes] = useState<string[]>(["M"]);
  const [form, setForm] = useState({
    name: "",
    category: "Shirt",
    price: "",
    discount_percent: "0",
    stock: "0",
    image_url: "",
    description: "",
    is_featured: false,
  });

  const toggleSize = (s: string) =>
    setSizes((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      ...form,
      size: sizes.join(", "),
      price: Number(form.price),
      discount_percent: Number(form.discount_percent),
      stock: Number(form.stock),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("products").insert({
      ...parsed.data,
      image_url: parsed.data.image_url || null,
      created_by: userId,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Product added");
    setForm({
      name: "",
      category: "Shirt",
      price: "",
      discount_percent: "0",
      stock: "0",
      image_url: "",
      description: "",
      is_featured: false,
    });
    setSizes(["M"]);
    setOpen(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gold text-primary-foreground hover:opacity-90 rounded-sm font-bold tracking-wide">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Add New Product
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <select
                className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Price (BDT) *</Label>
              <Input
                type="number"
                step="1"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Discount %</Label>
              <Input
                type="number"
                value={form.discount_percent}
                onChange={(e) =>
                  setForm({ ...form, discount_percent: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Stock Quantity</Label>
            <Input
              type="number"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Product Image URL (optional)</Label>
            <Input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label>Available Sizes</Label>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggleSize(s)}
                  className={`px-3 py-1.5 border rounded-sm text-xs font-mono transition ${sizes.includes(s) ? "border-gold text-gold bg-gold/10" : "border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between rounded-sm border border-border p-3">
            <Label>Mark as Featured (Hot 🔥)</Label>
            <Switch
              checked={form.is_featured}
              onCheckedChange={(v) => setForm({ ...form, is_featured: v })}
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-primary-foreground hover:opacity-90 rounded-sm font-bold"
          >
            {loading ? "Saving…" : "Save Product"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
