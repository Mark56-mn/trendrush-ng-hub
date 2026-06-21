
DROP POLICY IF EXISTS orders_insert_anyone ON public.orders;
CREATE POLICY orders_insert_safe ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

REVOKE SELECT ON public.site_settings FROM anon;
GRANT SELECT (id, whatsapp_link, logo_url, banner_url, hero_slogan, updated_at)
  ON public.site_settings TO anon;
