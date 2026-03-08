import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ActiveSale {
  id: string;
  title: string;
  end_time: string;
  discount_value: number;
  discount_type: string;
}

const FlashSaleBanner = () => {
  const [activeSales, setActiveSales] = useState<ActiveSale[]>([]);

  useEffect(() => {
    const fetchActive = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("flash_sales")
        .select("id, title, end_time, discount_value, discount_type")
        .eq("is_active", true)
        .lte("start_time", now)
        .gte("end_time", now) as any;
      setActiveSales(data || []);
    };
    fetchActive();
    const interval = setInterval(fetchActive, 60000);
    return () => clearInterval(interval);
  }, []);

  if (activeSales.length === 0) return null;

  return (
    <AnimatePresence>
      {activeSales.map(sale => (
        <motion.div
          key={sale.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-xl bg-primary/10 border border-primary/30 p-3 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-full cinema-gradient-primary flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-foreground text-sm truncate">{sale.title}</p>
            <Countdown endTime={sale.end_time} />
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
};

const Countdown = ({ endTime }: { endTime: string }) => {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Ended"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h > 0 ? `${h}h ` : ""}${m}m ${s}s left`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return <p className="text-xs text-primary font-medium">⏱ {remaining}</p>;
};

export default FlashSaleBanner;

// Helper to fetch active flash sales for use in MenuPage / Checkout
export async function fetchActiveFlashSales() {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("flash_sales")
    .select("*")
    .eq("is_active", true)
    .lte("start_time", now)
    .gte("end_time", now) as any;
  return (data || []) as Array<{
    id: string;
    menu_item_ids: string[];
    discount_type: string;
    discount_value: number;
    title: string;
    end_time: string;
  }>;
}

export function getFlashDiscount(
  itemId: string,
  originalPrice: number,
  activeSales: Array<{ menu_item_ids: string[]; discount_type: string; discount_value: number }>
): number | null {
  for (const sale of activeSales) {
    if (sale.menu_item_ids.includes(itemId)) {
      if (sale.discount_type === "percentage") {
        return Math.round(originalPrice * (1 - sale.discount_value / 100));
      }
      return Math.max(0, originalPrice - sale.discount_value);
    }
  }
  return null;
}
