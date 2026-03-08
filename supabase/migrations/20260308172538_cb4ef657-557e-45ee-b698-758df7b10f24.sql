
CREATE TABLE public.flash_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  menu_item_ids uuid[] NOT NULL DEFAULT '{}',
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Flash sales are publicly readable"
  ON public.flash_sales FOR SELECT
  USING (true);

CREATE POLICY "Superadmin can insert flash sales"
  ON public.flash_sales FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin can update flash sales"
  ON public.flash_sales FOR UPDATE
  USING (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin can delete flash sales"
  ON public.flash_sales FOR DELETE
  USING (has_role(auth.uid(), 'superadmin'));
