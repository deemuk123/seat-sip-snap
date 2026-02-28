import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<boolean>;
}

export default function VerifyDeliverDialog({ open, onClose, onVerify }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(false);
    const ok = await onVerify(code.trim());
    setLoading(false);
    if (ok) {
      setCode("");
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { setCode(""); setError(false); onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Verify Delivery Code
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Enter the customer's 4-character order code to confirm delivery.</p>
        <Input
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(false); }}
          placeholder="e.g. AB3K"
          maxLength={4}
          className="text-center text-2xl tracking-[0.3em] font-mono"
        />
        {error && <p className="text-destructive text-sm text-center">Code doesn't match. Try again.</p>}
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={code.length < 4 || loading} className="w-full">
            {loading ? "Verifying…" : "Confirm Delivery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
