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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Summarize yesterday (or a given date)
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const targetDate = body.date || yesterday.toISOString().split('T')[0]

    const dayStart = `${targetDate}T00:00:00`
    const dayEnd = `${targetDate}T23:59:59`

    // Fetch all orders for the day
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, status, total')
      .gte('created_at', dayStart)
      .lt('created_at', dayEnd)

    if (error) throw error

    const allOrders = orders || []
    const confirmed = allOrders.filter(o => o.status === 'delivered')
    const cancelled = allOrders.filter(o => o.status === 'cancelled')

    const summary = {
      summary_date: targetDate,
      total_orders: allOrders.length,
      confirmed_orders: confirmed.length,
      confirmed_sales: confirmed.reduce((sum, o) => sum + Number(o.total), 0),
      cancelled_orders: cancelled.length,
      cancelled_amount: cancelled.reduce((sum, o) => sum + Number(o.total), 0),
    }

    // Upsert daily summary
    const { error: upsertError } = await supabase
      .from('daily_summaries')
      .upsert(summary, { onConflict: 'summary_date' })

    if (upsertError) throw upsertError

    // Aggregate item-level stats for the day
    const confirmedIds = confirmed.map(o => o.id)
    if (confirmedIds.length > 0) {
      const { data: items } = await supabase
        .from('order_items')
        .select('name, quantity, price')
        .in('order_id', confirmedIds)

      if (items && items.length > 0) {
        const itemMap: Record<string, { qty: number; revenue: number }> = {}
        for (const item of items) {
          const key = item.name
          if (!itemMap[key]) itemMap[key] = { qty: 0, revenue: 0 }
          itemMap[key].qty += item.quantity
          itemMap[key].revenue += Number(item.price) * item.quantity
        }

        const itemRows = Object.entries(itemMap).map(([name, stats]) => ({
          summary_date: targetDate,
          item_name: name,
          quantity_sold: stats.qty,
          revenue: stats.revenue,
        }))

        const { error: itemError } = await supabase
          .from('daily_item_stats')
          .upsert(itemRows, { onConflict: 'summary_date,item_name' })

        if (itemError) console.error('Item stats upsert error:', itemError.message)
      }
    }

    // Cleanup: delete order_items for orders older than 30 days
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = cutoff.toISOString()

    const { data: oldOrders } = await supabase
      .from('orders')
      .select('id')
      .lt('created_at', cutoffStr)
      .in('status', ['delivered', 'cancelled'])

    if (oldOrders && oldOrders.length > 0) {
      const oldIds = oldOrders.map(o => o.id)
      // Delete order items for old completed/cancelled orders
      const { error: cleanError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', oldIds)

      if (cleanError) {
        console.error('Cleanup error:', cleanError.message)
      } else {
        console.log(`Cleaned up order_items for ${oldIds.length} old orders`)
      }
    }

    // Also clean old audit logs (> 90 days)
    const auditCutoff = new Date()
    auditCutoff.setDate(auditCutoff.getDate() - 90)
    await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', auditCutoff.toISOString())

    console.log(`Daily summary for ${targetDate}: ${JSON.stringify(summary)}`)

    // Send WhatsApp daily summary
    try {
      const wahaApiUrl = (Deno.env.get('WAHA_API_URL') || 'https://devlikeaprowaha-production-4380.up.railway.app').replace(/\/+$/, '')
      const wahaApiKey = Deno.env.get('WAHA_API_KEY')
      const wahaChatId = Deno.env.get('WAHA_CHAT_ID')
      const chatId = (wahaChatId && wahaChatId !== 'default') ? wahaChatId : '120363422396487980@g.us'

      if (wahaApiKey) {
        const whatsappText = [
          `📊 *Daily Summary — ${targetDate}*`,
          ``,
          `📦 Total Orders: ${summary.total_orders}`,
          `✅ Delivered: ${summary.confirmed_orders}`,
          `💰 Revenue: ₹${summary.confirmed_sales.toFixed(2)}`,
          `❌ Cancelled: ${summary.cancelled_orders}`,
          `💸 Cancelled Amount: ₹${summary.cancelled_amount.toFixed(2)}`,
        ].join('\n')

        const waResp = await fetch(`${wahaApiUrl}/api/sendText`, {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'X-Api-Key': wahaApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId,
            reply_to: null,
            text: whatsappText,
            linkPreview: false,
            linkPreviewHighQuality: false,
            session: 'default',
          }),
        })
        const waText = await waResp.text()
        console.log('WhatsApp daily summary sent:', waResp.status, waText.substring(0, 200))
      }
    } catch (waErr) {
      console.error('WhatsApp daily summary error:', waErr)
    }

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Daily summary error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
