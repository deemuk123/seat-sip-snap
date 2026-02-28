import { supabase } from "@/integrations/supabase/client";

export interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  statusBreakdown: Record<string, number>;
  topItems: { name: string; quantity: number; revenue: number }[];
  ordersByHour: { hour: string; count: number }[];
  revenueByShow: { show: string; revenue: number; orders: number }[];
}

export async function fetchOrderAnalytics(dateFrom?: string, dateTo?: string): Promise<OrderAnalytics> {
  let query = supabase.from("orders").select("*, order_items(*)");
  if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
  if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);

  const { data: orders, error } = await query;
  if (error) throw error;
  const all = orders || [];

  const nonCancelled = all.filter(o => o.status !== "cancelled");

  const totalOrders = nonCancelled.length;
  const totalRevenue = nonCancelled.reduce((s, o) => s + Number(o.total), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Status breakdown
  const statusBreakdown: Record<string, number> = {};
  all.forEach(o => { statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1; });

  // Top items
  const itemMap = new Map<string, { quantity: number; revenue: number }>();
  nonCancelled.forEach(o => {
    (o.order_items as any[] || []).forEach((item: any) => {
      const existing = itemMap.get(item.name) || { quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += item.price * item.quantity;
      itemMap.set(item.name, existing);
    });
  });
  const topItems = Array.from(itemMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  // Orders by hour
  const hourMap = new Map<number, number>();
  nonCancelled.forEach(o => {
    const h = new Date(o.created_at).getHours();
    hourMap.set(h, (hourMap.get(h) || 0) + 1);
  });
  const ordersByHour = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, "0")}:00`,
    count: hourMap.get(i) || 0,
  })).filter(h => h.count > 0 || (h.hour >= "10:00" && h.hour <= "23:00"));

  // Revenue by show
  const showMap = new Map<string, { revenue: number; orders: number }>();
  nonCancelled.forEach(o => {
    const snap = o.show_snapshot as any;
    const name = snap?.movieName || "Unknown";
    const existing = showMap.get(name) || { revenue: 0, orders: 0 };
    existing.revenue += Number(o.total);
    existing.orders += 1;
    showMap.set(name, existing);
  });
  const revenueByShow = Array.from(showMap.entries())
    .map(([show, data]) => ({ show, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  return { totalOrders, totalRevenue, avgOrderValue, statusBreakdown, topItems, ordersByHour, revenueByShow };
}

// Settings helpers
export async function fetchSetting(key: string): Promise<any> {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

export async function upsertSetting(key: string, value: any): Promise<void> {
  const { data: existing } = await supabase.from("settings").select("id").eq("key", key).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("settings").update({ value }).eq("key", key);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("settings").insert({ key, value });
    if (error) throw error;
  }
}
