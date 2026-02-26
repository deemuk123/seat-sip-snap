import React, { createContext, useContext, useState, useCallback } from "react";
import { CartItem, MenuItem, Show, Order, generateOrderCode } from "@/data/mockData";

interface AppState {
  selectedShow: Show | null;
  deliveryMode: "seat" | "counter" | null;
  seatNumber: string;
  cart: CartItem[];
  currentOrder: Order | null;
  phone: string;
}

interface AppContextType extends AppState {
  selectShow: (show: Show) => void;
  setDeliveryMode: (mode: "seat" | "counter") => void;
  setSeatNumber: (seat: string) => void;
  setPhone: (phone: string) => void;
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  placeOrder: () => Order;
  resetOrder: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    selectedShow: null,
    deliveryMode: null,
    seatNumber: "",
    cart: [],
    currentOrder: null,
    phone: "",
  });

  const selectShow = useCallback((show: Show) => {
    setState((s) => ({ ...s, selectedShow: show }));
  }, []);

  const setDeliveryMode = useCallback((mode: "seat" | "counter") => {
    setState((s) => ({ ...s, deliveryMode: mode }));
  }, []);

  const setSeatNumber = useCallback((seat: string) => {
    setState((s) => ({ ...s, seatNumber: seat }));
  }, []);

  const setPhone = useCallback((phone: string) => {
    setState((s) => ({ ...s, phone: phone }));
  }, []);

  const addToCart = useCallback((item: MenuItem) => {
    setState((s) => {
      const existing = s.cart.find((c) => c.id === item.id);
      if (existing) {
        return {
          ...s,
          cart: s.cart.map((c) =>
            c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
          ),
        };
      }
      return { ...s, cart: [...s.cart, { ...item, quantity: 1 }] };
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setState((s) => ({ ...s, cart: s.cart.filter((c) => c.id !== itemId) }));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setState((s) => ({ ...s, cart: s.cart.filter((c) => c.id !== itemId) }));
    } else {
      setState((s) => ({
        ...s,
        cart: s.cart.map((c) => (c.id === itemId ? { ...c, quantity } : c)),
      }));
    }
  }, []);

  const clearCart = useCallback(() => {
    setState((s) => ({ ...s, cart: [] }));
  }, []);

  const cartTotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  const placeOrder = useCallback((): Order => {
    const order: Order = {
      id: crypto.randomUUID(),
      orderCode: generateOrderCode(),
      show: state.selectedShow!,
      items: [...state.cart],
      deliveryMode: state.deliveryMode!,
      seatNumber: state.seatNumber || undefined,
      status: "received",
      total: state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      createdAt: new Date().toISOString(),
      estimatedDelivery: "8-12 mins",
    };
    setState((s) => ({ ...s, currentOrder: order, cart: [] }));
    return order;
  }, [state]);

  const resetOrder = useCallback(() => {
    setState({
      selectedShow: null,
      deliveryMode: null,
      seatNumber: "",
      cart: [],
      currentOrder: null,
      phone: "",
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        selectShow,
        setDeliveryMode,
        setSeatNumber,
        setPhone,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        placeOrder,
        resetOrder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
