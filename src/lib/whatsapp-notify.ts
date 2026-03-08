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
  itemCount: number;
  deliveryMode: "seat" | "counter";
  seatNumber?: string;
  phone: string;
  movieName?: string;
}) {
  const delivery =
    params.deliveryMode === "seat"
      ? `🪑 Seat: ${params.seatNumber || "N/A"}`
      : "🏪 Counter Pickup";

  const text = [
    `🆕 *New Order Received!*`,
    ``,
    `📋 Order: *${params.orderCode}*`,
    `🎬 Movie: ${params.movieName || "N/A"}`,
    `📞 Phone: ${params.phone}`,
    `${delivery}`,
    `🛒 Items: ${params.itemCount}`,
    `💰 Total: ₹${params.total.toFixed(2)}`,
  ].join("\n");

  // Fire and forget
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
