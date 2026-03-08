import { supabase } from "@/integrations/supabase/client";

function sendWhatsApp(text: string) {
  // Completely fire-and-forget — never throw or reject
  setTimeout(() => {
    supabase.functions.invoke("send-whatsapp", {
      body: { text },
    }).catch(() => {
      // Silently ignore WhatsApp errors
    });
  }, 100);
}

export function notifyNewOrder(params: {
  orderCode: string;
  total: number;
  items: { name: string; quantity: number; price: number }[];
  deliveryMode: "seat" | "counter";
  seatNumber?: string;
  phone: string;
  movieName?: string;
  showTime?: string;
}) {
  const delivery =
    params.deliveryMode === "seat"
      ? `🪑 *Seat Delivery* — ${params.seatNumber || "N/A"}`
      : "🏪 *Counter Pickup*";

  const itemLines = params.items
    .map((i) => `  • ${i.name} x${i.quantity} — ₹${(i.price * i.quantity).toFixed(2)}`)
    .join("\n");

  const text = [
    `🆕 *New Order Received!*`,
    ``,
    `📋 Order ID: *${params.orderCode}*`,
    `🎬 Movie: ${params.movieName || "N/A"}`,
    `🕐 Show Time: ${params.showTime || "N/A"}`,
    `📞 Phone: ${params.phone}`,
    `${delivery}`,
    ``,
    `🛒 *Items:*`,
    itemLines,
    ``,
    `💰 *Total: ₹${params.total.toFixed(2)}*`,
  ].join("\n");

  sendWhatsApp(text);
}

export function notifyOrderCancelled(params: {
  orderCode: string;
  total: number;
  reason?: string;
  movieName?: string;
}) {
  const text = [
    `❌ *Order Cancelled*`,
    ``,
    `📋 Order: *${params.orderCode}*`,
    `🎬 Movie: ${params.movieName || "N/A"}`,
    `💰 Amount: ₹${params.total.toFixed(2)}`,
    params.reason ? `📝 Reason: ${params.reason}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  sendWhatsApp(text);
}
