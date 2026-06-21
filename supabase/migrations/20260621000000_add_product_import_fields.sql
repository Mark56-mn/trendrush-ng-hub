ALTER TABLE public.products
  ADD COLUMN source_url TEXT,
  ADD COLUMN product_cost_naira INTEGER CHECK (product_cost_naira IS NULL OR product_cost_naira >= 0),
  ADD COLUMN shipping_cost_naira INTEGER CHECK (shipping_cost_naira IS NULL OR shipping_cost_naira >= 0),
  ADD COLUMN import_notes TEXT;
