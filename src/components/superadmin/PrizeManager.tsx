import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2, Gift, Trophy } from "lucide-react";
import { toast } from "sonner";

interface Prize {
  id: string;
  tier: string;
  label: string;
  discount_type: string;
  discount_value: number;
  max_quantity: number;
  used_count: number;
  sort_order: number;
  is_active: boolean;
}

const TIER_OPTIONS = ["gold", "silver", "bronze"] as const;

const tierStyle = (tier: string) => {
  if (tier === "gold") return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
  if (tier === "silver") return "bg-gray-300/30 text-gray-600 border-gray-400/30";
  if (tier === "bronze") return "bg-orange-400/20 text-orange-700 border-orange-400/30";
  return "";
};

export default function PrizeManager() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New prize form
  const [newTier, setNewTier] = useState<string>("gold");
  const [newLabel, setNewLabel] = useState("");
  const [newDiscountType, setNewDiscountType] = useState("percentage");
  const [newDiscountValue, setNewDiscountValue] = useState("");
  const [newMaxQty, setNewMaxQty] = useState("");

  useEffect(() => {
    fetchPrizes();
  }, []);

  const fetchPrizes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scratch_prizes")
      .select("*")
      .order("tier")
      .order("sort_order");
    if (!error && data) setPrizes(data as Prize[]);
    setLoading(false);
  };

  const addPrize = async () => {
    if (!newLabel.trim() || !newDiscountValue) {
      toast.error("Fill in label and discount value");
      return;
    }
    setSaving(true);
    const nextSort = prizes.filter((p) => p.tier === newTier).length;
    const { error } = await supabase.from("scratch_prizes").insert({
      tier: newTier,
      label: newLabel.trim(),
      discount_type: newDiscountType,
      discount_value: parseFloat(newDiscountValue),
      max_quantity: parseInt(newMaxQty) || 0,
      sort_order: nextSort,
      is_active: true,
    });
    if (error) {
      toast.error("Failed to add prize");
    } else {
      toast.success("Prize added");
      setNewLabel("");
      setNewDiscountValue("");
      setNewMaxQty("");
      await fetchPrizes();
    }
    setSaving(false);
  };

  const deletePrize = async (id: string) => {
    const { error } = await supabase.from("scratch_prizes").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      setPrizes((prev) => prev.filter((p) => p.id !== id));
      toast.success("Prize removed");
    }
  };

  const toggleActive = async (prize: Prize) => {
    const { error } = await supabase
      .from("scratch_prizes")
      .update({ is_active: !prize.is_active })
      .eq("id", prize.id);
    if (!error) {
      setPrizes((prev) =>
        prev.map((p) => (p.id === prize.id ? { ...p, is_active: !p.is_active } : p))
      );
    }
  };

  const grouped = TIER_OPTIONS.map((tier) => ({
    tier,
    items: prizes.filter((p) => p.tier === tier),
  }));

  return (
    <div className="space-y-4">
      {/* Add Prize Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add New Prize
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tier</Label>
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">🥇 Gold</SelectItem>
                  <SelectItem value="silver">🥈 Silver</SelectItem>
                  <SelectItem value="bronze">🥉 Bronze</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Label</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. 30% Off Next Order"
                className="h-9 text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={newDiscountType} onValueChange={setNewDiscountType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed (Rs.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Discount Value</Label>
              <Input
                type="number"
                value={newDiscountValue}
                onChange={(e) => setNewDiscountValue(e.target.value)}
                placeholder="30"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Max Qty (0 = ∞)</Label>
              <Input
                type="number"
                value={newMaxQty}
                onChange={(e) => setNewMaxQty(e.target.value)}
                placeholder="10"
                className="h-9 text-xs"
              />
            </div>
          </div>
          <Button onClick={addPrize} disabled={saving} size="sm" className="w-full">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
            Add Prize
          </Button>
        </CardContent>
      </Card>

      {/* Prizes by Tier */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        grouped.map(({ tier, items }) => (
          <Card key={tier}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 capitalize">
                <Trophy className="w-4 h-4" />
                {tier === "gold" ? "🥇" : tier === "silver" ? "🥈" : "🥉"} {tier} Prizes
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {items.length} prize{items.length !== 1 ? "s" : ""}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No prizes configured for {tier}.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Label</TableHead>
                      <TableHead className="text-xs">Discount</TableHead>
                      <TableHead className="text-xs">Stock</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((prize, idx) => (
                      <TableRow key={prize.id}>
                        <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="text-xs font-medium">{prize.label}</TableCell>
                        <TableCell className="text-xs">
                          {prize.discount_type === "percentage"
                            ? `${prize.discount_value}%`
                            : `Rs.${prize.discount_value}`}
                        </TableCell>
                        <TableCell className="text-xs">
                          {prize.max_quantity === 0
                            ? "∞"
                            : `${prize.used_count}/${prize.max_quantity}`}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] cursor-pointer ${
                              prize.is_active
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-muted text-muted-foreground"
                            }`}
                            onClick={() => toggleActive(prize)}
                          >
                            {prize.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => deletePrize(prize.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <Card>
        <CardContent className="pt-4">
          <p className="text-[10px] text-muted-foreground">
            <Gift className="w-3 h-3 inline mr-1" />
            Prizes are assigned <strong>sequentially</strong> by sort order within each tier. When a prize reaches its max quantity, the next prize in line is used. If all prizes for a tier are exhausted, the customer gets "Try Again".
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
