

# Fix sync-shows Edge Function: Missing Database Schema

## Root Cause

Two database schema elements are missing, causing the sync-shows function to fail:

1. **`api_settings` table does not exist** -- The edge function queries `api_settings` for the API URL and sync status, but this table was never created. This is why you get "API URL not configured" (400) or 500 errors.

2. **`external_id` column missing from `shows` table** -- The edge function references `shows.external_id` to match API records to local rows, but the column doesn't exist in the schema.

## Plan

### 1. Database migration -- Create `api_settings` table and add `external_id` to `shows`

```sql
-- api_settings table for Show API configuration
CREATE TABLE public.api_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_url TEXT NOT NULL DEFAULT '',
  sync_interval_mins INTEGER NOT NULL DEFAULT 30,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

-- Admin/superadmin can manage, public can read
CREATE POLICY "API settings publicly readable" ON public.api_settings FOR SELECT USING (true);
CREATE POLICY "Admin can insert api_settings" ON public.api_settings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Admin can update api_settings" ON public.api_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Add external_id to shows for API sync matching
ALTER TABLE public.shows ADD COLUMN external_id TEXT;
CREATE INDEX idx_shows_external_id ON public.shows(external_id);
```

### 2. No code changes needed
The edge function and SystemSettings UI already reference these correctly -- they just need the tables to exist.

### Files modified
- New migration SQL (database migration tool)

