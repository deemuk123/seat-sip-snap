import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Clock, Monitor, Languages, Sparkles, Search, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Order, Show } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchShows, lookupOrdersByPhone } from "@/lib/supabase-orders";
import { supabase } from "@/integrations/supabase/client";

const ShowSelection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectShow, setCurrentOrder, setDeliveryMode, setSeatNumber } = useApp();
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [foundOrders, setFoundOrders] = useState<Order[] | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [shows, setShows] = useState<Show[]>([]);
  const [loadingShows, setLoadingShows] = useState(true);

  // QR deep-link: auto-redirect if show & seat params present
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  useEffect(() => {
    const showParam = searchParams.get("show");
    const seatParam = searchParams.get("seat");

    fetchShows().then((data) => {
      setShows(data);
      setLoadingShows(false);

      // Handle QR deep-link
      if (showParam && seatParam && !deepLinkHandled) {
        const matchedShow = data.find(s => s.id === showParam);
        if (matchedShow) {
          setDeepLinkHandled(true);
          selectShow(matchedShow);
          setDeliveryMode("seat");
          setSeatNumber(seatParam.toUpperCase());
          navigate("/menu", { replace: true });
          return;
        }
      }
    }).catch(() => setLoadingShows(false));
  }, []);

  const handleSelectShow = (show: Show) => {
    selectShow(show);
    navigate("/delivery");
  };

  const handleLookup = async () => {
    if (lookupPhone.length !== 10) {
      setLookupError("Please enter a valid 10-digit mobile number");
      return;
    }
    setLookupError("");
    setLookupLoading(true);
    try {
      const orders = await lookupOrdersByPhone(lookupPhone);
      if (orders.length === 0) {
        setLookupError("No orders found for this number");
        setFoundOrders(null);
      } else if (orders.length === 1) {
        setCurrentOrder(orders[0]);
        navigate("/confirmation");
      } else {
        setFoundOrders(orders);
      }
    } catch {
      setLookupError("Something went wrong. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSelectOrder = (order: Order) => {
    setCurrentOrder(order);
    navigate("/confirmation");
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-primary">BigMovies</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Select Your Show</h1>
        <p className="text-sm text-muted-foreground mt-1">Choose a show to order food & beverages</p>
      </motion.div>

      {/* Order Lookup Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6 rounded-xl bg-card border border-border overflow-hidden">
        <button onClick={() => setLookupOpen(!lookupOpen)} className="w-full flex items-center justify-between p-4 text-left">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Track your existing order</span>
          </div>
          {lookupOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        <AnimatePresence>
          {lookupOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="px-4 pb-4 space-y-3">
                <p className="text-xs text-muted-foreground">Enter your mobile number to check your order status</p>
                <div className="flex gap-2">
                  <Input type="tel" value={lookupPhone} onChange={(e) => { setLookupPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setLookupError(""); setFoundOrders(null); }} placeholder="10-digit mobile number" className="flex-1" />
                  <Button onClick={handleLookup} disabled={lookupPhone.length !== 10 || lookupLoading} size="default">
                    {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find"}
                  </Button>
                </div>
                {lookupError && <p className="text-xs text-destructive">{lookupError}</p>}
                {foundOrders && foundOrders.length > 1 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-medium text-muted-foreground">{foundOrders.length} orders found — select one:</p>
                    {foundOrders.map((order) => (
                      <button key={order.id} onClick={() => handleSelectOrder(order)} className="w-full text-left rounded-lg bg-secondary p-3 active:scale-[0.98] transition-transform">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold text-primary tracking-wider">{order.orderCode}</span>
                            <span className="text-xs text-muted-foreground ml-2">{order.show.movieName}</span>
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">{order.status.replace("-", " ")}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Shows List */}
      {loadingShows ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (() => {
        const runningShows = shows.filter(s => s.status === "running");
        const upcomingShows = shows.filter(s => s.status !== "running").slice(0, 2);
        const displayShows = [...runningShows, ...upcomingShows];

        if (displayShows.length === 0) {
          return <p className="text-center text-muted-foreground py-12">No shows available right now.</p>;
        }

        return (
          <div className="space-y-4">
            {displayShows.map((show, index) => (
              <motion.button key={show.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} onClick={() => handleSelectShow(show)} className="w-full text-left rounded-xl bg-card border border-border p-4 active:scale-[0.98] transition-transform">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-lg text-foreground truncate">{show.movieName}</h3>
                      {show.status === "running" ? (
                        <Badge className="bg-green-600 text-white border-0 text-[10px] px-1.5 py-0">Now Playing</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Up Next</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" />{show.showTime}</span>
                      <span className="flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5 text-primary" />Screen {show.screenNumber}</span>
                      {show.language && <span className="flex items-center gap-1.5"><Languages className="w-3.5 h-3.5 text-primary" />{show.language}</span>}
                    </div>
                  </div>
                  {show.format && <span className="shrink-0 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">{show.format}</span>}
                </div>
              </motion.button>
            ))}
          </div>
        );
      })()}
    </div>
  );
};

export default ShowSelection;
