import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";

export default function RepeatOrderButton({ phone }: { phone: string }) {
  const { addToCart } = useApp();
  const [loading, setLoading] = useState(false);

  const handleRepeat = async () => {
    if (!phone || phone.length < 10) return;
    setLoading(true);
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("order_items(*)")
        .eq("phone", phone)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!orders || orders.length === 0) {
        toast.info("No previous orders found");
        setLoading(false);
        return;
      }

      const items = (orders[0] as any).order_items || [];
      if (items.length === 0) {
        toast.info("No items in previous order");
        setLoading(false);
        return;
      }

      let addedCount = 0;
      for (const item of items) {
        // Verify item is still available
        const { data: menuItem } = await supabase
          .from("menu_items")
          .select("id, name, price, category, description, image_url, available")
          .eq("id", item.menu_item_id)
          .eq("available", true)
          .maybeSingle();

        if (menuItem) {
          for (let i = 0; i < item.quantity; i++) {
            addToCart({
              id: menuItem.id,
              name: menuItem.name,
              price: menuItem.price,
              category: menuItem.category,
              description: menuItem.description || "",
              imageUrl: menuItem.image_url || "",
              available: true,
            });
          }
          addedCount += item.quantity;
        }
      }

      if (addedCount > 0) {
        toast.success(`Added ${addedCount} item(s) from your last order`);
      } else {
        toast.info("Items from previous order are no longer available");
      }
    } catch {
      toast.error("Failed to load previous order");
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleRepeat}
      disabled={loading || phone.length < 10}
      className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground disabled:opacity-40 active:scale-95 transition-transform"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <RefreshCw className="w-3.5 h-3.5" />
      )}
      Repeat Last Order
    </button>
  );
}
