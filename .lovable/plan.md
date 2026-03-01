

# Phase 6: API Integrations

## Overview
Connect the Show API from your ShowTime Clock project and prepare the SMS OTP architecture for future provider integration.

---

## Remaining Phases After This

| Phase | Description | Status |
|-------|------------|--------|
| **Phase 6** | API Integrations (Show API + SMS OTP prep) | **This implementation** |
| **Phase 7** | Advanced Features (AI upsell, interval boost, coupons, repeat order, SLA tracking, fraud prevention) | Pending |
| **Phase 8** | PWA + Performance (service worker, offline, install prompt, image optimization) | Pending |

---

## Phase 6 Implementation Plan

### 6.1 Show API Integration (sync-shows edge function)

**Database changes:**
- Add an `api_settings` table with columns: `id`, `api_url` (text), `last_sync_at` (timestamptz), `last_sync_status` (text), `sync_interval_mins` (int, default 30), `created_at`, `updated_at`
- RLS: readable by staff, writable by admin/superadmin
- Add `external_id` column to the existing `shows` table to track API-sourced shows

**Edge function: `sync-shows`**
- Adapted from your ShowTime Clock project's sync-shows function
- Reads `api_url` from `api_settings` table
- Fetches show data from the external API
- Maps API response fields (`MovieName`, `StartTime`, `ScreenTitle`, `ShowDate`, etc.) to SeatServe's `shows` table (`movie_name`, `show_time`, `screen_number`, `language`, `format`)
- Upserts shows by `external_id` to avoid duplicates
- Cleans up old shows from past dates
- Logs sync status back to `api_settings`

**Admin UI updates (SystemSettings.tsx):**
- Add a new "Show API" settings card with:
  - API URL input field (stored in `api_settings` table)
  - Sync interval setting
  - "Sync Now" button to trigger the edge function manually
  - Last sync status + timestamp display

**ShowSelection.tsx update:**
- No changes needed -- it already reads from the `shows` table which will now be populated by the sync function

### 6.2 SMS OTP Architecture (prepared for future provider)

**Edge function: `send-otp`**
- Generates a 6-digit OTP
- Stores it in a new `otp_verifications` table with: `id`, `phone`, `otp_code`, `expires_at` (5 min TTL), `attempts` (default 0, max 3), `verified` (boolean), `created_at`
- RLS: insert/select open (anonymous customers use this)
- For now, returns the OTP in the response (simulated mode) since no SMS provider is connected yet
- When SMS API details are provided later, the function will call the SMS API to send the OTP

**Edge function: `verify-otp`**
- Accepts phone + OTP code
- Checks against `otp_verifications` table
- Validates: not expired (5 min), attempts < 3, correct code
- Increments attempt count on failure
- Marks as verified on success

**Checkout.tsx updates:**
- Replace simulated OTP flow with calls to `send-otp` and `verify-otp` edge functions
- Show proper error messages for expired OTP, max attempts exceeded
- Rate limit: disable "Send OTP" button for 30 seconds after sending

### 6.3 Order Tracking - Real-time Updates

**OrderTracking.tsx update:**
- Remove the simulated status progression (setTimeout timers)
- Subscribe to real-time changes on the `orders` table filtered by the current order ID
- Display actual status from the database, updated live when manager changes it

---

## Technical Details

### New files:
- `supabase/functions/sync-shows/index.ts` -- Show API sync edge function
- `supabase/functions/send-otp/index.ts` -- OTP generation edge function
- `supabase/functions/verify-otp/index.ts` -- OTP verification edge function

### Modified files:
- `src/components/admin/SystemSettings.tsx` -- Add Show API config card
- `src/pages/Checkout.tsx` -- Use real OTP edge functions
- `src/pages/OrderTracking.tsx` -- Real-time status from database
- `supabase/config.toml` -- Add `verify_jwt = false` for new edge functions

### Database migration:
- Create `api_settings` table
- Create `otp_verifications` table
- Add `external_id` column to `shows` table

