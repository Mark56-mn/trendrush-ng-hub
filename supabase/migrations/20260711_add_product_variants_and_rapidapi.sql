-- Add Rapid API columns to site_settings
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS rapidapi_key TEXT,
ADD COLUMN IF NOT EXISTS rapidapi_host TEXT;

-- Create product_variants table for color tagging and variant management
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_name TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, color_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_color_name ON product_variants(color_name);

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view product variants (public)
CREATE POLICY IF NOT EXISTS "Product variants are publicly visible"
  ON product_variants
  FOR SELECT
  USING (true);
