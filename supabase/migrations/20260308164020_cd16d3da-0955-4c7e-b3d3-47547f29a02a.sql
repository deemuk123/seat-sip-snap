
-- Create scratch_rewards table
CREATE TABLE public.scratch_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'none',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  coupon_code TEXT,
  coupon_id UUID,
  sent BOOLEAN NOT NULL DEFAULT false,
  scratched BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_scratch_rewards_order_id ON public.scratch_rewards(order_id);
CREATE INDEX idx_scratch_rewards_tier ON public.scratch_rewards(tier);

-- Enable RLS
ALTER TABLE public.scratch_rewards ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous order flow)
CREATE POLICY "Anyone can insert scratch rewards"
  ON public.scratch_rewards FOR INSERT
  WITH CHECK (true);

-- Anyone can read (customer needs to see their reward)
CREATE POLICY "Anyone can read scratch rewards"
  ON public.scratch_rewards FOR SELECT
  USING (true);

-- Staff can update (mark as sent, add coupon code)
CREATE POLICY "Staff can update scratch rewards"
  ON public.scratch_rewards FOR UPDATE
  USING (
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  );
