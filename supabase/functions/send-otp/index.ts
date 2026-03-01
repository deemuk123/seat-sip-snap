import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { phone } = await req.json()

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

    // Rate limit: check if OTP was sent in last 30 seconds
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

    // Generate 6-digit OTP
    const otpCode = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    // Store OTP
    const { error: insertError } = await supabase.from('otp_verifications').insert({
      phone,
      otp_code: otpCode,
      expires_at: expiresAt,
    })

    if (insertError) throw insertError

    // TODO: When SMS provider is configured, send OTP via SMS here
    // For now, return OTP in response (simulated mode)
    console.log(`OTP for ${phone}: ${otpCode}`)

    return new Response(
      JSON.stringify({ success: true, otp: otpCode, message: 'OTP sent (simulated mode)' }),
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
