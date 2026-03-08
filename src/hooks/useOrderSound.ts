import { useEffect, useRef, useCallback } from "react";

// Generate a simple notification beep using Web Audio API
function playBeep(frequency = 880, duration = 200, volume = 0.3) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.value = volume;
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch {
    // Audio not supported
  }
}

export function playNewOrderSound() {
  // Two-tone ascending beep
  playBeep(660, 150, 0.4);
  setTimeout(() => playBeep(880, 200, 0.4), 180);
}

export function playOverdueSound() {
  // Urgent triple beep
  playBeep(440, 100, 0.5);
  setTimeout(() => playBeep(440, 100, 0.5), 150);
  setTimeout(() => playBeep(440, 200, 0.5), 300);
}

const SLA_WARN_MINS = 10;

interface UseOrderSoundProps {
  orders: { id: string; status: string; created_at: string }[];
  enabled?: boolean;
}

export function useOrderSound({ orders, enabled = true }: UseOrderSoundProps) {
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const prevOverdueIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  const checkSounds = useCallback(() => {
    if (!enabled) return;

    const currentIds = new Set(orders.map(o => o.id));
    const activeOrders = orders.filter(o => o.status !== "delivered" && o.status !== "cancelled");

    // Detect new orders (skip initial load)
    if (!initialLoadRef.current) {
      const newOrders = orders.filter(o => !prevOrderIdsRef.current.has(o.id));
      if (newOrders.length > 0) {
        playNewOrderSound();
      }
    }

    // Detect newly overdue orders
    const overdueIds = new Set<string>();
    for (const o of activeOrders) {
      const elapsed = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
      if (elapsed >= SLA_WARN_MINS) overdueIds.add(o.id);
    }

    const newlyOverdue = [...overdueIds].filter(id => !prevOverdueIdsRef.current.has(id));
    if (newlyOverdue.length > 0 && !initialLoadRef.current) {
      playOverdueSound();
    }

    prevOrderIdsRef.current = currentIds;
    prevOverdueIdsRef.current = overdueIds;
    initialLoadRef.current = false;
  }, [orders, enabled]);

  useEffect(() => {
    checkSounds();
  }, [checkSounds]);

  // Periodic overdue check every 30s
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      const activeOrders = orders.filter(o => o.status !== "delivered" && o.status !== "cancelled");
      const overdueIds = new Set<string>();
      for (const o of activeOrders) {
        const elapsed = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
        if (elapsed >= SLA_WARN_MINS) overdueIds.add(o.id);
      }
      const newlyOverdue = [...overdueIds].filter(id => !prevOverdueIdsRef.current.has(id));
      if (newlyOverdue.length > 0) {
        playOverdueSound();
      }
      prevOverdueIdsRef.current = overdueIds;
    }, 30000);
    return () => clearInterval(interval);
  }, [orders, enabled]);
}
