import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function WhatsAppSettings() {
  const [testMessage, setTestMessage] = useState("🎬 Test message from Cinema F&B System!");
  const [customChatId, setCustomChatId] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

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
            <MessageCircle className="w-4 h-4 text-green-500" /> WhatsApp Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            WhatsApp notifications are sent via WAHA API. API credentials are stored securely as backend secrets.
          </p>

          <div className="rounded-lg bg-secondary/50 p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">Configured Secrets</p>
            <div className="grid gap-1 text-xs text-muted-foreground">
              <span>• WAHA_API_URL – Base API endpoint</span>
              <span>• WAHA_API_KEY – Authentication key</span>
              <span>• WAHA_CHAT_ID – Default group/chat ID</span>
            </div>
          </div>
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
              <li>New order received</li>
              <li>Order becomes overdue (SLA breach)</li>
              <li>Order cancelled</li>
            </ul>
            <p className="text-[10px] mt-2 text-muted-foreground/70">
              Notifications are sent to the configured default chat/group.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
