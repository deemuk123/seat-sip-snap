import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, Coffee } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { isInInterval, formatIntervalWindow } from "@/lib/interval-utils";
import { fetchSetting } from "@/lib/supabase-admin";

interface IntervalBoostConfig {
  enabled: boolean;
  message: string;
  discount_percentage: number;
}

export default function IntervalBoostBanner() {
  const { selectedShow } = useApp();
  const [boost, setBoost] = useState<IntervalBoostConfig | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [inInterval, setInInterval] = useState(false);

  // Check interval status every 30s
  useEffect(() => {
    const check = () => {
      if (selectedShow) {
        setInInterval(isInInterval(selectedShow));
      }
    };
    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [selectedShow]);

  useEffect(() => {
    fetchSetting("interval_boost")
      .then((val) => {
        if (val?.enabled) setBoost(val);
      })
      .catch(() => {});
  }, []);

  // Show banner if show is in interval, regardless of boost config
  if (dismissed || !inInterval) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="rounded-xl bg-primary/10 border border-primary/40 p-4 mb-4 relative overflow-hidden"
      >
        {/* Animated glow background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/15 to-primary/5 animate-pulse" />
        
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 p-1 text-muted-foreground z-10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 animate-pulse">
            <Coffee className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              ☕ It's Interval Time!
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {boost?.message
                ? boost.message
                : "Order now for quick delivery during the break!"}
            </p>
            {selectedShow?.intervalStart && selectedShow?.intervalEnd && (
              <p className="text-[10px] text-primary font-medium mt-1">
                ⏱ {formatIntervalWindow(selectedShow.intervalStart, selectedShow.intervalEnd)}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
