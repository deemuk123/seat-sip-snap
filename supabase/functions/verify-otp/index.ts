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
    const { phone, otp } = await req.json()

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ verified: false, error: 'Phone and OTP required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Find the most recent OTP for this phone (verified or not),
    // so a successful verify can be retried within the 60s validity window
    // if the subsequent order placement failed for any reason.
    const { data: record, error: fetchError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (!record) {
      return new Response(
        JSON.stringify({ verified: false, error: 'No OTP found. Please request a new one.', code: 'no_otp' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (new Date(record.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ verified: false, error: 'OTP expired. Please request a new one.', code: 'expired', expires_at: record.expires_at }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (record.attempts >= 3) {
      return new Response(
        JSON.stringify({ verified: false, error: 'Maximum attempts exceeded. Please request a new OTP.', code: 'locked', attempts_remaining: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (record.otp_code !== otp) {
      const newAttempts = record.attempts + 1
      await supabase
        .from('otp_verifications')
        .update({ attempts: newAttempts })
        .eq('id', record.id)

      const remaining = Math.max(0, 3 - newAttempts)
      const locked = remaining === 0
      return new Response(
        JSON.stringify({
          verified: false,
          code: locked ? 'locked' : 'wrong_otp',
          attempts_remaining: remaining,
          error: locked
            ? 'Maximum attempts exceeded. Please request a new OTP.'
            : `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark as verified
    await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', record.id)

    // Audit log for OTP verification
    await supabase.from('audit_logs').insert({
      actor_id: '00000000-0000-0000-0000-000000000000',
      action: 'otp_verified',
      target_type: 'customer',
      target_id: phone,
      details: { phone },
    })

    return new Response(
      JSON.stringify({ success: true, verified: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Verify OTP error:', error)
    return new Response(
      JSON.stringify({ verified: false, error: error instanceof Error ? error.message : 'Verification failed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
