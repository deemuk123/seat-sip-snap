import { supabase } from "@/integrations/supabase/client";
import { generateOrderCode } from "@/data/mockData";
import type { Show, CartItem, Order } from "@/data/mockData";

export async function insertOrder(params: {
  show: Show;
  items: CartItem[];
  deliveryMode: "seat" | "counter";
  seatNumber?: string;
  phone: string;
  total: number;
}): Promise<Order> {
  const orderCode = generateOrderCode();

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_code: orderCode,
      show_id: params.show.id,
      show_snapshot: params.show as any,
      delivery_mode: params.deliveryMode,
      seat_number: params.seatNumber || null,
      phone: params.phone,
      status: "received",
      total: params.total,
      estimated_delivery: "8-12 mins",
    })
    .select()
    .single();

  if (orderError) throw orderError;

  const orderItems = params.items.map((item) => ({
    order_id: orderRow.id,
    menu_item_id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) throw itemsError;

  // Log initial status
  await supabase.from("order_status_logs").insert({
    order_id: orderRow.id,
    status: "received",
  });

  return {
    id: orderRow.id,
    orderCode: orderRow.order_code,
    show: params.show,
    items: params.items,
    deliveryMode: params.deliveryMode,
    seatNumber: params.seatNumber,
    phone: params.phone,
    status: "received",
    total: params.total,
    createdAt: orderRow.created_at,
    estimatedDelivery: orderRow.estimated_delivery || "8-12 mins",
  };
}

export async function lookupOrdersByPhone(phone: string): Promise<Order[]> {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("phone", phone)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!orders || orders.length === 0) return [];

  return orders.map((o) => ({
    id: o.id,
    orderCode: o.order_code,
    show: o.show_snapshot as any as Show,
    items: (o.order_items || []).map((item: any) => ({
      id: item.menu_item_id || item.id,
      name: item.name,
      description: "",
      price: item.price,
      category: "",
      imageUrl: "",
      available: true,
      quantity: item.quantity,
    })),
    deliveryMode: o.delivery_mode as "seat" | "counter",
    seatNumber: o.seat_number || undefined,
    phone: o.phone,
    status: o.status as Order["status"],
    total: o.total,
    createdAt: o.created_at,
    estimatedDelivery: o.estimated_delivery || "8-12 mins",
  }));
}

export async function fetchShows() {
  const { data, error } = await supabase
    .from("shows")
    .select("*")
    .eq("is_active", true)
    .order("show_time", { ascending: true });

  if (error) throw error;
  return (data || []).map((s) => ({
    id: s.id,
    movieName: s.movie_name,
    screenNumber: s.screen_number,
    showTime: s.show_time,
    language: s.language,
    format: s.format,
    posterUrl: s.poster_url || "",
    status: (s as any).status || "upcoming",
    intervalStart: (s as any).interval_start || undefined,
    intervalEnd: (s as any).interval_end || undefined,
    totalDurationMin: (s as any).total_duration_min || undefined,
  }));
}

export async function fetchMenuItems() {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("name");

  if (error) throw error;
  return (data || []).map((m: any) => ({
    id: m.id,
    name: m.name,
    description: m.description || "",
    price: m.price,
    category: m.category,
    imageUrl: m.image_url || "",
    available: m.available,
    availableFrom: m.available_from || undefined,
    availableUntil: m.available_until || undefined,
  }));
}
