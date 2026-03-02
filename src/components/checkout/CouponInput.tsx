import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, X, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CouponInputProps {
  subtotal: number;
  showId?: string;
  onApply: (discount: number, code: string) => void;
  onRemove: () => void;
  appliedCode: string | null;
  discount: number;
}

export default function CouponInput({
  subtotal,
  showId,
  onApply,
  onRemove,
  appliedCode,
  discount,
}: CouponInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = useCallback(async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "validate-coupon",
        { body: { code: code.trim(), show_id: showId, subtotal } }
      );
      if (fnError) throw fnError;

      if (data?.valid) {
        onApply(data.discount, code.trim().toUpperCase());
        setCode("");
      } else {
        setError(data?.error || "Invalid coupon");
      }
    } catch {
      setError("Failed to validate coupon");
    }
    setLoading(false);
  }, [code, showId, subtotal, onApply]);

  return (
    <div className="mb-4">
      <AnimatePresence mode="wait">
        {appliedCode ? (
          <motion.div
            key="applied"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {appliedCode}
              </span>
              <span className="text-xs text-muted-foreground">
                -₹{discount} off
              </span>
            </div>
            <button
              onClick={onRemove}
              className="p-1 rounded-full hover:bg-secondary"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="Coupon code"
                  className="w-full rounded-lg bg-card border border-border pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={handleApply}
                disabled={!code.trim() || loading}
                className="shrink-0 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Apply"
                )}
              </button>
            </div>
            {error && (
              <p className="text-xs text-destructive mt-1.5">{error}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
