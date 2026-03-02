import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface SLAOrder {
  id: string;
  order_code: string;
  status: string;
  created_at: string;
  sla_target_mins: number;
  fulfilled_at: string | null;
}

export default function SLATracker() {
  const [orders, setOrders] = useState<SLAOrder[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_code, status, created_at")
        .in("status", ["received", "preparing", "out-for-delivery"])
        .order("created_at", { ascending: true });
      setOrders((data || []).map((o: any) => ({
        ...o,
        sla_target_mins: o.sla_target_mins ?? 15,
        fulfilled_at: o.fulfilled_at ?? null,
      })));
    };

    load();

    const channel = supabase
      .channel("sla-tracker")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        load();
      })
      .subscribe();

    const timer = setInterval(() => setNow(Date.now()), 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, []);

  const getElapsedMins = (createdAt: string) =>
    Math.floor((now - new Date(createdAt).getTime()) / 60000);

  const breached = orders.filter(
    (o) => getElapsedMins(o.created_at) > (o.sla_target_mins || 15)
  );
  const atRisk = orders.filter((o) => {
    const elapsed = getElapsedMins(o.created_at);
    const target = o.sla_target_mins || 15;
    return elapsed >= target * 0.7 && elapsed <= target;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" /> SLA Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-secondary p-2">
            <p className="text-lg font-bold text-foreground">{orders.length}</p>
            <p className="text-[10px] text-muted-foreground">Active</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2">
            <p className="text-lg font-bold text-primary">{atRisk.length}</p>
            <p className="text-[10px] text-muted-foreground">At Risk</p>
          </div>
          <div className="rounded-lg bg-destructive/10 p-2">
            <p className="text-lg font-bold text-destructive">{breached.length}</p>
            <p className="text-[10px] text-muted-foreground">Breached</p>
          </div>
        </div>

        {breached.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> SLA Breached
            </p>
            {breached.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2"
              >
                <span className="text-xs font-mono font-bold text-foreground">
                  {o.order_code}
                </span>
                <Badge variant="destructive" className="text-[10px]">
                  {getElapsedMins(o.created_at)}m / {o.sla_target_mins || 15}m
                </Badge>
              </div>
            ))}
          </div>
        )}

        {orders.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            All orders fulfilled on time
          </div>
        )}
      </CardContent>
    </Card>
  );
}
