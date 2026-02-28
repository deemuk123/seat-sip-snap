import { useEffect, useState } from "react";
import { fetchSetting, upsertSetting } from "@/lib/supabase-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";

interface SystemConfig {
  seat_delivery_enabled: boolean;
  tax_percentage: number;
  service_charge: number;
  estimated_delivery_min: number;
  estimated_delivery_max: number;
  ordering_window_before_mins: number;
}

const DEFAULT_CONFIG: SystemConfig = {
  seat_delivery_enabled: true,
  tax_percentage: 5,
  service_charge: 10,
  estimated_delivery_min: 8,
  estimated_delivery_max: 12,
  ordering_window_before_mins: 30,
};

export default function SystemSettings() {
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const val = await fetchSetting("system_config");
        if (val) setConfig({ ...DEFAULT_CONFIG, ...val });
      } catch { /* use defaults */ }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertSetting("system_config", config);
      toast.success("Settings saved");
    } catch { toast.error("Failed to save settings"); }
    setSaving(false);
  };

  const update = <K extends keyof SystemConfig>(key: K, value: SystemConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <p className="text-sm text-muted-foreground text-center py-12">Loading settings…</p>;

  return (
    <div className="space-y-4">
      {/* Delivery */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Delivery</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Seat Delivery</Label>
              <p className="text-xs text-muted-foreground">Allow delivery to seats</p>
            </div>
            <Switch checked={config.seat_delivery_enabled} onCheckedChange={v => update("seat_delivery_enabled", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Est. Min (mins)</Label>
              <Input type="number" value={config.estimated_delivery_min} onChange={e => update("estimated_delivery_min", Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Est. Max (mins)</Label>
              <Input type="number" value={config.estimated_delivery_max} onChange={e => update("estimated_delivery_max", Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Pricing & Tax</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Tax (%)</Label>
            <Input type="number" value={config.tax_percentage} onChange={e => update("tax_percentage", Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Service Charge (₹)</Label>
            <Input type="number" value={config.service_charge} onChange={e => update("service_charge", Number(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      {/* Ordering Window */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Ordering Window</CardTitle></CardHeader>
        <CardContent>
          <div>
            <Label className="text-xs">Allow ordering (mins before show)</Label>
            <Input type="number" value={config.ordering_window_before_mins} onChange={e => update("ordering_window_before_mins", Number(e.target.value))} />
            <p className="text-xs text-muted-foreground mt-1">Customers can order up to this many minutes before showtime</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-1.5" />
        {saving ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
}
