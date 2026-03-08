import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { IndianRupee, ShoppingCart, XCircle, CheckCircle2, TrendingUp, Loader2 } from "lucide-react";

interface DailySummary {
  summary_date: string;
  total_orders: number;
  confirmed_orders: number;
  confirmed_sales: number;
  cancelled_orders: number;
  cancelled_amount: number;
}

interface ItemStat {
  item_name: string;
  quantity_sold: number;
  revenue: number;
  summary_date: string;
}

export default function DailyReportsDashboard() {
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [topItems, setTopItems] = useState<{ name: string; qty: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch daily summaries
      let summaryQuery = supabase
        .from("daily_summaries")
        .select("*")
        .order("summary_date", { ascending: false })
        .limit(60);

      if (dateFrom) summaryQuery = summaryQuery.gte("summary_date", dateFrom);
      if (dateTo) summaryQuery = summaryQuery.lte("summary_date", dateTo);

      const { data: sData } = await summaryQuery;
      const summaryData = (sData || []) as DailySummary[];
      setSummaries(summaryData);

      // Fetch item stats for same period
      let itemQuery = supabase
        .from("daily_item_stats")
        .select("*")
        .order("quantity_sold", { ascending: false })
        .limit(500);

      if (dateFrom) itemQuery = itemQuery.gte("summary_date", dateFrom);
      if (dateTo) itemQuery = itemQuery.lte("summary_date", dateTo);

      const { data: iData } = await itemQuery;
      const itemData = (iData || []) as ItemStat[];

      // Aggregate items across dates
      const itemMap: Record<string, { qty: number; revenue: number }> = {};
      for (const item of itemData) {
        if (!itemMap[item.item_name]) itemMap[item.item_name] = { qty: 0, revenue: 0 };
        itemMap[item.item_name].qty += item.quantity_sold;
        itemMap[item.item_name].revenue += Number(item.revenue);
      }

      const ranked = Object.entries(itemMap)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.qty - a.qty);

      setTopItems(ranked);
    } catch (e) {
      console.error("Failed to load daily reports", e);
    }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  // Totals
  const totalOrders = summaries.reduce((s, d) => s + d.total_orders, 0);
  const totalConfirmed = summaries.reduce((s, d) => s + d.confirmed_orders, 0);
  const totalSales = summaries.reduce((s, d) => s + Number(d.confirmed_sales), 0);
  const totalCancelled = summaries.reduce((s, d) => s + d.cancelled_orders, 0);
  const totalCancelledAmt = summaries.reduce((s, d) => s + Number(d.cancelled_amount), 0);

  // Chart data (chronological)
  const chartData = [...summaries].reverse().map(d => ({
    date: d.summary_date.slice(5), // MM-DD
    orders: d.total_orders,
    sales: Number(d.confirmed_sales),
    cancelled: d.cancelled_orders,
  }));

  // Top item bar chart (top 10)
  const topItemChart = topItems.slice(0, 10).map(i => ({
    name: i.name.length > 12 ? i.name.slice(0, 12) + "…" : i.name,
    qty: i.qty,
    revenue: i.revenue,
  }));

  return (
    <div className="space-y-5">
      {/* Date filters */}
      <div className="flex gap-3 items-end">
        <div><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" /></div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard icon={<ShoppingCart className="w-4 h-4" />} label="Total Orders" value={String(totalOrders)} />
        <KPICard icon={<CheckCircle2 className="w-4 h-4" />} label="Confirmed" value={String(totalConfirmed)} accent="text-green-500" />
        <KPICard icon={<IndianRupee className="w-4 h-4" />} label="Confirmed Sales" value={`₹${totalSales.toLocaleString()}`} accent="text-green-500" />
        <KPICard icon={<XCircle className="w-4 h-4" />} label="Cancelled" value={String(totalCancelled)} accent="text-destructive" />
        <KPICard icon={<IndianRupee className="w-4 h-4" />} label="Cancelled Amt" value={`₹${totalCancelledAmt.toLocaleString()}`} accent="text-destructive" />
      </div>

      {/* Sales trend line chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Daily Sales Trend</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Sales (₹)" />
                <Line type="monotone" dataKey="orders" stroke="hsl(142,71%,45%)" strokeWidth={2} dot={false} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Selling Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Bar chart */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Items by Quantity</CardTitle></CardHeader>
          <CardContent className="h-64">
            {topItemChart.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No item data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItemChart} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={90} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="qty" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Qty Sold" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Ranked list */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Item Rankings</CardTitle></CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            {topItems.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No item data yet</p>
            ) : (
              <div className="space-y-2">
                {topItems.map((item, i) => (
                  <div key={item.name} className="flex justify-between items-center text-sm">
                    <span className="text-foreground truncate flex-1">
                      <span className="text-muted-foreground mr-2 font-mono text-xs">#{i + 1}</span>
                      {item.name}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="secondary" className="text-xs">{item.qty} sold</Badge>
                      <span className="text-primary font-medium text-sm">₹{item.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily breakdown table */}
      {summaries.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Daily Breakdown</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-2 pr-3">Date</th>
                  <th className="text-right py-2 px-2">Orders</th>
                  <th className="text-right py-2 px-2">Confirmed</th>
                  <th className="text-right py-2 px-2">Sales</th>
                  <th className="text-right py-2 px-2">Cancelled</th>
                  <th className="text-right py-2 pl-2">Cancel Amt</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map(d => (
                  <tr key={d.summary_date} className="border-b border-border/50">
                    <td className="py-2 pr-3 text-foreground font-medium">{d.summary_date}</td>
                    <td className="text-right py-2 px-2 text-foreground">{d.total_orders}</td>
                    <td className="text-right py-2 px-2 text-green-500">{d.confirmed_orders}</td>
                    <td className="text-right py-2 px-2 text-green-500">₹{Number(d.confirmed_sales).toLocaleString()}</td>
                    <td className="text-right py-2 px-2 text-destructive">{d.cancelled_orders}</td>
                    <td className="text-right py-2 pl-2 text-destructive">₹{Number(d.cancelled_amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-primary shrink-0">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-lg font-bold font-display ${accent || "text-foreground"}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
