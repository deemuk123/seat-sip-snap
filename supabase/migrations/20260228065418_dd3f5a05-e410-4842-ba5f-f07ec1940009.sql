
-- Allow admins/superadmins to insert/update settings
CREATE POLICY "Admin can insert settings"
ON public.settings FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'superadmin')
);

CREATE POLICY "Admin can update settings"
ON public.settings FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'superadmin')
);
