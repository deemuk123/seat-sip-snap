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

// ---- Audit logging helper ----
export async function logAudit(params: {
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  const actorId = user?.id || "00000000-0000-0000-0000-000000000000";

  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId || null,
    details: params.details || {},
  });
}

// ---- Orders ----
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

  // Audit log for cancellations and confirmations
  if (newStatus === "cancelled" || newStatus === "delivered") {
    await logAudit({
      action: newStatus === "cancelled" ? "order_cancelled" : "order_delivered",
      targetType: "order",
      targetId: orderId,
      details: { status: newStatus, reason: reason || null },
    });
  }
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

// ---- Menu management ----
export async function updateMenuItem(
  id: string,
  updates: { name?: string; price?: number; description?: string; category?: string; available?: boolean; image_url?: string }
) {
  const { error } = await supabase.from("menu_items").update(updates).eq("id", id);
  if (error) throw error;

  await logAudit({
    action: "menu_item_updated",
    targetType: "menu_item",
    targetId: id,
    details: updates,
  });
}

export async function createMenuItem(item: {
  name: string;
  price: number;
  description?: string;
  category: string;
  image_url?: string;
  available?: boolean;
}) {
  const { data, error } = await supabase.from("menu_items").insert(item).select().single();
  if (error) throw error;

  await logAudit({
    action: "menu_item_created",
    targetType: "menu_item",
    targetId: data?.id,
    details: { name: item.name, price: item.price, category: item.category },
  });
}

export async function deleteMenuItem(id: string) {
  // Fetch name before deleting for audit
  const { data: item } = await supabase.from("menu_items").select("name").eq("id", id).single();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) throw error;

  await logAudit({
    action: "menu_item_deleted",
    targetType: "menu_item",
    targetId: id,
    details: { name: item?.name || "unknown" },
  });
}

// ---- Daily summaries ----
export async function fetchDailySummaries(limit = 30) {
  const { data, error } = await supabase
    .from("daily_summaries")
    .select("*")
    .order("summary_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
