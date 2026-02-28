import { supabase } from "@/integrations/supabase/client";
import type { Order, Show } from "@/data/mockData";

export type OrderStatus = "received" | "preparing" | "out-for-delivery" | "delivered" | "cancelled";

export interface DBOrder {
  id: string;
  order_code: string;
  show_id: string | null;
  show_snapshot: any;
  delivery_mode: "seat" | "counter";
  seat_number: string | null;
  phone: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  updated_at: string;
  estimated_delivery: string | null;
  order_items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    menu_item_id: string | null;
  }[];
}

export async function fetchAllOrders(filters?: {
  showId?: string;
  status?: OrderStatus;
  date?: string;
}): Promise<DBOrder[]> {
  let query = supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  if (filters?.showId) query = query.eq("show_id", filters.showId);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.date) {
    query = query.gte("created_at", `${filters.date}T00:00:00`).lt("created_at", `${filters.date}T23:59:59`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as DBOrder[];
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  reason?: string
): Promise<void> {
  const { error: orderError } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (orderError) throw orderError;

  const { data: { user } } = await supabase.auth.getUser();

  const { error: logError } = await supabase.from("order_status_logs").insert({
    order_id: orderId,
    status: newStatus,
    changed_by: user?.id || null,
    reason: reason || null,
  });

  if (logError) throw logError;
}

export async function verifyAndDeliverOrder(
  orderId: string,
  enteredCode: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("orders")
    .select("order_code")
    .eq("id", orderId)
    .single();

  if (error) throw error;
  if (data.order_code.toUpperCase() !== enteredCode.toUpperCase()) return false;

  await updateOrderStatus(orderId, "delivered");
  return true;
}

// Menu management
export async function updateMenuItem(
  id: string,
  updates: { name?: string; price?: number; description?: string; category?: string; available?: boolean; image_url?: string }
) {
  const { error } = await supabase.from("menu_items").update(updates).eq("id", id);
  if (error) throw error;
}

export async function createMenuItem(item: {
  name: string;
  price: number;
  description?: string;
  category: string;
  image_url?: string;
  available?: boolean;
}) {
  const { error } = await supabase.from("menu_items").insert(item);
  if (error) throw error;
}

export async function deleteMenuItem(id: string) {
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) throw error;
}
