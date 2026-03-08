import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, chatId } = await req.json();

    const apiUrl = Deno.env.get("WAHA_API_URL") || "https://devlikeaprowaha-production-4380.up.railway.app";
    const apiKey = Deno.env.get("WAHA_API_KEY");
    const targetChatId = chatId || Deno.env.get("WAHA_CHAT_ID") || "120363422396487980@g.us";

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "WAHA_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(`${apiUrl}/api/sendText`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId: targetChatId,
        reply_to: null,
        text,
        linkPreview: true,
        linkPreviewHighQuality: false,
        session: "default",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "WhatsApp API error", details: data }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
