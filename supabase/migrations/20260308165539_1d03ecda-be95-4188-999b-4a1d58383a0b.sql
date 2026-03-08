CREATE TABLE public.scratch_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL CHECK (tier IN ('gold', 'silver', 'bronze')),
  label text NOT NULL DEFAULT '',
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  max_quantity integer NOT NULL DEFAULT 0,
  used_count integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scratch_prizes ENABLE ROW LEVEL SECURITY;

-- Publicly readable so order assignment can read
CREATE POLICY "Scratch prizes are publicly readable" ON public.scratch_prizes
  FOR SELECT USING (true);

-- Only superadmin can manage
CREATE POLICY "Superadmin can insert scratch prizes" ON public.scratch_prizes
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmin can update scratch prizes" ON public.scratch_prizes
  FOR UPDATE USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmin can delete scratch prizes" ON public.scratch_prizes
  FOR DELETE USING (has_role(auth.uid(), 'superadmin'::app_role));