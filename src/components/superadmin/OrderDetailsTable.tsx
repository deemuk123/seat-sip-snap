import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderRow {
  id: string;
  order_code: string;
  phone: string;
  status: string;
  total: number;
  delivery_mode: string;
  seat_number: string | null;
  created_at: string;
  updated_at: string;
  show_snapshot: any;
}

const statusColors: Record<string, string> = {
  received: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  preparing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "out-for-delivery": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  delivered: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function OrderDetailsTable() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_code, phone, status, total, delivery_mode, seat_number, created_at, updated_at, show_snapshot")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error && data) setOrders(data as OrderRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter((o) =>
    o.order_code.toLowerCase().includes(search.toLowerCase()) ||
    o.phone.includes(search) ||
    o.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, phone, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-auto max-h-[70vh]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Order Code</TableHead>
              <TableHead className="text-xs">Order ID</TableHead>
              <TableHead className="text-xs">Phone</TableHead>
              <TableHead className="text-xs">Movie</TableHead>
              <TableHead className="text-xs">Mode</TableHead>
              <TableHead className="text-xs">Total</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">TAT</TableHead>
              <TableHead className="text-xs">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {loading ? "Loading…" : "No orders found"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => {
                const snapshot = o.show_snapshot as any;
                const movieName = snapshot?.movieName || snapshot?.movie_name || "—";
                const isPending = o.status !== "delivered" && o.status !== "cancelled";
                const tatMins = o.status === "delivered"
                  ? Math.floor((new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 60000)
                  : null;
                const pendingMins = isPending
                  ? Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000)
                  : null;
                return (
                  <TableRow key={o.id} className={isPending ? "bg-amber-500/5" : ""}>
                    <TableCell className="font-mono font-bold text-primary">{o.order_code}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}…</TableCell>
                    <TableCell>{o.phone}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">{movieName}</TableCell>
                    <TableCell className="capitalize text-xs">{o.delivery_mode}{o.seat_number ? ` (${o.seat_number})` : ""}</TableCell>
                    <TableCell className="font-medium">₹{o.total}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[o.status] || ""}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium whitespace-nowrap">
                      {tatMins !== null ? (
                        <span className={tatMins > 15 ? "text-destructive" : "text-emerald-400"}>{tatMins}m</span>
                      ) : pendingMins !== null ? (
                        <span className={pendingMins >= 10 ? "text-destructive animate-pulse" : "text-amber-400"}>⏳ {pendingMins}m</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(o.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground text-right">Showing {filtered.length} of {orders.length} orders</p>
    </div>
  );
}
