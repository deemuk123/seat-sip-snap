
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

CREATE POLICY "API settings publicly readable" ON public.api_settings FOR SELECT USING (true);
CREATE POLICY "Admin can insert api_settings" ON public.api_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Admin can update api_settings" ON public.api_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- Add external_id to shows for API sync matching
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE INDEX IF NOT EXISTS idx_shows_external_id ON public.shows(external_id);

-- Allow service role (edge functions) to delete shows for sync overwrite
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can delete shows" ON public.shows FOR DELETE USING (true);
