
CREATE TABLE public.daily_item_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date DATE NOT NULL,
  item_name TEXT NOT NULL,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(summary_date, item_name)
);

ALTER TABLE public.daily_item_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read daily item stats" ON public.daily_item_stats
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "System can insert daily item stats" ON public.daily_item_stats
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update daily item stats" ON public.daily_item_stats
  FOR UPDATE USING (true);
