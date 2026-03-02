import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/context/AppContext";
import type { CartItem } from "@/data/mockData";

interface Suggestion {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string | null;
  image_url: string | null;
}

export default function UpsellSuggestions() {
  const { cart, addToCart } = useApp();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (cart.length === 0) return;

    const cartItems = cart.map((c) => ({ id: c.id, category: c.category }));

    supabase.functions
      .invoke("ai-upsell", { body: { cart_items: cartItems } })
      .then(({ data }) => {
        if (data?.suggestions?.length) {
          setSuggestions(data.suggestions);
          setMessage(data.message);
        }
      })
      .catch(() => {});
  }, [cart.length]);

  if (dismissed || suggestions.length === 0) return null;

  const handleAdd = (item: Suggestion) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      description: item.description || "",
      imageUrl: item.image_url || "",
      available: true,
    });
    setSuggestions((prev) => prev.filter((s) => s.id !== item.id));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-primary/5 border border-primary/20 p-4 mb-6"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {message || "You might also like"}
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
      <div className="space-y-2">
        <AnimatePresence>
          {suggestions.map((item) => (
            <motion.div
              key={item.id}
              layout
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-between rounded-lg bg-card border border-border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.name}
                </p>
                <p className="text-xs text-primary font-bold">₹{item.price}</p>
              </div>
              <button
                onClick={() => handleAdd(item)}
                className="shrink-0 ml-3 w-8 h-8 rounded-full cinema-gradient-primary flex items-center justify-center active:scale-90 transition-transform"
              >
                <Plus className="w-4 h-4 text-primary-foreground" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
