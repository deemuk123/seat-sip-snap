import type { Show } from "@/data/mockData";

/**
 * Parse a 12h time string like "02:37 PM" into { hours, minutes } in 24h.
 */
function parse12h(time: string): { hours: number; minutes: number } | null {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "AM" && hours === 12) hours = 0;
  if (period === "PM" && hours !== 12) hours += 12;
  return { hours, minutes };
}

/**
 * Check if the current time falls within a show's interval window.
 */
export function isInInterval(show: Show): boolean {
  if (!show.intervalStart || !show.intervalEnd) return false;

  const start = parse12h(show.intervalStart);
  const end = parse12h(show.intervalEnd);
  if (!start || !end) return false;

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = start.hours * 60 + start.minutes;
  const endMins = end.hours * 60 + end.minutes;

  return nowMins >= startMins && nowMins <= endMins;
}

/**
 * Format interval window for display, e.g. "2:37 – 2:53 PM"
 */
export function formatIntervalWindow(start: string, end: string): string {
  return `${start} – ${end}`;
}
