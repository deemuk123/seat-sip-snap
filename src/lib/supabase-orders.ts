import { supabase } from "@/integrations/supabase/client";
import { generateOrderCode } from "@/data/mockData";
import type { Show, CartItem, Order, ScratchReward } from "@/data/mockData";
import { notifyNewOrder } from "@/lib/whatsapp-notify";
import { fetchSetting } from "@/lib/supabase-admin";

async function assignScratchTier(): Promise<ScratchReward | null> {
  try {
    const configVal = await fetchSetting("scratch_card_config");
    const isEnabled = configVal?.enabled ?? false;
    if (!isEnabled) return null;

    const tryAgainWeight = configVal?.try_again_weight ?? 20;

    // Fetch all active prizes
    const { data: allPrizes } = await supabase
      .from("scratch_prizes")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!allPrizes || allPrizes.length === 0) {
      return { tier: "none", discountValue: 0 };
    }

    // Filter to prizes with available stock
    const available = allPrizes.filter(
      (p: any) => p.max_quantity === 0 || p.used_count < p.max_quantity
    );

    if (available.length === 0) {
      return { tier: "none", discountValue: 0 };
    }

    // Total weight = all prize weights + try again weight
    const prizeWeight = available.reduce((s: number, p: any) => s + (p.probability_weight || 1), 0);
    const grandTotal = prizeWeight + tryAgainWeight;

    // Roll
    const roll = Math.random() * grandTotal;

    // If roll lands in the "try again" zone
    if (roll >= prizeWeight) {
      return { tier: "none", discountValue: 0 };
    }

    // Otherwise pick a prize
    let cumulative = 0;
    let selectedPrize: any = null;

    for (const prize of available) {
      cumulative += prize.probability_weight || 1;
      if (roll < cumulative) {
        selectedPrize = prize;
        break;
      }
    }

    if (!selectedPrize) {
      selectedPrize = available[available.length - 1];
    }

    // Increment used_count
    await supabase
      .from("scratch_prizes")
      .update({ used_count: selectedPrize.used_count + 1 })
      .eq("id", selectedPrize.id);

    return { tier: selectedPrize.tier, discountValue: selectedPrize.discount_value };
  } catch (err) {
    console.error("Scratch tier assignment failed:", err);
    return null;
  }
}

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

  // Assign scratch card reward
  let scratchReward: ScratchReward | null = null;
  try {
    scratchReward = await assignScratchTier();
    if (scratchReward) {
      await supabase.from("scratch_rewards").insert({
        order_id: orderRow.id,
        tier: scratchReward.tier,
        discount_value: scratchReward.discountValue,
        discount_type: "percentage",
      });
    }
  } catch (err) {
    console.error("Scratch reward insert failed:", err);
  }

  // Send WhatsApp notification (fire and forget)
  notifyNewOrder({
    orderCode,
    total: params.total,
    items: params.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
    deliveryMode: params.deliveryMode,
    seatNumber: params.seatNumber,
    phone: params.phone,
    movieName: params.show.movieName,
    showTime: params.show.showTime,
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
    scratchReward: scratchReward || undefined,
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
