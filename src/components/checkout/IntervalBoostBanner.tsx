import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X } from "lucide-react";
import { fetchSetting } from "@/lib/supabase-admin";

interface IntervalBoostConfig {
  enabled: boolean;
  message: string;
  discount_percentage: number;
}

export default function IntervalBoostBanner() {
  const [boost, setBoost] = useState<IntervalBoostConfig | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchSetting("interval_boost")
      .then((val) => {
        if (val?.enabled) setBoost(val);
      })
      .catch(() => {});
  }, []);

  if (!boost || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="rounded-xl bg-primary/10 border border-primary/30 p-4 mb-4 relative"
      >
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 p-1 text-muted-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              ⚡ Interval Boost Active!
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {boost.message ||
                `Get ${boost.discount_percentage}% off during interval!`}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
