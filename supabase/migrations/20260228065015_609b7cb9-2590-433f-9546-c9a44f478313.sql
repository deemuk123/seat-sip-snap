
-- RLS policies for staff to manage menu_items
CREATE POLICY "Staff can insert menu items"
ON public.menu_items FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'superadmin')
);

CREATE POLICY "Staff can update menu items"
ON public.menu_items FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'superadmin')
);

CREATE POLICY "Staff can delete menu items"
ON public.menu_items FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'superadmin')
);

-- RLS policies for staff to manage shows
CREATE POLICY "Staff can insert shows"
ON public.shows FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'superadmin')
);

CREATE POLICY "Staff can update shows"
ON public.shows FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'superadmin')
);

-- RLS for staff to insert order status logs with changed_by
CREATE POLICY "Staff can insert status logs with user"
ON public.order_status_logs FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'superadmin')
);

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
