import { supabase } from "@/integrations/supabase/client";
import { generateOrderCode } from "@/data/mockData";
import type { Show, CartItem, Order, ScratchReward } from "@/data/mockData";
import { notifyNewOrder } from "@/lib/whatsapp-notify";
import { fetchSetting } from "@/lib/supabase-admin";

interface ScratchCardConfig {
  enabled: boolean;
  gold_prob: number;
  silver_prob: number;
  bronze_prob: number;
  gold_discount: number;
  silver_discount: number;
  bronze_discount: number;
  gold_max: number;
  silver_max: number;
  bronze_max: number;
}

const DEFAULT_SCRATCH_CONFIG: ScratchCardConfig = {
  enabled: false,
  gold_prob: 10,
  silver_prob: 30,
  bronze_prob: 60,
  gold_discount: 30,
  silver_discount: 15,
  bronze_discount: 5,
  gold_max: 0,
  silver_max: 0,
  bronze_max: 0,
};

async function assignScratchTier(): Promise<ScratchReward | null> {
  try {
    const configVal = await fetchSetting("scratch_card_config");
    const config: ScratchCardConfig = configVal
      ? { ...DEFAULT_SCRATCH_CONFIG, ...configVal }
      : DEFAULT_SCRATCH_CONFIG;

    if (!config.enabled) return null;

    // Check current tier counts against max caps
    const { data: counts } = await supabase
      .from("scratch_rewards")
      .select("tier");

    const tierCounts = { gold: 0, silver: 0, bronze: 0 };
    (counts || []).forEach((r: any) => {
      if (r.tier in tierCounts) tierCounts[r.tier as keyof typeof tierCounts]++;
    });

    // Build available tiers with probabilities
    let availableTiers: { tier: "gold" | "silver" | "bronze"; prob: number }[] = [];

    if (config.gold_max === 0 || tierCounts.gold < config.gold_max) {
      availableTiers.push({ tier: "gold", prob: config.gold_prob });
    }
    if (config.silver_max === 0 || tierCounts.silver < config.silver_max) {
      availableTiers.push({ tier: "silver", prob: config.silver_prob });
    }
    if (config.bronze_max === 0 || tierCounts.bronze < config.bronze_max) {
      availableTiers.push({ tier: "bronze", prob: config.bronze_prob });
    }

    const roll = Math.random() * 100;
    let cumulative = 0;
    let selectedTier: "gold" | "silver" | "bronze" | "none" = "none";

    for (const t of availableTiers) {
      cumulative += t.prob;
      if (roll < cumulative) {
        selectedTier = t.tier;
        break;
      }
    }

    if (selectedTier === "none") {
      return { tier: "none", discountValue: 0 };
    }

    // Sequential prize selection from scratch_prizes table
    const { data: prizes } = await supabase
      .from("scratch_prizes")
      .select("*")
      .eq("tier", selectedTier)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!prizes || prizes.length === 0) {
      // Fallback to config discount if no prizes configured
      const fallbackDiscount =
        selectedTier === "gold" ? config.gold_discount :
        selectedTier === "silver" ? config.silver_discount :
        config.bronze_discount;
      return { tier: selectedTier, discountValue: fallbackDiscount };
    }

    // Pick the first prize that still has stock
    for (const prize of prizes) {
      if (prize.max_quantity === 0 || prize.used_count < prize.max_quantity) {
        // Increment used_count
        await supabase
          .from("scratch_prizes")
          .update({ used_count: prize.used_count + 1 })
          .eq("id", prize.id);

        return { tier: selectedTier, discountValue: prize.discount_value };
      }
    }

    // All prizes for this tier exhausted → "Try Again"
    return { tier: "none", discountValue: 0 };
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
