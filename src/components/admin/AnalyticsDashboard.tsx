import { useEffect, useState } from "react";
import { fetchOrderAnalytics, type OrderAnalytics } from "@/lib/supabase-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { IndianRupee, ShoppingCart, TrendingUp, Package } from "lucide-react";
import { toast } from "sonner";

const PIE_COLORS = ["hsl(210,100%,56%)", "hsl(38,92%,50%)", "hsl(280,60%,55%)", "hsl(142,71%,45%)", "hsl(0,72%,51%)"];

export default function AnalyticsDashboard() {
  const [data, setData] = useState<OrderAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setData(await fetchOrderAnalytics(dateFrom || undefined, dateTo || undefined));
    } catch { toast.error("Failed to load analytics"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  if (loading || !data) return <p className="text-sm text-muted-foreground text-center py-12">Loading analytics…</p>;

  const statusData = Object.entries(data.statusBreakdown).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-5">
      {/* Date filters */}
      <div className="flex gap-3 items-end">
        <div><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" /></div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard icon={<ShoppingCart className="w-4 h-4" />} label="Total Orders" value={String(data.totalOrders)} />
        <KPICard icon={<IndianRupee className="w-4 h-4" />} label="Revenue" value={`₹${data.totalRevenue.toLocaleString()}`} />
        <KPICard icon={<TrendingUp className="w-4 h-4" />} label="Avg Order" value={`₹${Math.round(data.avgOrderValue)}`} />
        <KPICard icon={<Package className="w-4 h-4" />} label="Shows" value={String(data.revenueByShow.length)} />
      </div>

      {/* Orders by Hour */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Orders by Hour</CardTitle></CardHeader>
        <CardContent className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.ordersByHour}>
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(240,5%,55%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(240,5%,55%)" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(240,8%,10%)", border: "1px solid hsl(240,6%,18%)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue by Show + Status Pie side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Show</CardTitle></CardHeader>
          <CardContent>
            {data.revenueByShow.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">No data</p> : (
              <div className="space-y-2">
                {data.revenueByShow.map(s => (
                  <div key={s.show} className="flex justify-between items-center text-sm">
                    <span className="text-foreground truncate flex-1">{s.show}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">{s.orders} orders</Badge>
                      <span className="text-primary font-medium">₹{s.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Order Status</CardTitle></CardHeader>
          <CardContent className="h-48 flex items-center justify-center">
            {statusData.length === 0 ? <p className="text-xs text-muted-foreground">No data</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                    {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(240,8%,10%)", border: "1px solid hsl(240,6%,18%)", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Items */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Top Selling Items</CardTitle></CardHeader>
        <CardContent>
          {data.topItems.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">No data</p> : (
            <div className="space-y-2">
              {data.topItems.map((item, i) => (
                <div key={item.name} className="flex justify-between items-center text-sm">
                  <span className="text-foreground"><span className="text-muted-foreground mr-2">#{i + 1}</span>{item.name}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">{item.quantity} sold</span>
                    <span className="text-primary font-medium">₹{item.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-primary shrink-0">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold font-display text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
