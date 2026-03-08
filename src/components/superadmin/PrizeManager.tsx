import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchSetting, upsertSetting } from "@/lib/supabase-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Loader2, Gift, Trophy, Dices, ListOrdered, Power } from "lucide-react";
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
  selection_mode: string;
  probability_weight: number;
}

const TIER_OPTIONS = ["gold", "silver", "bronze"] as const;

export default function PrizeManager() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  // New prize form
  const [newTier, setNewTier] = useState<string>("gold");
  const [newLabel, setNewLabel] = useState("");
  const [newDiscountType, setNewDiscountType] = useState("percentage");
  const [newDiscountValue, setNewDiscountValue] = useState("");
  const [newMaxQty, setNewMaxQty] = useState("");
  const [newWeight, setNewWeight] = useState("10");

  useEffect(() => {
    fetchPrizes();
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const val = await fetchSetting("scratch_card_config");
      setIsEnabled(val?.enabled ?? false);
    } catch {}
  };

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

  const toggleEnabled = async (v: boolean) => {
    const current = await fetchSetting("scratch_card_config");
    await upsertSetting("scratch_card_config", { ...(current || {}), enabled: v });
    setIsEnabled(v);
    toast.success(v ? "Scratch cards enabled" : "Scratch cards disabled");
  };

  const addPrize = async () => {
    if (!newLabel.trim() || !newDiscountValue) {
      toast.error("Fill in label and discount value");
      return;
    }
    if (!newWeight || parseFloat(newWeight) <= 0) {
      toast.error("Set a probability weight > 0");
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
      selection_mode: "probability",
      probability_weight: parseFloat(newWeight) || 10,
    });
    if (error) {
      toast.error("Failed to add prize");
    } else {
      toast.success("Prize added");
      setNewLabel("");
      setNewDiscountValue("");
      setNewMaxQty("");
      setNewWeight("10");
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

  // Auto-calculate tier probabilities from prize weights
  const activePrizes = prizes.filter((p) => p.is_active && (p.max_quantity === 0 || p.used_count < p.max_quantity));
  const totalWeight = activePrizes.reduce((s, p) => s + (p.probability_weight || 1), 0);

  const tierProbs = TIER_OPTIONS.map((tier) => {
    const tierWeight = activePrizes
      .filter((p) => p.tier === tier)
      .reduce((s, p) => s + (p.probability_weight || 1), 0);
    return {
      tier,
      weight: tierWeight,
      pct: totalWeight > 0 ? Math.round((tierWeight / totalWeight) * 100) : 0,
    };
  });

  const tryAgainPct = totalWeight > 0 ? Math.max(0, 100 - tierProbs.reduce((s, t) => s + t.pct, 0)) : 100;

  const grouped = TIER_OPTIONS.map((tier) => ({
    tier,
    items: prizes.filter((p) => p.tier === tier),
  }));

  return (
    <div className="space-y-4">
      {/* Enable/Disable + Auto-calculated Probabilities */}
      <Card className={`border-2 ${isEnabled ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isEnabled ? "bg-primary/20" : "bg-destructive/20"}`}>
                <Power className={`w-5 h-5 ${isEnabled ? "text-primary" : "text-destructive"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Scratch Card System</p>
                <p className="text-[10px] text-muted-foreground">
                  Only Super Admin can enable or disable
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${isEnabled ? "text-primary" : "text-destructive"}`}>
                {isEnabled ? "ON" : "OFF"}
              </span>
              <Switch checked={isEnabled} onCheckedChange={toggleEnabled} />
            </div>
          </div>

          {isEnabled && (
            <>
              <p className="text-[10px] text-muted-foreground mb-2">
                Probabilities auto-calculated from active prize weights below:
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "🥇 Gold", value: tierProbs[0].pct, color: "bg-yellow-500/20 text-yellow-700" },
                  { label: "🥈 Silver", value: tierProbs[1].pct, color: "bg-gray-300/30 text-gray-600" },
                  { label: "🥉 Bronze", value: tierProbs[2].pct, color: "bg-orange-400/20 text-orange-700" },
                  { label: "🔄 Try Again", value: activePrizes.length === 0 ? 100 : tryAgainPct, color: "bg-muted text-muted-foreground" },
                ].map((t) => (
                  <div key={t.label} className={`rounded-md px-2 py-1.5 text-center ${t.color}`}>
                    <p className="text-[10px]">{t.label}</p>
                    <p className="text-sm font-bold">{t.value}%</p>
                  </div>
                ))}
              </div>
              {activePrizes.length === 0 && (
                <p className="text-[10px] text-destructive mt-2 font-medium">
                  ⚠️ No active prizes with stock — all customers will get "Try Again"
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
              <Label className="text-xs">Discount Type</Label>
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
          <div>
            <Label className="text-xs">Probability Weight (higher = more likely to be picked)</Label>
            <Input
              type="number"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder="10"
              className="h-9 text-xs"
            />
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
        grouped.map(({ tier, items }) => {
          const tierTotalWeight = items.filter(p => p.is_active).reduce((s, p) => s + (p.probability_weight || 1), 0);

          return (
            <Card key={tier}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 capitalize">
                  <Trophy className="w-4 h-4" />
                  {tier === "gold" ? "🥇" : tier === "silver" ? "🥈" : "🥉"} {tier} Prizes
                  <Badge variant="secondary" className="text-[10px] ml-auto">
                    {items.length} prize{items.length !== 1 ? "s" : ""} · {tierProbs.find(t => t.tier === tier)?.pct || 0}% chance
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
                        <TableHead className="text-xs">Weight</TableHead>
                        <TableHead className="text-xs">Chance</TableHead>
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
                          <TableCell className="text-xs font-mono">{prize.probability_weight}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {totalWeight > 0 ? `${Math.round((prize.probability_weight / totalWeight) * 100)}%` : "0%"}
                            </Badge>
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
                              {prize.is_active ? "Active" : "Off"}
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
          );
        })
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-1.5 text-[10px] text-muted-foreground">
            <p><Dices className="w-3 h-3 inline mr-1" /><strong>How it works:</strong> Each prize has a weight. The system randomly picks one prize from ALL active prizes based on weight. The tier (Gold/Silver/Bronze) is determined by whichever prize is selected.</p>
            <p><Gift className="w-3 h-3 inline mr-1" />If all prizes are out of stock, the customer gets "Try Again".</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
