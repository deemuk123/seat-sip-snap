import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  show_id: string | null;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
}

export default function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: 10,
    max_uses: "",
    expires_at: "",
  });

  const loadCoupons = useCallback(async () => {
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    setCoupons((data || []) as Coupon[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const handleCreate = async () => {
    if (!form.code.trim()) return;
    try {
      const { error } = await supabase.from("coupons").insert({
        code: form.code.toUpperCase().trim(),
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expires_at: form.expires_at || null,
      });
      if (error) throw error;
      toast.success("Coupon created");
      setForm({ code: "", discount_type: "percentage", discount_value: 10, max_uses: "", expires_at: "" });
      setShowForm(false);
      loadCoupons();
    } catch {
      toast.error("Failed to create coupon");
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("coupons").update({ is_active: active }).eq("id", id);
    loadCoupons();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    toast.success("Coupon deleted");
    loadCoupons();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag className="w-4 h-4" /> Coupons
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="rounded-lg bg-secondary p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="SAVE20"
                />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, discount_type: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Value</Label>
                <Input
                  type="number"
                  value={form.discount_value}
                  onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label className="text-xs">Max Uses</Label>
                <Input
                  type="number"
                  value={form.max_uses}
                  onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                  placeholder="∞"
                />
              </div>
              <div>
                <Label className="text-xs">Expires</Label>
                <Input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                />
              </div>
            </div>
            <Button size="sm" onClick={handleCreate} className="w-full">
              Create Coupon
            </Button>
          </div>
        )}

        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
        ) : coupons.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No coupons yet</p>
        ) : (
          coupons.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg bg-card border border-border p-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary font-mono">
                    {c.code}
                  </span>
                  <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px]">
                    {c.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.discount_type === "percentage"
                    ? `${c.discount_value}% off`
                    : `₹${c.discount_value} off`}{" "}
                  · Used {c.used_count}
                  {c.max_uses ? `/${c.max_uses}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={c.is_active}
                  onCheckedChange={(v) => toggleActive(c.id, v)}
                />
                <button onClick={() => deleteCoupon(c.id)} className="p-1 text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
