import { motion } from "framer-motion";
import { ArrowLeft, Minus, Plus, Trash2, Armchair, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useState } from "react";

const Checkout = () => {
  const navigate = useNavigate();
  const {
    cart, cartTotal, updateQuantity, removeFromCart,
    selectedShow, deliveryMode, seatNumber, setPhone, placeOrder,
  } = useApp();
  const [phoneInput, setPhoneInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleSendOtp = () => {
    if (phoneInput.length < 10) return;
    setPhone(phoneInput);
    setOtpSent(true);
  };

  const handleVerifyAndOrder = () => {
    if (otp.length < 4) return;
    setVerifying(true);
    // Simulate OTP verification
    setTimeout(() => {
      placeOrder();
      navigate("/confirmation");
    }, 1000);
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

      {/* Show + Delivery Info */}
      <div className="rounded-xl bg-card border border-border p-4 mb-6">
        {selectedShow && (
          <p className="text-sm font-semibold text-foreground">{selectedShow.movieName} · {selectedShow.showTime}</p>
        )}
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          {deliveryMode === "seat" ? (
            <>
              <Armchair className="w-4 h-4 text-primary" />
              <span>Seat Delivery · Seat {seatNumber}</span>
            </>
          ) : (
            <>
              <Store className="w-4 h-4 text-primary" />
              <span>Counter Pickup</span>
            </>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="space-y-3 mb-6">
        {cart.map((item) => (
          <motion.div
            key={item.id}
            layout
            className="rounded-xl bg-card border border-border p-4 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm truncate">{item.name}</h3>
              <p className="text-primary font-bold text-sm mt-1">₹{item.price * item.quantity}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
              >
                {item.quantity === 1 ? (
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-foreground" />
                )}
              </button>
              <span className="w-5 text-center font-semibold text-foreground text-sm">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="w-8 h-8 rounded-full cinema-gradient-primary flex items-center justify-center"
              >
                <Plus className="w-3.5 h-3.5 text-primary-foreground" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Total */}
      <div className="rounded-xl bg-secondary p-4 mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Subtotal</span>
          <span>₹{cartTotal}</span>
        </div>
        <div className="flex justify-between text-lg font-bold font-display text-foreground border-t border-border pt-2">
          <span>Total</span>
          <span className="text-primary">₹{cartTotal}</span>
        </div>
      </div>

      {/* Phone & OTP */}
      <div className="space-y-4">
        {!otpSent ? (
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Mobile Number</label>
            <div className="flex gap-3">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="Enter 10-digit number"
                className="flex-1 rounded-lg bg-card border border-border px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSendOtp}
                disabled={phoneInput.length < 10}
                className="shrink-0 rounded-lg cinema-gradient-primary px-5 py-3 text-primary-foreground font-semibold text-sm disabled:opacity-40"
              >
                Send OTP
              </button>
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Enter OTP sent to +91 {phoneInput}
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter OTP"
              className="w-full rounded-lg bg-card border border-border px-4 py-3 text-foreground text-center text-2xl tracking-[0.5em] font-mono placeholder:text-muted-foreground placeholder:text-base placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={6}
            />
          </motion.div>
        )}
      </div>

      {/* Place Order */}
      {otpSent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 p-4 glass-surface border-t border-border"
        >
          <button
            onClick={handleVerifyAndOrder}
            disabled={otp.length < 4 || verifying}
            className="w-full rounded-xl cinema-gradient-primary py-4 text-primary-foreground font-display font-semibold text-lg disabled:opacity-40 active:scale-[0.98] transition-all"
          >
            {verifying ? "Placing Order..." : `Place Order · ₹${cartTotal}`}
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default Checkout;
