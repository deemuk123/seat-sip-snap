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
    let text = "";
    let chatId = "";

    try {
      const body = await req.json();
      text = body.text || "";
      chatId = body.chatId || "";
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing 'text' in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawApiUrl = Deno.env.get("WAHA_API_URL") || "https://devlikeaprowaha-production-4380.up.railway.app";
    const apiUrl = rawApiUrl.replace(/\/+$/, "");
    const apiKey = Deno.env.get("WAHA_API_KEY");
    const defaultChatId = "120363422396487980@g.us";
    const envChatId = Deno.env.get("WAHA_CHAT_ID");
    const targetChatId = chatId || (envChatId && envChatId !== "default" ? envChatId : defaultChatId);

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "WAHA_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endpoint = `${apiUrl}/api/sendText`;
    console.log("Sending to WAHA:", { endpoint, targetChatId, textLength: text.length });

    const response = await fetch(endpoint, {
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
        linkPreview: false,
        linkPreviewHighQuality: false,
        session: "default",
      }),
    });

    const responseText = await response.text();
    console.log("WAHA response status:", response.status, "body:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { rawResponse: responseText };
    }

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "WhatsApp API error", status: response.status, details: data }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
