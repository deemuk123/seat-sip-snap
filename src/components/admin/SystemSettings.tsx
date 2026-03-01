import { useEffect, useState } from "react";
import { fetchSetting, upsertSetting } from "@/lib/supabase-admin";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
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

interface ApiSettings {
  id?: string;
  api_url: string;
  sync_interval_mins: number;
  last_sync_at: string | null;
  last_sync_status: string | null;
}

export default function SystemSettings() {
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Show API state
  const [apiSettings, setApiSettings] = useState<ApiSettings>({
    api_url: "",
    sync_interval_mins: 30,
    last_sync_at: null,
    last_sync_status: null,
  });
  const [savingApi, setSavingApi] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [val, apiRes] = await Promise.all([
          fetchSetting("system_config"),
          (supabase as any).from("api_settings").select("*").limit(1).maybeSingle(),
        ]);
        if (val) setConfig({ ...DEFAULT_CONFIG, ...val });
        if (apiRes.data) {
          setApiSettings(apiRes.data as ApiSettings);
        }
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

  const handleSaveApiSettings = async () => {
    setSavingApi(true);
    try {
      if (apiSettings.id) {
        await (supabase as any)
          .from("api_settings")
          .update({
            api_url: apiSettings.api_url,
            sync_interval_mins: apiSettings.sync_interval_mins,
          })
          .eq("id", apiSettings.id);
      } else {
        const { data } = await (supabase as any)
          .from("api_settings")
          .insert({
            api_url: apiSettings.api_url,
            sync_interval_mins: apiSettings.sync_interval_mins,
          })
          .select()
          .single();
        if (data) setApiSettings(data as ApiSettings);
      }
      toast.success("API settings saved");
    } catch {
      toast.error("Failed to save API settings");
    }
    setSavingApi(false);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-shows");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Synced ${data?.processed || 0} shows`);
      // Refresh api settings to get updated status
      const { data: refreshed } = await (supabase as any)
        .from("api_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (refreshed) setApiSettings(refreshed as unknown as ApiSettings);
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    }
    setSyncing(false);
  };

  if (loading) return <p className="text-sm text-muted-foreground text-center py-12">Loading settings…</p>;

  return (
    <div className="space-y-4">
      {/* Show API */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Show API Integration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">API URL</Label>
            <Input
              value={apiSettings.api_url}
              onChange={e => setApiSettings(prev => ({ ...prev, api_url: e.target.value }))}
              placeholder="https://api.example.com/shows?showDate=..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Sync Interval (mins)</Label>
              <Input
                type="number"
                value={apiSettings.sync_interval_mins}
                onChange={e => setApiSettings(prev => ({ ...prev, sync_interval_mins: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSaveApiSettings} disabled={savingApi} size="sm" variant="outline" className="w-full">
                <Save className="w-3.5 h-3.5 mr-1" />
                {savingApi ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
          {apiSettings.last_sync_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {apiSettings.last_sync_status === "success" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-destructive" />
              )}
              <span>Last sync: {new Date(apiSettings.last_sync_at).toLocaleString()} ({apiSettings.last_sync_status})</span>
            </div>
          )}
          <Button onClick={handleSyncNow} disabled={syncing || !apiSettings.api_url} size="sm" className="w-full">
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync Now"}
          </Button>
        </CardContent>
      </Card>

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
