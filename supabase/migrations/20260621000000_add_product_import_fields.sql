ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS product_cost_naira INTEGER CHECK (product_cost_naira IS NULL OR product_cost_naira >= 0),
  ADD COLUMN IF NOT EXISTS shipping_cost_naira INTEGER CHECK (shipping_cost_naira IS NULL OR shipping_cost_naira >= 0),
  ADD COLUMN IF NOT EXISTS import_notes TEXT;
