import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Ticket } from "lucide-react";
import { format } from "date-fns";

interface RewardRow {
  id: string;
  tier: string;
  discount_value: number;
  discount_type: string;
  coupon_code: string | null;
  sent: boolean;
  scratched: boolean;
  created_at: string;
  order_id: string;
  orders: { order_code: string; phone: string } | null;
}

export default function CouponsSent() {
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scratch_rewards")
      .select("id, tier, discount_value, discount_type, coupon_code, sent, scratched, created_at, order_id, orders(order_code, phone)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error && data) setRewards(data as unknown as RewardRow[]);
    setLoading(false);
  };

  const tierColor = (tier: string) => {
    if (tier === "gold") return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
    if (tier === "silver") return "bg-gray-300/30 text-gray-600 border-gray-400/30";
    if (tier === "bronze") return "bg-orange-400/20 text-orange-700 border-orange-400/30";
    return "bg-muted text-muted-foreground";
  };

  const filtered = rewards.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.coupon_code?.toLowerCase().includes(q) ||
      r.orders?.phone?.includes(q) ||
      r.orders?.order_code?.toLowerCase().includes(q) ||
      r.tier.includes(q)
    );
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Ticket className="w-4 h-4" /> All Scratch Card Rewards
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone, order code, or coupon..."
            className="pl-8 text-xs h-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No rewards found.</p>
        ) : (
          <div className="overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Order</TableHead>
                  <TableHead className="text-xs">Phone</TableHead>
                  <TableHead className="text-xs">Tier</TableHead>
                  <TableHead className="text-xs">Coupon</TableHead>
                  <TableHead className="text-xs">Discount</TableHead>
                  <TableHead className="text-xs">Sent</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs font-mono">{r.orders?.order_code || "—"}</TableCell>
                    <TableCell className="text-xs">{r.orders?.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] capitalize ${tierColor(r.tier)}`}>
                        {r.tier === "none" ? "Try Again" : r.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{r.coupon_code || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {r.tier === "none" ? "—" : `${r.discount_value}%`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.sent ? "default" : "secondary"} className="text-[10px]">
                        {r.sent ? "Sent" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd MMM, HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
