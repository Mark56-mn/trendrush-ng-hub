ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sender_name text;
CREATE INDEX IF NOT EXISTS orders_pending_amount_idx ON public.orders(status, unique_amount) WHERE status = 'pending';

DROP FUNCTION IF EXISTS public.get_order_public(uuid);
CREATE FUNCTION public.get_order_public(_id uuid)
 RETURNS TABLE(id uuid, status order_status, unique_amount integer, base_amount integer, product_id uuid, sender_name text, created_at timestamp with time zone, paid_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT id, status, unique_amount, base_amount, product_id, sender_name, created_at, paid_at FROM public.orders WHERE id = _id
$$;
GRANT EXECUTE ON FUNCTION public.get_order_public(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_order_sender_name(_id uuid, _sender_name text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.orders SET sender_name = _sender_name WHERE id = _id AND status = 'pending';
$$;
GRANT EXECUTE ON FUNCTION public.set_order_sender_name(uuid, text) TO anon, authenticated;