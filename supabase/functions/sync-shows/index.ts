import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface ApiShow {
  ShowID: number
  ScreenID: number
  ScreenTitle: string
  MovieID: number
  MovieName: string
  StartTime: string
  Duration: number
  ShowDate: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Get API settings from database (no hardcoded URLs)
    const { data: settings, error: settingsError } = await supabase
      .from('api_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (settingsError) {
      console.error('Failed to read api_settings:', settingsError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to read API settings: ' + settingsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!settings?.api_url) {
      return new Response(
        JSON.stringify({ error: 'API URL not configured. Go to Admin → Settings → Show API Integration to set it.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build API URL with today's date dynamically
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

    // Replace date params in the configured API URL
    const apiUrl = settings.api_url
      .replace(/showDate=[^&]*/i, `showDate=${today}`)
      .replace(/end=[^&]*/i, `end=${tomorrowStr}`)

    console.log(`Fetching shows from: ${apiUrl}`)

    // Fetch from external API
    let apiData: ApiShow[]
    try {
      const response = await fetch(apiUrl)
      if (!response.ok) throw new Error(`API returned HTTP ${response.status}`)
      const jsonResponse = await response.json()
      apiData = Array.isArray(jsonResponse) ? jsonResponse : jsonResponse.data || []
    } catch (fetchError) {
      const errMsg = fetchError instanceof Error ? fetchError.message : 'API fetch failed'
      console.error('API fetch error:', errMsg)
      await supabase
        .from('api_settings')
        .update({ last_sync_at: new Date().toISOString(), last_sync_status: 'error' })
        .eq('id', settings.id)

      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Fetched ${apiData.length} shows from API`)

    // OVERWRITE strategy: Delete ALL existing shows, then insert fresh data
    // First, nullify show_id on orders to avoid FK constraint violations
    const { error: nullifyError } = await supabase
      .from('orders')
      .update({ show_id: null })
      .not('show_id', 'is', null)

    if (nullifyError) {
      console.error('Failed to nullify order show_ids:', nullifyError.message)
    }

    const { error: deleteError } = await supabase
      .from('shows')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000') // match all rows

    if (deleteError) {
      console.error('Failed to delete old shows:', deleteError.message)
    }

    // Extract screen number from ScreenTitle (e.g., "Audi 1" -> 1)
    function extractScreenNumber(screenTitle: string): number {
      const match = screenTitle.match(/(\d+)/)
      return match ? parseInt(match[1], 10) : 1
    }

    // Build rows for batch insert
    const showRows = apiData.map((show) => {
      const showDate = show.ShowDate.split('T')[0]
      const [hours, minutes] = show.StartTime.split(':')
      const normalizedTime = `${hours.padStart(2, '0')}:${(minutes || '0').padStart(2, '0')}`
      return {
        external_id: show.ShowID.toString(),
        movie_name: show.MovieName,
        show_time: `${showDate} ${normalizedTime}`,
        screen_number: extractScreenNumber(show.ScreenTitle),
        language: 'Hindi',
        format: '2D',
        is_active: true,
      }
    })

    // Batch insert in chunks of 100
    let processed = 0
    const BATCH_SIZE = 100
    for (let i = 0; i < showRows.length; i += BATCH_SIZE) {
      const batch = showRows.slice(i, i + BATCH_SIZE)
      const { error: insertError } = await supabase.from('shows').insert(batch)
      if (insertError) {
        console.error(`Batch insert error at offset ${i}:`, insertError.message)
      } else {
        processed += batch.length
      }
    }

    // Update sync status
    await supabase
      .from('api_settings')
      .update({ last_sync_at: new Date().toISOString(), last_sync_status: 'success' })
      .eq('id', settings.id)

    console.log(`Sync completed: ${processed} shows inserted`)

    return new Response(
      JSON.stringify({ success: true, processed, deleted: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
