import { motion } from "framer-motion";
import { ArrowLeft, Package, ChefHat, Bike, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useState, useEffect } from "react";

const statusSteps = [
  { key: "received", label: "Order Received", icon: Package, description: "Your order has been confirmed" },
  { key: "preparing", label: "Preparing", icon: ChefHat, description: "Your food is being prepared" },
  { key: "out-for-delivery", label: "Out for Delivery", icon: Bike, description: "On the way to you" },
  { key: "delivered", label: "Delivered", icon: CheckCircle2, description: "Enjoy your meal!" },
] as const;

const OrderTracking = () => {
  const navigate = useNavigate();
  const { currentOrder } = useApp();
  const [currentStatus, setCurrentStatus] = useState(0);

  // Simulate status progression
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setCurrentStatus(1), 5000));
    timers.push(setTimeout(() => setCurrentStatus(2), 12000));
    timers.push(setTimeout(() => setCurrentStatus(3), 20000));
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!currentOrder) {
    navigate("/");
    return null;
  }

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

      {/* Status Timeline */}
      <div className="max-w-sm mx-auto space-y-0">
        {statusSteps.map((step, index) => {
          const isActive = index <= currentStatus;
          const isCurrent = index === currentStatus;
          const Icon = step.icon;

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-4"
            >
              {/* Line + Circle */}
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
                      isActive && index < currentStatus ? "bg-primary/40" : "bg-border"
                    }`}
                  />
                )}
              </div>

              {/* Text */}
              <div className="pt-2.5 pb-8">
                <h3
                  className={`font-display font-semibold transition-colors duration-500 ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                {isCurrent && (
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
    </div>
  );
};

export default OrderTracking;
