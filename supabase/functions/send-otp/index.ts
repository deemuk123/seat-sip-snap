import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Format a local 10-digit phone number to WAHA chatId.
// Defaults to Nepal (+977) prefix for this project.
function toWhatsAppChatId(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  // If user already entered country code (e.g. 977XXXXXXXXXX), keep it; otherwise prepend 977.
  const withCountry = digits.length > 10 ? digits : `977${digits}`
  return `${withCountry}@c.us`
}

interface OrderContext {
  movieName?: string
  showTime?: string
  deliveryMode?: 'seat' | 'counter'
  seatNumber?: string
  items?: { name: string; quantity: number; price: number }[]
  total?: number
}

function buildOtpMessage(otp: string, ctx?: OrderContext): string {
  const lines: string[] = []
  // OTP on top
  lines.push(`🔐 *OTP: ${otp}*`)
  lines.push(`Valid for 3 minutes. Do not share this code.`)

  // Order details on bottom (only if provided)
  if (ctx && (ctx.items?.length || ctx.total != null || ctx.movieName)) {
    lines.push('')
    lines.push('━━━━━━━━━━━━━━━━━━')
    lines.push('🧾 *Order Summary*')
    if (ctx.movieName) lines.push(`🎬 ${ctx.movieName}${ctx.showTime ? ` · ${ctx.showTime}` : ''}`)
    if (ctx.deliveryMode === 'seat' && ctx.seatNumber) {
      lines.push(`🪑 Seat Delivery — ${ctx.seatNumber}`)
    } else if (ctx.deliveryMode === 'counter') {
      lines.push(`🏪 Counter Pickup`)
    }
    if (ctx.items?.length) {
      lines.push('')
      for (const i of ctx.items) {
        lines.push(`• ${i.name} x${i.quantity} — ₹${(i.price * i.quantity).toFixed(2)}`)
      }
    }
    if (ctx.total != null) {
      lines.push('')
      lines.push(`💰 *Total: ₹${ctx.total.toFixed(2)}*`)
    }
  }

  return lines.join('\n')
}

async function sendWhatsAppOtp(phone: string, otp: string, ctx?: OrderContext): Promise<{ ok: boolean; error?: string }> {
  const rawApiUrl = Deno.env.get('WAHA_API_URL') || ''
  const apiUrl = rawApiUrl.replace(/\/+$/, '')
  const apiKey = Deno.env.get('WAHA_API_KEY')

  if (!apiUrl || !apiKey) {
    return { ok: false, error: 'WAHA not configured' }
  }

  const chatId = toWhatsAppChatId(phone)
  const text = buildOtpMessage(otp, ctx)

  try {
    const resp = await fetch(`${apiUrl}/api/sendText`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        reply_to: null,
        text,
        linkPreview: false,
        linkPreviewHighQuality: false,
        session: 'default',
      }),
    })

    const body = await resp.text()
    console.log('WAHA OTP response:', resp.status, body)

    if (!resp.ok) {
      return { ok: false, error: `WAHA ${resp.status}: ${body.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    console.error('WAHA send error:', err)
    return { ok: false, error: err instanceof Error ? err.message : 'WAHA request failed' }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { phone, order } = await req.json() as { phone: string; order?: OrderContext }

    if (!phone || phone.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Valid phone number required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Rate limit: 30 seconds between OTP requests
    const thirtySecsAgo = new Date(Date.now() - 30000).toISOString()
    const { data: recent } = await supabase
      .from('otp_verifications')
      .select('id')
      .eq('phone', phone)
      .gte('created_at', thirtySecsAgo)
      .limit(1)

    if (recent && recent.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Please wait 30 seconds before requesting another OTP' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate 6-digit OTP, valid for 180 seconds (3 minutes)
    const otpCode = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 180 * 1000).toISOString()

    const { error: insertError } = await supabase.from('otp_verifications').insert({
      phone,
      otp_code: otpCode,
      expires_at: expiresAt,
    })

    if (insertError) throw insertError

    // Send via WhatsApp (WAHA)
    const sendResult = await sendWhatsAppOtp(phone, otpCode, order)
    if (!sendResult.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to send OTP via WhatsApp. ${sendResult.error || ''}`.trim() }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent via WhatsApp', expires_in: 180, expires_at: expiresAt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Send OTP error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to send OTP' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
