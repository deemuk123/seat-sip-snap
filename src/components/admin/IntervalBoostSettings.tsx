import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Zap, Save } from "lucide-react";
import { fetchSetting, upsertSetting } from "@/lib/supabase-admin";
import { toast } from "sonner";

export default function IntervalBoostSettings() {
  const [config, setConfig] = useState({
    enabled: false,
    message: "Order during interval and get a special discount!",
    discount_percentage: 10,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSetting("interval_boost")
      .then((val) => {
        if (val) setConfig((prev) => ({ ...prev, ...val }));
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertSetting("interval_boost", config);
      toast.success("Interval boost settings saved");
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4" /> Interval Boost Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Enable Boost</Label>
            <p className="text-xs text-muted-foreground">Show banner to customers during interval</p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(v) => setConfig((p) => ({ ...p, enabled: v }))}
          />
        </div>
        <div>
          <Label className="text-xs">Banner Message</Label>
          <Input
            value={config.message}
            onChange={(e) => setConfig((p) => ({ ...p, message: e.target.value }))}
            placeholder="Special interval offer!"
          />
        </div>
        <div>
          <Label className="text-xs">Discount (%)</Label>
          <Input
            type="number"
            value={config.discount_percentage}
            onChange={(e) =>
              setConfig((p) => ({ ...p, discount_percentage: Number(e.target.value) }))
            }
          />
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="w-full">
          <Save className="w-3.5 h-3.5 mr-1" />
          {saving ? "Saving…" : "Save Boost Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
