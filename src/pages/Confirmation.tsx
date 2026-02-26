import { motion } from "framer-motion";
import { CheckCircle2, Copy, Armchair, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useState } from "react";

const Confirmation = () => {
  const navigate = useNavigate();
  const { currentOrder, resetOrder } = useApp();
  const [copied, setCopied] = useState(false);

  if (!currentOrder) {
    navigate("/");
    return null;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(currentOrder.orderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTrack = () => {
    navigate("/tracking");
  };

  const handleNewOrder = () => {
    resetOrder();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="mb-6"
      >
        <div className="w-20 h-20 rounded-full cinema-gradient-primary flex items-center justify-center cinema-glow">
          <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-display font-bold text-foreground mb-2"
      >
        Order Confirmed!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-muted-foreground mb-8"
      >
        Your order has been placed successfully
      </motion.p>

      {/* Order Code */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 mb-6"
      >
        <p className="text-xs text-muted-foreground text-center mb-3 uppercase tracking-wider">Your Order Code</p>
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-5xl font-display font-extrabold text-primary tracking-[0.2em] cinema-glow-text">
            {currentOrder.orderCode}
          </span>
          <button onClick={handleCopy} className="p-2 rounded-lg bg-secondary active:scale-90 transition-transform">
            <Copy className={`w-5 h-5 ${copied ? "text-cinema-success" : "text-muted-foreground"}`} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {copied ? "Copied!" : "Show this code for delivery verification"}
        </p>
      </motion.div>

      {/* Order Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm rounded-2xl bg-card border border-border p-5 mb-6 space-y-3"
      >
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Show</span>
          <span className="text-foreground font-medium">{currentOrder.show.movieName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Time</span>
          <span className="text-foreground">{currentOrder.show.showTime}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Delivery</span>
          <span className="text-foreground flex items-center gap-1.5">
            {currentOrder.deliveryMode === "seat" ? (
              <><Armchair className="w-3.5 h-3.5 text-primary" /> Seat {currentOrder.seatNumber}</>
            ) : (
              <><Store className="w-3.5 h-3.5 text-primary" /> Counter Pickup</>
            )}
          </span>
        </div>
        <div className="border-t border-border pt-3 space-y-1.5">
          {currentOrder.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.name} x{item.quantity}</span>
              <span className="text-foreground">₹{item.price * item.quantity}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-lg font-bold font-display border-t border-border pt-3">
          <span className="text-foreground">Total</span>
          <span className="text-primary">₹{currentOrder.total}</span>
        </div>
        <div className="text-center">
          <span className="text-xs text-cinema-success font-medium">Est. delivery: {currentOrder.estimatedDelivery}</span>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-sm space-y-3"
      >
        <button
          onClick={handleTrack}
          className="w-full rounded-xl cinema-gradient-primary py-4 text-primary-foreground font-display font-semibold text-lg active:scale-[0.98] transition-transform"
        >
          Track Order
        </button>
        <button
          onClick={handleNewOrder}
          className="w-full rounded-xl bg-secondary py-4 text-secondary-foreground font-display font-semibold text-lg active:scale-[0.98] transition-transform"
        >
          New Order
        </button>
      </motion.div>
    </div>
  );
};

export default Confirmation;
