import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Minus, ShoppingCart, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { menuCategories, MenuItem } from "@/data/mockData";
import { fetchMenuItems } from "@/lib/supabase-orders";
import IntervalBoostBanner from "@/components/checkout/IntervalBoostBanner";

const MenuPage = () => {
  const navigate = useNavigate();
  const { addToCart, updateQuantity, cart, cartTotal, cartCount } = useApp();
  const [activeCategory, setActiveCategory] = useState("Combos");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenuItems().then((data) => {
      setMenuItems(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const isWithinTimeWindow = (from?: string, until?: string) => {
    if (!from && !until) return true;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (from && hhmm < from) return false;
    if (until && hhmm > until) return false;
    return true;
  };

  const filteredItems = menuItems
    .filter((item) => item.available && isWithinTimeWindow(item.availableFrom, item.availableUntil))
    .filter((item) => activeCategory === "All" || item.category === activeCategory);

  const getCartQuantity = (itemId: string) => {
    const item = cart.find((c) => c.id === itemId);
    return item?.quantity || 0;
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-surface border-b border-border px-4 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate("/delivery")} className="flex items-center gap-1.5 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <h1 className="font-display font-bold text-lg text-foreground">Menu</h1>
          <div className="w-12" />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {menuCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "cinema-gradient-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Interval Boost Banner */}
      <div className="px-4 pt-4">
        <IntervalBoostBanner />
      </div>

      {/* Menu Items */}
      <div className="px-4 pt-2 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => {
              const qty = getCartQuantity(item.id);
              return (
                <motion.div key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="rounded-xl bg-card border border-border p-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling && ((e.target as HTMLImageElement).nextElementSibling as HTMLElement).style.removeProperty('display'); }}
                        />
                      ) : null}
                      <span className="text-2xl" style={item.imageUrl ? { display: 'none' } : undefined}>
                        {item.category === "Popcorn" ? "🍿" : item.category === "Beverages" ? "🥤" : item.category === "Combos" ? "🎬" : item.category === "Snacks" ? "🌮" : item.category === "Premium" ? "✨" : "🎉"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-foreground truncate">{item.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-display font-bold text-primary text-lg">₹{item.price}</span>
                        {!item.available ? (
                          <span className="text-xs font-medium text-destructive bg-destructive/10 px-3 py-1.5 rounded-full">Unavailable</span>
                        ) : qty === 0 ? (
                          <button onClick={() => addToCart(item)} className="flex items-center gap-1.5 cinema-gradient-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold active:scale-95 transition-transform">
                            <Plus className="w-4 h-4" />Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-3 bg-secondary rounded-full px-1 py-1">
                            <button onClick={() => updateQuantity(item.id, qty - 1)} className="w-8 h-8 rounded-full bg-card flex items-center justify-center active:scale-90 transition-transform">
                              <Minus className="w-4 h-4 text-foreground" />
                            </button>
                            <span className="font-semibold text-foreground w-4 text-center">{qty}</span>
                            <button onClick={() => updateQuantity(item.id, qty + 1)} className="w-8 h-8 rounded-full cinema-gradient-primary flex items-center justify-center active:scale-90 transition-transform">
                              <Plus className="w-4 h-4 text-primary-foreground" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Cart Bar */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 right-0 p-4 glass-surface border-t border-border">
            <button onClick={() => navigate("/checkout")} className="w-full rounded-xl cinema-gradient-primary py-4 px-6 flex items-center justify-between active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="w-5 h-5 text-primary-foreground" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-background text-primary text-xs font-bold flex items-center justify-center">{cartCount}</span>
                </div>
                <span className="font-display font-semibold text-primary-foreground">View Cart</span>
              </div>
              <span className="font-display font-bold text-primary-foreground text-lg">₹{cartTotal}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuPage;
