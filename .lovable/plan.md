

# Make Fraud Prevention Limits Configurable from Admin Panel

## Current State
The fraud limits are **hardcoded** in the `check-fraud` edge function:
- Max 3 orders per phone per show
- Max 2 orders per seat per show

Both limits are **show-wise** (per show), which is correct. But they cannot be changed without editing code.

## Plan

### 1. Add fraud limit fields to SystemSettings UI
Add a new "Fraud Prevention" card in `SystemSettings.tsx` with two number inputs:
- **Max orders per phone per show** (default: 3)
- **Max orders per seat per show** (default: 2)

These get saved as part of the existing `system_config` setting in the `settings` table (no database migration needed).

### 2. Update check-fraud edge function
Instead of using hardcoded constants, the function will:
- Read the `system_config` key from the `settings` table
- Extract `max_orders_per_phone_per_show` and `max_orders_per_seat_per_show`
- Fall back to the current defaults (3 and 2) if not configured

### Files modified
- `src/components/admin/SystemSettings.tsx` — add Fraud Prevention card with two inputs
- `supabase/functions/check-fraud/index.ts` — read limits from settings table dynamically

