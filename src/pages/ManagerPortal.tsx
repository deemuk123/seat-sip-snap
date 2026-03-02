import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, LayoutDashboard, ClipboardList, UtensilsCrossed, RefreshCw, Clock } from "lucide-react";
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
import SLATracker from "@/components/manager/SLATracker";
import { toast } from "sonner";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "received", label: "Received" },
  { value: "preparing", label: "Preparing" },
  { value: "out-for-delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const ManagerPortal = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [shows, setShows] = useState<{ id: string; movieName: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilter, setShowFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const [verifyOrderId, setVerifyOrderId] = useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllOrders({
        status: statusFilter !== "all" ? (statusFilter as OrderStatus) : undefined,
        showId: showFilter !== "all" ? showFilter : undefined,
      });
      setOrders(data);
    } catch { toast.error("Failed to load orders"); }
    setLoading(false);
  }, [statusFilter, showFilter]);

  useEffect(() => {
    fetchShows().then(s => setShows(s.map(x => ({ id: x.id, movieName: x.movieName }))));
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

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="orders" className="flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4" /> Orders
              </TabsTrigger>
              <TabsTrigger value="sla" className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> SLA
              </TabsTrigger>
              <TabsTrigger value="menu" className="flex items-center gap-1.5">
                <UtensilsCrossed className="w-4 h-4" /> Menu
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
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTERS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={showFilter} onValueChange={setShowFilter}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Show" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shows</SelectItem>
                    {shows.map(s => <SelectItem key={s.id} value={s.id}>{s.movieName}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="outline" onClick={loadOrders}><RefreshCw className="w-4 h-4" /></Button>
              </div>

              {/* Order list */}
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-12">Loading orders…</p>
              ) : orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No orders found</p>
              ) : (
                <div className="space-y-3">
                  {orders.map(order => (
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
            </TabsContent>

            <TabsContent value="sla">
              <SLATracker />
            </TabsContent>

            <TabsContent value="menu">
              <MenuManager />
            </TabsContent>
          </Tabs>
        </motion.div>

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
