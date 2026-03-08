

# Fix Show API Sync + Homepage: Running + Next 2 Shows

## New API Format

The API now returns:
- `running[]` — currently playing shows (have `audi_name`, `movie_name`, `show_time`)
- `upcoming[]` — future shows (same fields)
- `latest_events[]` — **event logs**, not shows (have `event`, `time` fields instead of `show_time`) — should NOT be synced as shows

## Changes

### 1. Update `sync-shows` Edge Function
- Only sync `running` + `upcoming` arrays (skip `latest_events` — those are event logs, not show data)
- Remove hardcoded `language: 'Hindi'` and `format: '2D'` — use empty strings or derive from API
- Keep the overwrite-all strategy

### 2. Update Homepage (`ShowSelection.tsx`)
- After fetching shows from DB, display only **running shows** + **next 2 upcoming shows** (based on show_time ordering)
- Add a visual distinction: badge for "Now Playing" vs "Up Next"
- The `fetchShows` function in `supabase-orders.ts` already fetches all active shows ordered by `show_time` — filtering will happen in the component

### 3. Track show status in DB
- Add a `status` column (`text`, default `'upcoming'`) to `shows` table so we know which are running vs upcoming
- The sync function sets this based on which API array the show came from

## Files to modify
1. **Migration** — add `status` column to `shows`
2. **`supabase/functions/sync-shows/index.ts`** — fix to only use running+upcoming, remove hardcoded values, set status
3. **`src/pages/ShowSelection.tsx`** — filter to show running + next 2 upcoming, add badges
4. **`src/lib/supabase-orders.ts`** — include `status` in fetched show data

