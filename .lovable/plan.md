

# Plan: Periodic Show Sync + Comprehensive Audit Logging

## 1. Automatic 10-minute Show Sync (pg_cron)

Set up a cron job using `pg_cron` + `pg_net` to invoke the `sync-shows` edge function every 10 minutes automatically.

**Implementation:**
- Enable `pg_cron` and `pg_net` extensions via migration
- Use the insert tool (not migration) to create the cron schedule that calls `sync-shows` every 10 minutes via `net.http_post`

Also fix the hardcoded `language: 'Hindi'` and `format: '2D'` in the sync-shows edge function — these should default to empty or be derived from API data if available.

## 2. Audit Logging for Key Events

Currently `audit_logs` table exists but nothing writes to it. Add audit log entries for:

| Event | Where to log |
|---|---|
| Staff login | `useAuth.ts` — after successful `signInWithPassword` |
| OTP verification (customer) | `verify-otp` edge function |
| Order cancellation | `supabase-manager.ts` `updateOrderStatus` when status = cancelled |
| Menu item create | `supabase-manager.ts` `createMenuItem` |
| Menu item delete | `supabase-manager.ts` `deleteMenuItem` |
| Combo/menu item update | `supabase-manager.ts` `updateMenuItem` |

**Implementation approach:**
- Create a shared `logAudit` helper function in `src/lib/supabase-manager.ts` that inserts into `audit_logs`
- Call it from each relevant function
- For edge functions (verify-otp), log directly using the service role client
- For staff login, call `logAudit` after successful sign-in in `useAuth.ts`

### Audit log schema (already exists):
```
actor_id (uuid), action (text), target_type (text), target_id (text), details (jsonb)
```

### RLS note:
The `audit_logs` table already has an INSERT policy for staff roles. For customer OTP verification, the edge function uses service role so RLS is bypassed.

## Files to modify

1. **`supabase/functions/sync-shows/index.ts`** — remove hardcoded `'Hindi'`/`'2D'`, use sensible defaults
2. **`src/lib/supabase-manager.ts`** — add `logAudit()` helper; call it in `updateOrderStatus` (for cancellations), `createMenuItem`, `deleteMenuItem`, `updateMenuItem`
3. **`src/hooks/useAuth.ts`** — call `logAudit` after successful login
4. **`supabase/functions/verify-otp/index.ts`** — add audit log entry on successful verification
5. **Database (insert tool)** — create pg_cron job for 10-min sync

## Migration needed
- Enable `pg_cron` and `pg_net` extensions

## No new tables needed
All logging goes into existing `audit_logs` table.

