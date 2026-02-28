import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export default function CancelOrderDialog({ open, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={() => { setReason(""); onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-destructive">Cancel Order</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Please provide a reason for cancellation. This is required.</p>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for cancellation…"
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Go Back</Button>
          <Button variant="destructive" disabled={reason.trim().length < 3} onClick={() => { onConfirm(reason.trim()); setReason(""); }}>
            Confirm Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
