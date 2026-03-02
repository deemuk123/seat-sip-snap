import { motion } from "framer-motion";
import { ArrowLeft, Minus, Plus, Trash2, Armchair, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useState, useEffect, useCallback } from "react";
import { insertOrder } from "@/lib/supabase-orders";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import UpsellSuggestions from "@/components/checkout/UpsellSuggestions";
import CouponInput from "@/components/checkout/CouponInput";
import IntervalBoostBanner from "@/components/checkout/IntervalBoostBanner";
import RepeatOrderButton from "@/components/checkout/RepeatOrderButton";

const Checkout = () => {
  const navigate = useNavigate();
  const {
    cart, cartTotal, updateQuantity,
    selectedShow, deliveryMode, seatNumber, setPhone, setCurrentOrder, clearCart,
  } = useApp();
  const [phoneInput, setPhoneInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);

  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);

  const finalTotal = Math.max(0, cartTotal - discount);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendOtp = useCallback(async () => {
    if (phoneInput.length < 10 || sendingOtp) return;
    setSendingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone: phoneInput },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPhone(phoneInput);
      setOtpSent(true);
      setCooldown(30);

      if (data?.otp) {
        setSimulatedOtp(data.otp);
        toast.info(`Your OTP is: ${data.otp}`, { duration: 10000 });
      } else {
        toast.success("OTP sent to your phone");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    }
    setSendingOtp(false);
  }, [phoneInput, sendingOtp, setPhone]);

  const handleVerifyAndOrder = async () => {
    if (otp.length < 6) return;
    setVerifying(true);
    try {
      // Verify OTP
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { phone: phoneInput, otp },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (!data?.verified) {
        toast.error("OTP verification failed");
        setVerifying(false);
        return;
      }

      // Fraud check
      const { data: fraudData } = await supabase.functions.invoke("check-fraud", {
        body: {
          phone: phoneInput,
          show_id: selectedShow?.id,
          seat_number: seatNumber || null,
        },
      });

      if (fraudData && !fraudData.allowed) {
        toast.error(fraudData.reason || "Order not allowed");
        setVerifying(false);
        return;
      }

      // Place order
      const order = await insertOrder({
        show: selectedShow!,
        items: [...cart],
        deliveryMode: deliveryMode!,
        seatNumber: seatNumber || undefined,
        phone: phoneInput,
        total: finalTotal,
      });
      setCurrentOrder(order);
      clearCart();
      navigate("/confirmation");
    } catch (err: any) {
      toast.error(err.message || "Order failed");
      setVerifying(false);
    }
  };

  if (cart.length === 0) {
    navigate("/menu");
    return null;
  }

  return (
    <div className="min-h-screen bg-background px-4 pb-32 pt-6">
      <button onClick={() => navigate("/menu")} className="flex items-center gap-1.5 text-muted-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back to Menu</span>
      </button>

      <h1 className="text-2xl font-bold font-display text-foreground mb-6">Checkout</h1>

      {/* Interval Boost Banner */}
      <IntervalBoostBanner />

      {/* Show + Delivery Info */}
      <div className="rounded-xl bg-card border border-border p-4 mb-6">
        {selectedShow && (
          <p className="text-sm font-semibold text-foreground">{selectedShow.movieName} · {selectedShow.showTime}</p>
        )}
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          {deliveryMode === "seat" ? (
            <><Armchair className="w-4 h-4 text-primary" /><span>Seat Delivery · Seat {seatNumber}</span></>
          ) : (
            <><Store className="w-4 h-4 text-primary" /><span>Counter Pickup</span></>
          )}
        </div>
      </div>

      {/* AI Upsell Suggestions */}
      <UpsellSuggestions />

      {/* Cart Items */}
      <div className="space-y-3 mb-6">
        {cart.map((item) => (
          <motion.div key={item.id} layout className="rounded-xl bg-card border border-border p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm truncate">{item.name}</h3>
              <p className="text-primary font-bold text-sm mt-1">₹{item.price * item.quantity}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-destructive" /> : <Minus className="w-3.5 h-3.5 text-foreground" />}
              </button>
              <span className="w-5 text-center font-semibold text-foreground text-sm">{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 rounded-full cinema-gradient-primary flex items-center justify-center">
                <Plus className="w-3.5 h-3.5 text-primary-foreground" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Coupon */}
      <CouponInput
        subtotal={cartTotal}
        showId={selectedShow?.id}
        onApply={(d, c) => { setDiscount(d); setAppliedCoupon(c); }}
        onRemove={() => { setDiscount(0); setAppliedCoupon(null); }}
        appliedCode={appliedCoupon}
        discount={discount}
      />

      {/* Total */}
      <div className="rounded-xl bg-secondary p-4 mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-1">
          <span>Subtotal</span><span>₹{cartTotal}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-primary mb-1">
            <span>Discount ({appliedCoupon})</span><span>-₹{discount}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold font-display text-foreground border-t border-border pt-2">
          <span>Total</span><span className="text-primary">₹{finalTotal}</span>
        </div>
      </div>

      {/* Phone & OTP */}
      <div className="space-y-4">
        {!otpSent ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">Mobile Number</label>
              <RepeatOrderButton phone={phoneInput} />
            </div>
            <div className="flex gap-3">
              <input type="tel" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Enter 10-digit number" className="flex-1 rounded-lg bg-card border border-border px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              <button onClick={handleSendOtp} disabled={phoneInput.length < 10 || sendingOtp} className="shrink-0 rounded-lg cinema-gradient-primary px-5 py-3 text-primary-foreground font-semibold text-sm disabled:opacity-40">
                {sendingOtp ? "Sending…" : "Send OTP"}
              </button>
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <label className="text-sm font-medium text-foreground mb-2 block">Enter OTP sent to +91 {phoneInput}</label>
            {simulatedOtp && (
              <p className="text-xs text-primary mb-2 font-mono bg-primary/10 rounded-lg px-3 py-1.5 inline-block">
                Demo OTP: {simulatedOtp}
              </p>
            )}
            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter 6-digit OTP" className="w-full rounded-lg bg-card border border-border px-4 py-3 text-foreground text-center text-2xl tracking-[0.5em] font-mono placeholder:text-muted-foreground placeholder:text-base placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary" maxLength={6} />
            <button
              onClick={handleSendOtp}
              disabled={cooldown > 0 || sendingOtp}
              className="mt-2 text-xs text-primary disabled:text-muted-foreground"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
            </button>
          </motion.div>
        )}
      </div>

      {/* Place Order */}
      {otpSent && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-0 left-0 right-0 p-4 glass-surface border-t border-border">
          <button onClick={handleVerifyAndOrder} disabled={otp.length < 6 || verifying} className="w-full rounded-xl cinema-gradient-primary py-4 text-primary-foreground font-display font-semibold text-lg disabled:opacity-40 active:scale-[0.98] transition-all">
            {verifying ? "Placing Order..." : `Place Order · ₹${finalTotal}`}
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default Checkout;
