CREATE TABLE IF NOT EXISTS public.product_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  video_urls TEXT[] NOT NULL DEFAULT '{}',
  detected_price NUMERIC,
  detected_currency TEXT,
  exchange_rate_naira NUMERIC,
  product_cost_naira INTEGER CHECK (product_cost_naira IS NULL OR product_cost_naira >= 0),
  selling_price_naira INTEGER NOT NULL DEFAULT 0 CHECK (selling_price_naira >= 0),
  shipping_fee_naira INTEGER NOT NULL DEFAULT 0 CHECK (shipping_fee_naira >= 0),
  tax_percentage NUMERIC NOT NULL DEFAULT 0 CHECK (tax_percentage >= 0 AND tax_percentage <= 100),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_trending BOOLEAN NOT NULL DEFAULT false,
  import_notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_imports TO authenticated;
GRANT ALL ON public.product_imports TO service_role;

ALTER TABLE public.product_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_imports_admin_all" ON public.product_imports;
CREATE POLICY "product_imports_admin_all" ON public.product_imports FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_product_imports_updated ON public.product_imports;
CREATE TRIGGER trg_product_imports_updated
BEFORE UPDATE ON public.product_imports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
