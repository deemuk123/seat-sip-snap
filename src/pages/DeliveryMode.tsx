import { motion } from "framer-motion";
import { Armchair, Store, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useState } from "react";

const DeliveryMode = () => {
  const navigate = useNavigate();
  const { selectedShow, setDeliveryMode, setSeatNumber, seatNumber } = useApp();
  const [mode, setMode] = useState<"seat" | "counter" | null>(null);
  const [localSeat, setLocalSeat] = useState(seatNumber);

  const handleContinue = () => {
    if (!mode) return;
    setDeliveryMode(mode);
    if (mode === "seat") setSeatNumber(localSeat);
    navigate("/menu");
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-6">
      {/* Back button */}
      <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-muted-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </button>

      {/* Show info */}
      {selectedShow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg bg-secondary px-4 py-3 mb-8"
        >
          <p className="text-sm font-semibold text-foreground">{selectedShow.movieName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Screen {selectedShow.screenNumber} · {selectedShow.showTime} · {selectedShow.format}
          </p>
        </motion.div>
      )}

      <h1 className="text-2xl font-bold text-foreground mb-2">How would you like to get your order?</h1>
      <p className="text-sm text-muted-foreground mb-8">Choose your preferred delivery method</p>

      <div className="space-y-4">
        {/* Seat Delivery */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setMode("seat")}
          className={`w-full text-left rounded-xl border-2 p-5 transition-colors ${
            mode === "seat"
              ? "border-primary bg-primary/5 cinema-glow-sm"
              : "border-border bg-card"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`rounded-xl p-3 ${mode === "seat" ? "cinema-gradient-primary" : "bg-secondary"}`}>
              <Armchair className={`w-6 h-6 ${mode === "seat" ? "text-primary-foreground" : "text-muted-foreground"}`} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-foreground">Deliver to My Seat</h3>
              <p className="text-sm text-muted-foreground">We'll bring it right to you</p>
            </div>
          </div>
        </motion.button>

        {/* Seat number input */}
        {mode === "seat" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="pl-4"
          >
            <label className="text-sm font-medium text-foreground mb-2 block">
              Your Seat Number
            </label>
            <input
              type="text"
              value={localSeat}
              onChange={(e) => setLocalSeat(e.target.value.toUpperCase())}
              placeholder="e.g. A12"
              className="w-full rounded-lg bg-secondary border border-border px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg font-semibold"
            />
          </motion.div>
        )}

        {/* Counter Pickup */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => setMode("counter")}
          className={`w-full text-left rounded-xl border-2 p-5 transition-colors ${
            mode === "counter"
              ? "border-primary bg-primary/5 cinema-glow-sm"
              : "border-border bg-card"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`rounded-xl p-3 ${mode === "counter" ? "cinema-gradient-primary" : "bg-secondary"}`}>
              <Store className={`w-6 h-6 ${mode === "counter" ? "text-primary-foreground" : "text-muted-foreground"}`} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-foreground">Pickup from Counter</h3>
              <p className="text-sm text-muted-foreground">Collect when ready — skip the queue</p>
            </div>
          </div>
        </motion.button>
      </div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="fixed bottom-0 left-0 right-0 p-4 glass-surface border-t border-border"
      >
        <button
          onClick={handleContinue}
          disabled={!mode || (mode === "seat" && !localSeat.trim())}
          className="w-full rounded-xl cinema-gradient-primary py-4 text-primary-foreground font-display font-semibold text-lg disabled:opacity-40 transition-opacity active:scale-[0.98]"
        >
          Continue to Menu
        </button>
      </motion.div>
    </div>
  );
};

export default DeliveryMode;
