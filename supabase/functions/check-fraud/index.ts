import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ORDERS_PER_PHONE_PER_SHOW = 3;
const MAX_ORDERS_PER_SEAT_PER_SHOW = 2;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { phone, show_id, seat_number } = await req.json();

    if (!phone || !show_id) {
      return new Response(
        JSON.stringify({ allowed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check orders per phone per show
    const { count: phoneCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .eq("show_id", show_id)
      .neq("status", "cancelled");

    if ((phoneCount || 0) >= MAX_ORDERS_PER_PHONE_PER_SHOW) {
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: `Maximum ${MAX_ORDERS_PER_PHONE_PER_SHOW} orders per show for this phone number`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check orders per seat per show
    if (seat_number) {
      const { count: seatCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("seat_number", seat_number)
        .eq("show_id", show_id)
        .neq("status", "cancelled");

      if ((seatCount || 0) >= MAX_ORDERS_PER_SEAT_PER_SHOW) {
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: `Maximum ${MAX_ORDERS_PER_SEAT_PER_SHOW} orders per seat for this show`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ allowed: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    // On error, allow the order (fail open)
    return new Response(
      JSON.stringify({ allowed: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
