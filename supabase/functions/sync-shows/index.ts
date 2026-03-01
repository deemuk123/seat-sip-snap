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

function getTodayDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getTomorrowDate(): string {
  const now = new Date()
  now.setDate(now.getDate() + 1)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

    // Get API settings
    const { data: settings } = await supabase
      .from('api_settings')
      .select('*')
      .limit(1)
      .single()

    if (!settings?.api_url) {
      return new Response(
        JSON.stringify({ error: 'API URL not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const today = getTodayDate()
    const tomorrow = getTomorrowDate()

    // Replace date params in API URL
    const apiUrl = settings.api_url
      .replace(/showDate=[^&]+/, `showDate=${today}`)
      .replace(/end=[^&]+/, `end=${tomorrow}`)

    console.log(`Syncing shows from: ${apiUrl}`)

    let apiData: ApiShow[]
    try {
      const response = await fetch(apiUrl)
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      const jsonResponse = await response.json()
      apiData = Array.isArray(jsonResponse) ? jsonResponse : jsonResponse.data || []
    } catch (fetchError) {
      await supabase
        .from('api_settings')
        .update({ last_sync_at: new Date().toISOString(), last_sync_status: 'error' })
        .eq('id', settings.id)

      return new Response(
        JSON.stringify({ error: fetchError instanceof Error ? fetchError.message : 'API fetch failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean up old shows
    await supabase.from('shows').delete().lt('show_time', today).not('external_id', 'is', null)

    // Extract screen number from ScreenTitle (e.g., "Audi 1" -> 1)
    function extractScreenNumber(screenTitle: string): number {
      const match = screenTitle.match(/(\d+)/)
      return match ? parseInt(match[1], 10) : 1
    }

    // Upsert shows
    let processed = 0
    for (const show of apiData) {
      const showDate = show.ShowDate.split('T')[0]
      const [hours, minutes] = show.StartTime.split(':')
      const normalizedTime = `${hours.padStart(2, '0')}:${(minutes || '0').padStart(2, '0')}`
      const showTimeDisplay = `${showDate} ${normalizedTime}`
      const screenNumber = extractScreenNumber(show.ScreenTitle)
      const externalId = show.ShowID.toString()

      const { data: existing } = await supabase
        .from('shows')
        .select('id')
        .eq('external_id', externalId)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('shows')
          .update({
            movie_name: show.MovieName,
            show_time: showTimeDisplay,
            screen_number: screenNumber,
            is_active: true,
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('shows').insert({
          external_id: externalId,
          movie_name: show.MovieName,
          show_time: showTimeDisplay,
          screen_number: screenNumber,
          language: 'Hindi',
          format: '2D',
          is_active: true,
        })
      }
      processed++
    }

    // Update sync status
    await supabase
      .from('api_settings')
      .update({ last_sync_at: new Date().toISOString(), last_sync_status: 'success' })
      .eq('id', settings.id)

    console.log(`Sync completed: ${processed} shows processed`)

    return new Response(
      JSON.stringify({ success: true, processed }),
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
