import { Clock, MapPin, Phone, Package, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DBOrder, OrderStatus } from "@/lib/supabase-manager";
import { useState } from "react";

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  received: { label: "Received", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  preparing: { label: "Preparing", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  "out-for-delivery": { label: "Out for Delivery", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  delivered: { label: "Delivered", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  cancelled: { label: "Cancelled", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const SLA_WARN_MINS = 10;

interface OrderCardProps {
  order: DBOrder;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onVerifyDeliver: (orderId: string) => void;
  onCancel: (orderId: string) => void;
}

export default function OrderCard({ order, onStatusChange, onVerifyDeliver, onCancel }: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[order.status];
  const isTerminal = order.status === "delivered" || order.status === "cancelled";
  const timeAgo = getTimeAgo(order.created_at);
  const pendingMins = getPendingMins(order.created_at);
  const isOverdue = !isTerminal && pendingMins >= SLA_WARN_MINS;

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 transition-colors ${
        isOverdue
          ? "bg-destructive/10 border-destructive/50 ring-1 ring-destructive/30"
          : "bg-card border-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-foreground text-lg">Order #{order.id.slice(0, 6).toUpperCase()}</span>
            <Badge variant="outline" className={config.className}>{config.label}</Badge>
            {isOverdue && (
              <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/40 text-[10px] animate-pulse">
                <AlertTriangle className="w-3 h-3 mr-1" />{pendingMins}m
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {timeAgo}
          </p>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground p-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Quick info */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {order.delivery_mode === "seat" && order.seat_number && (
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Seat {order.seat_number}</span>
        )}
        {order.delivery_mode === "counter" && (
          <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Counter Pickup</span>
        )}
        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {order.phone}</span>
        <span className="font-medium text-primary">₹{order.total}</span>
      </div>

      {/* Items */}
      {expanded && (
        <div className="border-t border-border pt-3 space-y-1.5">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-foreground">{item.quantity}× {item.name}</span>
              <span className="text-muted-foreground">₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border">
            <span className="text-foreground">Total</span>
            <span className="text-primary">₹{order.total}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      {!isTerminal && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => onVerifyDeliver(order.id)} className="flex-1">
            Verify & Deliver
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onCancel(order.id)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getPendingMins(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}
