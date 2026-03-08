import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface ShowSegments {
  before: { start: string; end: string; duration_min: number }
  part1: { start: string; end: string; duration_min: number }
  interval: { start: string; end: string; duration_min: number }
  part2: { start: string; end: string; duration_min: number }
  exit: { start: string; end: string; duration_min: number }
}

interface ApiShow {
  audi_name: string
  movie_name: string
  show_time: string
  status: 'completed' | 'running' | 'upcoming'
  segments: ShowSegments
  total_duration_min: number
}

interface ApiResponse {
  date: string
  schedule: ApiShow[]
  timestamp: string
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
        JSON.stringify({ error: 'API URL not configured.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Fetching shows from: ${settings.api_url}`)

    let apiResponse: ApiResponse
    try {
      const response = await fetch(settings.api_url)
      if (!response.ok) throw new Error(`API returned HTTP ${response.status}`)
      apiResponse = await response.json()
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

    const allShows = apiResponse.schedule || []
    const apiDate = apiResponse.date || new Date().toISOString().slice(0, 10)

    console.log(`Fetched ${allShows.length} shows for date ${apiDate}`)

    // Delete existing shows for this date, then insert fresh
    // Nullify FK references first
    await supabase
      .from('orders')
      .update({ show_id: null })
      .not('show_id', 'is', null)

    const { error: deleteError } = await supabase
      .from('shows')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000')

    if (deleteError) {
      console.error('Failed to delete old shows:', deleteError.message)
    }

    function extractScreenNumber(audiName: string): number {
      const match = audiName.match(/(\d+)/)
      return match ? parseInt(match[1], 10) : 1
    }

    const seen = new Set<string>()
    const showRows = allShows
      .filter((show) => {
        const key = `${show.movie_name}|${show.show_time}|${show.audi_name}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((show) => ({
        external_id: `${show.movie_name}-${show.audi_name}-${show.show_time}`,
        movie_name: show.movie_name,
        show_time: `${apiDate} ${show.show_time}`,
        screen_number: extractScreenNumber(show.audi_name),
        language: '',
        format: '',
        is_active: true,
        status: show.status === 'completed' ? 'completed' : show.status,
        interval_start: show.segments?.interval?.start || null,
        interval_end: show.segments?.interval?.end || null,
        total_duration_min: show.total_duration_min || null,
      }))

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

    await supabase
      .from('api_settings')
      .update({ last_sync_at: new Date().toISOString(), last_sync_status: 'success' })
      .eq('id', settings.id)

    console.log(`Sync completed: ${processed} shows inserted (${allShows.filter(s => s.status === 'running').length} running, ${allShows.filter(s => s.status === 'upcoming').length} upcoming, ${allShows.filter(s => s.status === 'completed').length} completed)`)

    return new Response(
      JSON.stringify({ success: true, processed, date: apiDate }),
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
