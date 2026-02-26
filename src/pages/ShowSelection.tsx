import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Clock, Monitor, Languages, Sparkles, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mockShows, Order } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ShowSelection = () => {
  const navigate = useNavigate();
  const { selectShow, lookupOrdersByPhone, setCurrentOrder } = useApp();
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [foundOrders, setFoundOrders] = useState<Order[] | null>(null);
  const [lookupError, setLookupError] = useState("");

  const handleSelectShow = (show: typeof mockShows[0]) => {
    selectShow(show);
    navigate("/delivery");
  };

  const handleLookup = () => {
    if (lookupPhone.length !== 10) {
      setLookupError("Please enter a valid 10-digit mobile number");
      return;
    }
    setLookupError("");
    const orders = lookupOrdersByPhone(lookupPhone);
    if (orders.length === 0) {
      setLookupError("No orders found for this number");
      setFoundOrders(null);
    } else if (orders.length === 1) {
      setCurrentOrder(orders[0]);
      navigate("/confirmation");
    } else {
      setFoundOrders(orders);
    }
  };

  const handleSelectOrder = (order: Order) => {
    setCurrentOrder(order);
    navigate("/confirmation");
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-primary">BigMovies</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Select Your Show</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a show to order food & beverages
        </p>
      </motion.div>

      {/* Order Lookup Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 rounded-xl bg-card border border-border overflow-hidden"
      >
        <button
          onClick={() => setLookupOpen(!lookupOpen)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Track your existing order</span>
          </div>
          {lookupOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <AnimatePresence>
          {lookupOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Enter your mobile number to check your order status
                </p>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    value={lookupPhone}
                    onChange={(e) => {
                      setLookupPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      setLookupError("");
                      setFoundOrders(null);
                    }}
                    placeholder="10-digit mobile number"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleLookup}
                    disabled={lookupPhone.length !== 10}
                    size="default"
                  >
                    Find
                  </Button>
                </div>

                {lookupError && (
                  <p className="text-xs text-destructive">{lookupError}</p>
                )}

                {/* Multiple orders list */}
                {foundOrders && foundOrders.length > 1 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {foundOrders.length} orders found — select one:
                    </p>
                    {foundOrders.map((order) => (
                      <button
                        key={order.id}
                        onClick={() => handleSelectOrder(order)}
                        className="w-full text-left rounded-lg bg-secondary p-3 active:scale-[0.98] transition-transform"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold text-primary tracking-wider">
                              {order.orderCode}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {order.show.movieName}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">
                            {order.status.replace("-", " ")}
                          </span>
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
      <div className="space-y-4">
        {mockShows.map((show, index) => (
          <motion.button
            key={show.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            onClick={() => handleSelectShow(show)}
            className="w-full text-left rounded-xl bg-card border border-border p-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-lg text-foreground truncate">
                  {show.movieName}
                </h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    {show.showTime}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-primary" />
                    Screen {show.screenNumber}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-primary" />
                    {show.language}
                  </span>
                </div>
              </div>
              <span className="shrink-0 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">
                {show.format}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default ShowSelection;
