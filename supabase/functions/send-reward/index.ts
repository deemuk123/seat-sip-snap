import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateCouponCode(tier: string): string {
  const prefix = tier.toUpperCase();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch scratch reward for this order
    const { data: reward, error: rewardErr } = await supabase
      .from("scratch_rewards")
      .select("*")
      .eq("order_id", order_id)
      .maybeSingle();

    if (rewardErr) throw rewardErr;
    if (!reward) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_reward" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if tier is "none" (try again) or already sent
    if (reward.tier === "none" || reward.sent) {
      return new Response(JSON.stringify({ skipped: true, reason: reward.tier === "none" ? "try_again" : "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate unique coupon code
    const couponCode = generateCouponCode(reward.tier);

    // Insert coupon into coupons table (single use, 7-day expiry)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: coupon, error: couponErr } = await supabase
      .from("coupons")
      .insert({
        code: couponCode,
        discount_type: reward.discount_type || "percentage",
        discount_value: reward.discount_value,
        max_uses: 1,
        expires_at: expiresAt,
        is_active: true,
      })
      .select()
      .single();

    if (couponErr) throw couponErr;

    // Update scratch_rewards with coupon info
    await supabase
      .from("scratch_rewards")
      .update({
        coupon_code: couponCode,
        coupon_id: coupon.id,
        sent: true,
      })
      .eq("id", reward.id);

    // Fetch order phone number for WhatsApp
    const { data: order } = await supabase
      .from("orders")
      .select("phone, order_code, show_snapshot")
      .eq("id", order_id)
      .single();

    if (order?.phone) {
      // Send WhatsApp notification with coupon
      const tierEmoji = reward.tier === "gold" ? "🥇" : reward.tier === "silver" ? "🥈" : "🥉";
      const snapshot = order.show_snapshot as any;
      const movieName = snapshot?.movieName || snapshot?.movie_name || "your movie";

      const message =
        `🎉 *Congratulations!* ${tierEmoji}\n\n` +
        `Your ${reward.tier.toUpperCase()} scratch card reward for order *${order.order_code}* (${movieName}) is here!\n\n` +
        `🎟️ *Coupon Code:* \`${couponCode}\`\n` +
        `💰 *Discount:* ${reward.discount_value}% OFF your next order\n` +
        `⏰ *Valid for:* 7 days\n\n` +
        `Use this code at checkout on your next visit. Enjoy! 🍿`;

      try {
        const wahaApiUrl = (Deno.env.get("WAHA_API_URL") || "").replace(/\/+$/, "");
        const wahaApiKey = Deno.env.get("WAHA_API_KEY") || "";

        // Send to customer directly
        const phone = order.phone.startsWith("+91") ? order.phone.slice(3) : order.phone;
        const chatId = `91${phone}@c.us`;

        await fetch(`${wahaApiUrl}/api/sendText`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${wahaApiKey}`,
          },
          body: JSON.stringify({
            session: "default",
            chatId,
            text: message,
            linkPreview: false,
          }),
        });
      } catch (whatsappErr) {
        console.error("WhatsApp send failed:", whatsappErr);
        // Non-blocking - coupon is still generated
      }
    }

    return new Response(
      JSON.stringify({ success: true, coupon_code: couponCode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-reward error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
