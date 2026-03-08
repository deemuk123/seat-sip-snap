

## Problem

The show sync process nullifies `show_id` on all orders (sets it to `null`) before repopulating the `shows` table. This means after every sync, all orders lose their `show_id` foreign key, causing the Manager Portal to group everything under "No Show Assigned."

However, each order already stores the full show details in its `show_snapshot` JSON column (including `movieName`, `showTime`, `screenNumber`).

## Solution

Change the grouping logic in `ManagerPortal.tsx` to use `show_snapshot` data instead of `show_id`:

1. **Generate a grouping key from `show_snapshot`** — combine `movieName + showTime` (or use the snapshot's `id`) as the group key, since `show_id` is unreliable after syncs.

2. **Extract show name and time from the snapshot** for display, falling back to `show_id`-based lookup only as a secondary option.

3. **Apply the same fix to the SuperAdmin `OrderDetailsTable`** — it already reads movie name from snapshot, so no change needed there.

### Technical Detail

In `ManagerPortal.tsx` around line 88, replace the grouping logic:

```typescript
// Before: groups by show_id (often null after sync)
const showId = order.show_id || "no-show";

// After: groups by snapshot identity, falling back to show_id
const snapshot = order.show_snapshot as any;
const groupKey = snapshot?.movieName && snapshot?.showTime
  ? `${snapshot.movieName}::${snapshot.showTime}`
  : order.show_id || "no-show";
```

Then derive `showName` and `showTime` from the snapshot for each group. Orders without any snapshot data still fall into "No Show Assigned."

**Files to edit:** `src/pages/ManagerPortal.tsx` (grouping logic only, ~10 lines changed)

