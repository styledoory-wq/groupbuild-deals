
-- 1) Drop over-permissive profiles policy for suppliers
DROP POLICY IF EXISTS "Suppliers view requester profiles for visible quote requests" ON public.profiles;

-- 2) Tighten marketing-cards storage read policy to owner/admin only
DROP POLICY IF EXISTS "marketing_cards_read_auth" ON storage.objects;
CREATE POLICY "marketing_cards_read_owner_admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'marketing-cards' AND (
      public.has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
        SELECT 1
        FROM public.deals d
        JOIN public.suppliers s ON s.id = d.supplier_id
        WHERE d.id::text = (storage.foldername(name))[1]
          AND s.user_id = auth.uid()
      )
    )
  );

-- 3) Lock search_path on touch_user_project_data
CREATE OR REPLACE FUNCTION public.touch_user_project_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$function$;
