import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, LayoutDashboard, ClipboardList, UtensilsCrossed, RefreshCw, Clock, QrCode, ChevronDown, ChevronUp, AlertTriangle, Film } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fetchShows } from "@/lib/supabase-orders";
import { fetchAllOrders, updateOrderStatus, verifyAndDeliverOrder, type DBOrder, type OrderStatus } from "@/lib/supabase-manager";
import OrderCard from "@/components/manager/OrderCard";
import VerifyDeliverDialog from "@/components/manager/VerifyDeliverDialog";
import CancelOrderDialog from "@/components/manager/CancelOrderDialog";
import MenuManager from "@/components/manager/MenuManager";
import QRGenerator from "@/components/manager/QRGenerator";
import SLATracker from "@/components/manager/SLATracker";
import { useOrderSound } from "@/hooks/useOrderSound";
import { toast } from "sonner";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "received", label: "Received" },
  { value: "preparing", label: "Preparing" },
  { value: "out-for-delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const SLA_WARN_MINS = 10;

interface ShowGroup {
  showId: string;
  showName: string;
  showTime: string;
  orders: DBOrder[];
  pendingCount: number;
  overdueCount: number;
}

const ManagerPortal = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [shows, setShows] = useState<{ id: string; movieName: string; showTime?: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expandedShows, setExpandedShows] = useState<Set<string>>(new Set());

  const [verifyOrderId, setVerifyOrderId] = useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);

  // Sound notifications for new / overdue orders
  useOrderSound({ orders });

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllOrders({
        status: statusFilter !== "all" ? (statusFilter as OrderStatus) : undefined,
      });
      setOrders(data);
    } catch { toast.error("Failed to load orders"); }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchShows().then(s => setShows(s.map(x => ({ id: x.id, movieName: x.movieName, showTime: x.showTime }))));
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("manager-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadOrders]);

  // Group orders by show
  const showGroups = useMemo((): ShowGroup[] => {
    const groupMap = new Map<string, DBOrder[]>();
    const noShowOrders: DBOrder[] = [];

    for (const order of orders) {
      const showId = order.show_id || "no-show";
      if (showId === "no-show") {
        noShowOrders.push(order);
      } else {
        if (!groupMap.has(showId)) groupMap.set(showId, []);
        groupMap.get(showId)!.push(order);
      }
    }

    const groups: ShowGroup[] = [];

    for (const [showId, showOrders] of groupMap) {
      const snapshot = showOrders[0]?.show_snapshot as any;
      const showInfo = shows.find(s => s.id === showId);
      const showName = showInfo?.movieName || snapshot?.movieName || "Unknown Show";
      const showTime = showInfo?.showTime || snapshot?.showTime || "";

      const pendingCount = showOrders.filter(o => o.status !== "delivered" && o.status !== "cancelled").length;
      const overdueCount = showOrders.filter(o => {
        if (o.status === "delivered" || o.status === "cancelled") return false;
        return Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000) >= SLA_WARN_MINS;
      }).length;

      groups.push({ showId, showName, showTime, orders: showOrders, pendingCount, overdueCount });
    }

    if (noShowOrders.length > 0) {
      groups.push({
        showId: "no-show",
        showName: "No Show Assigned",
        showTime: "",
        orders: noShowOrders,
        pendingCount: noShowOrders.filter(o => o.status !== "delivered" && o.status !== "cancelled").length,
        overdueCount: 0,
      });
    }

    // Sort: shows with overdue orders first, then by pending count descending
    groups.sort((a, b) => {
      if (a.overdueCount !== b.overdueCount) return b.overdueCount - a.overdueCount;
      if (a.pendingCount !== b.pendingCount) return b.pendingCount - a.pendingCount;
      return 0;
    });

    return groups;
  }, [orders, shows]);

  // Auto-expand shows with pending orders
  useEffect(() => {
    const autoExpand = new Set<string>();
    for (const g of showGroups) {
      if (g.pendingCount > 0) autoExpand.add(g.showId);
    }
    setExpandedShows(autoExpand);
  }, [showGroups.length]); // Only on initial load / order count change

  const toggleShow = (showId: string) => {
    setExpandedShows(prev => {
      const next = new Set(prev);
      if (next.has(showId)) next.delete(showId);
      else next.add(showId);
      return next;
    });
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Order updated to ${status}`);
      loadOrders();
    } catch { toast.error("Failed to update order"); }
  };

  const handleVerify = async (code: string): Promise<boolean> => {
    if (!verifyOrderId) return false;
    try {
      const ok = await verifyAndDeliverOrder(verifyOrderId, code);
      if (ok) { toast.success("Order delivered!"); loadOrders(); }
      return ok;
    } catch { toast.error("Verification failed"); return false; }
  };

  const handleCancel = async (reason: string) => {
    if (!cancelOrderId) return;
    try {
      await updateOrderStatus(cancelOrderId, "cancelled", reason);
      toast.success("Order cancelled");
      setCancelOrderId(null);
      loadOrders();
    } catch { toast.error("Failed to cancel"); }
  };

  // Status counts
  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate("/staff/dashboard")} className="flex items-center gap-1.5 text-muted-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Dashboard</span>
        </button>

        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg cinema-gradient-primary flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Manager Portal</h1>
              <p className="text-xs text-muted-foreground">Orders & menu management</p>
            </div>
          </div>

          <Tabs defaultValue="orders" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="orders" className="flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4" /> Orders
              </TabsTrigger>
              <TabsTrigger value="sla" className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> SLA
              </TabsTrigger>
              <TabsTrigger value="menu" className="flex items-center gap-1.5">
                <UtensilsCrossed className="w-4 h-4" /> Menu
              </TabsTrigger>
              <TabsTrigger value="qr" className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4" /> QR
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="space-y-4">
              {/* Status summary */}
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.slice(1, 5).map(s => (
                  <Badge key={s.value} variant="outline" className="text-xs">
                    {s.label}: {counts[s.value] || 0}
                  </Badge>
                ))}
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTERS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="outline" onClick={loadOrders}><RefreshCw className="w-4 h-4" /></Button>
              </div>

              {/* Show-grouped order list */}
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-12">Loading orders…</p>
              ) : showGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No orders found</p>
              ) : (
                <div className="space-y-3">
                  {showGroups.map(group => {
                    const isExpanded = expandedShows.has(group.showId);
                    return (
                      <div key={group.showId} className="rounded-xl border border-border overflow-hidden">
                        {/* Show header - clickable accordion */}
                        <button
                          onClick={() => toggleShow(group.showId)}
                          className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                            group.overdueCount > 0
                              ? "bg-destructive/10 border-b border-destructive/30"
                              : "bg-card border-b border-border"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              group.overdueCount > 0 ? "bg-destructive/20" : "bg-secondary"
                            }`}>
                              <Film className={`w-4 h-4 ${group.overdueCount > 0 ? "text-destructive" : "text-primary"}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-display font-semibold text-foreground text-sm">{group.showName}</span>
                                {group.showTime && (
                                  <span className="text-xs text-muted-foreground">{group.showTime}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground">{group.orders.length} order{group.orders.length !== 1 ? "s" : ""}</span>
                                {group.pendingCount > 0 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/30">
                                    {group.pendingCount} pending
                                  </Badge>
                                )}
                                {group.overdueCount > 0 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-destructive/20 text-destructive border-destructive/40 animate-pulse">
                                    <AlertTriangle className="w-3 h-3 mr-0.5" />{group.overdueCount} overdue
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                        </button>

                        {/* Orders list */}
                        {isExpanded && (
                          <div className="p-3 space-y-3 bg-background">
                            {group.orders.map(order => (
                              <OrderCard
                                key={order.id}
                                order={order}
                                onStatusChange={handleStatusChange}
                                onVerifyDeliver={(id) => setVerifyOrderId(id)}
                                onCancel={(id) => setCancelOrderId(id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sla">
              <SLATracker />
            </TabsContent>

            <TabsContent value="menu">
              <MenuManager />
            </TabsContent>

            <TabsContent value="qr">
              <QRGenerator />
            </TabsContent>
          </Tabs>
        </div>

        <VerifyDeliverDialog
          open={!!verifyOrderId}
          onClose={() => setVerifyOrderId(null)}
          onVerify={handleVerify}
        />
        <CancelOrderDialog
          open={!!cancelOrderId}
          onClose={() => setCancelOrderId(null)}
          onConfirm={handleCancel}
        />
      </div>
    </div>
  );
};

export default ManagerPortal;
