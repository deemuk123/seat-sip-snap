
CREATE TABLE public.daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date DATE NOT NULL UNIQUE,
  total_orders INTEGER NOT NULL DEFAULT 0,
  confirmed_orders INTEGER NOT NULL DEFAULT 0,
  confirmed_sales NUMERIC NOT NULL DEFAULT 0,
  cancelled_orders INTEGER NOT NULL DEFAULT 0,
  cancelled_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Daily summaries readable by staff" ON public.daily_summaries
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "System can insert daily summaries" ON public.daily_summaries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update daily summaries" ON public.daily_summaries
  FOR UPDATE USING (true);

-- Allow anon insert into audit_logs for edge functions (OTP verify)
CREATE POLICY "Anon can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Drop the old restrictive staff-only insert policy
DROP POLICY IF EXISTS "Staff can insert audit logs" ON public.audit_logs;
