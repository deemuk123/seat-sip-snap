import { motion } from "framer-motion";
import { ArrowLeft, Package, ChefHat, Bike, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const statusSteps = [
  { key: "received", label: "Order Received", icon: Package, description: "Your order has been confirmed" },
  { key: "preparing", label: "Preparing", icon: ChefHat, description: "Your food is being prepared" },
  { key: "out-for-delivery", label: "Out for Delivery", icon: Bike, description: "On the way to you" },
  { key: "delivered", label: "Delivered", icon: CheckCircle2, description: "Enjoy your meal!" },
] as const;

type OrderStatus = "received" | "preparing" | "out-for-delivery" | "delivered" | "cancelled";

const OrderTracking = () => {
  const navigate = useNavigate();
  const { currentOrder } = useApp();
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>("received");

  // Subscribe to real-time order updates
  useEffect(() => {
    if (!currentOrder?.id) return;

    // Fetch initial status
    supabase
      .from("orders")
      .select("status")
      .eq("id", currentOrder.id)
      .single()
      .then(({ data }) => {
        if (data?.status) setCurrentStatus(data.status as OrderStatus);
      });

    // Real-time subscription
    const channel = supabase
      .channel(`order-${currentOrder.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${currentOrder.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).status as OrderStatus;
          setCurrentStatus(newStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrder?.id]);

  if (!currentOrder) {
    navigate("/");
    return null;
  }

  const isCancelled = currentStatus === "cancelled";
  const statusIndex = statusSteps.findIndex(s => s.key === currentStatus);

  return (
    <div className="min-h-screen bg-background px-4 pt-6 pb-24">
      <button onClick={() => navigate("/confirmation")} className="flex items-center gap-1.5 text-muted-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </button>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground mb-1">Order Status</h1>
        <p className="text-sm text-muted-foreground">
          Order <span className="text-primary font-semibold">{currentOrder.orderCode}</span>
        </p>
      </div>

      {/* Cancelled State */}
      {isCancelled && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl bg-destructive/10 border border-destructive/20 p-6 text-center mb-8"
        >
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h2 className="text-lg font-display font-bold text-destructive">Order Cancelled</h2>
          <p className="text-sm text-muted-foreground mt-1">This order has been cancelled.</p>
        </motion.div>
      )}

      {/* Status Timeline */}
      {!isCancelled && (
        <div className="max-w-sm mx-auto space-y-0">
          {statusSteps.map((step, index) => {
            const isActive = index <= statusIndex;
            const isCurrent = index === statusIndex;
            const Icon = step.icon;

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-4"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isCurrent
                        ? "cinema-gradient-primary cinema-glow"
                        : isActive
                        ? "bg-primary/20"
                        : "bg-secondary"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors duration-500 ${
                        isCurrent
                          ? "text-primary-foreground"
                          : isActive
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div
                      className={`w-0.5 h-12 transition-colors duration-500 ${
                        isActive && index < statusIndex ? "bg-primary/40" : "bg-border"
                      }`}
                    />
                  )}
                </div>

                <div className="pt-2.5 pb-8">
                  <h3
                    className={`font-display font-semibold transition-colors duration-500 ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  {isCurrent && currentStatus !== "delivered" && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="inline-block mt-2 text-xs font-medium text-primary animate-pulse-glow"
                    >
                      In progress...
                    </motion.span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderTracking;
