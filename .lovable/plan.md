

# Time-Based Menu Item Display

Add optional availability hours to menu items so kitchen-prepared items (e.g., Chicken Burger) only show during specified times. Hide unavailable items from customers entirely.

## Database Change

Add two nullable columns to `menu_items`:
- `available_from` (text, e.g. "10:00") -- start time in HH:mm 24h format
- `available_until` (text, e.g. "19:00") -- end time in HH:mm 24h format

When both are null, the item is always available (current behavior). When set, the item only displays to customers during that window.

## Files to Modify

### 1. Migration
Add `available_from` and `available_until` text columns (nullable, default null) to `menu_items`.

### 2. `src/lib/supabase-orders.ts` — `fetchMenuItems()`
- Return the new `available_from` and `available_until` fields in the mapped result.

### 3. `src/data/mockData.ts` — `MenuItem` interface
- Add `availableFrom?: string` and `availableUntil?: string` optional fields.

### 4. `src/pages/MenuPage.tsx`
- Add a helper `isWithinTimeWindow(from, until)` that compares current local time (HH:mm) against the window.
- Filter out items where `available === false` OR outside the time window. Customers never see unavailable items.

### 5. `src/components/manager/MenuManager.tsx`
- Add `available_from` and `available_until` to the form state.
- Add two time inputs (HH:mm) in the create/edit dialog labeled "Available From" and "Available Until" with a hint like "Leave empty for all-day".
- Show a small time badge (e.g. "10:00-19:00") on items in the manager list when time restrictions are set.
- Pass the new fields through to `createMenuItem` / `updateMenuItem`.

### 6. `src/lib/supabase-manager.ts`
- Add `available_from` and `available_until` to the `createMenuItem` and `updateMenuItem` type signatures.

