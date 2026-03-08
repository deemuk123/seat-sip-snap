
-- Allow staff to insert categories
CREATE POLICY "Staff can insert menu categories"
ON public.menu_categories
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Allow staff to delete categories
CREATE POLICY "Staff can delete menu categories"
ON public.menu_categories
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);
