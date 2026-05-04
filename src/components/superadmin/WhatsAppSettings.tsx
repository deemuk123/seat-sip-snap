import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, CheckCircle2, XCircle, Loader2, Save, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WahaConfig {
  api_url: string;
  api_key: string;
  default_chat_id: string;
}

const DEFAULTS: WahaConfig = {
  api_url: "https://devlikeaprowaha-production-4380.up.railway.app",
  api_key: "",
  default_chat_id: "120363422396487980@g.us",
};

export default function WhatsAppSettings() {
  const [config, setConfig] = useState<WahaConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [testMessage, setTestMessage] = useState("🎬 Test message from Cinema F&B System!");
  const [customChatId, setCustomChatId] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "waha_config")
        .maybeSingle();
      if (data?.value) {
        const v = data.value as Partial<WahaConfig>;
        setConfig({
          api_url: v.api_url || DEFAULTS.api_url,
          api_key: v.api_key || "",
          default_chat_id: v.default_chat_id || DEFAULTS.default_chat_id,
        });
      }
      setLoading(false);
    })();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const trimmed: WahaConfig = {
        api_url: config.api_url.trim().replace(/\/+$/, ""),
        api_key: config.api_key.trim(),
        default_chat_id: config.default_chat_id.trim(),
      };
      const { error } = await supabase
        .from("settings")
        .upsert({ key: "waha_config", value: trimmed as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
      setConfig(trimmed);
      toast.success("WhatsApp settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
    setSaving(false);
  };

  const handleTestSend = async () => {
    if (!testMessage.trim()) return;
    setSending(true);
    setLastResult(null);
    try {
      const body: any = { text: testMessage };
      if (customChatId.trim()) body.chatId = customChatId.trim();

      const { data, error } = await supabase.functions.invoke("send-whatsapp", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setLastResult({ success: true, message: "Message sent successfully!" });
      toast.success("WhatsApp message sent");
    } catch (err: any) {
      setLastResult({ success: false, message: err.message || "Failed to send" });
      toast.error("Failed to send WhatsApp message");
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-500" /> WhatsApp API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            These values override the backend secrets. Saved to your project's settings and used by all WhatsApp notifications (OTP, orders, rewards, daily summaries).
          </p>

          <div>
            <Label className="text-xs">WAHA API URL</Label>
            <Input
              value={config.api_url}
              onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
              placeholder="https://your-waha-host.example.com"
              disabled={loading}
              className="text-xs"
            />
          </div>

          <div>
            <Label className="text-xs">WAHA API Key</Label>
            <div className="flex gap-2">
              <Input
                type={showKey ? "text" : "password"}
                value={config.api_key}
                onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                placeholder="Enter API key"
                disabled={loading}
                className="text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs">Default Chat ID</Label>
            <Input
              value={config.default_chat_id}
              onChange={(e) => setConfig({ ...config, default_chat_id: e.target.value })}
              placeholder="120363422396487980@g.us"
              disabled={loading}
              className="text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Group/chat used for notifications when no recipient is specified.
            </p>
          </div>

          <Button onClick={handleSaveConfig} disabled={saving || loading} size="sm" className="w-full">
            {saving ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving…</>
            ) : (
              <><Save className="w-3.5 h-3.5 mr-1.5" /> Save Configuration</>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="w-4 h-4" /> Test Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Chat ID (optional, uses default if empty)</Label>
            <Input
              value={customChatId}
              onChange={e => setCustomChatId(e.target.value)}
              placeholder="120363422396487980@g.us"
              className="text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Message</Label>
            <Textarea
              value={testMessage}
              onChange={e => setTestMessage(e.target.value)}
              placeholder="Type a test message..."
              rows={3}
              className="text-xs"
            />
          </div>

          <Button onClick={handleTestSend} disabled={sending || !testMessage.trim()} className="w-full" size="sm">
            {sending ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Sending…</>
            ) : (
              <><Send className="w-3.5 h-3.5 mr-1.5" /> Send Test Message</>
            )}
          </Button>

          {lastResult && (
            <div className={`flex items-center gap-2 rounded-lg p-3 text-xs ${
              lastResult.success ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
            }`}>
              {lastResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {lastResult.message}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Notification Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>WhatsApp notifications can be triggered for:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>OTP verification during checkout</li>
              <li>New order received</li>
              <li>Order becomes overdue (SLA breach)</li>
              <li>Order cancelled</li>
              <li>Daily summary reports</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
