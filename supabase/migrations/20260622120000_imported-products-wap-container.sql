-- Create imported_products table for WAP Container feature
CREATE TABLE IF NOT EXISTS imported_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_url TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('aliexpress', 'temu', 'amazon', 'ebay', 'generic')),
  product_name TEXT,
  description TEXT,
  price DECIMAL(12, 2),
  original_price DECIMAL(12, 2),
  image_url TEXT,
  video_url TEXT,
  raw_data JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'imported', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(source_url, user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_imported_products_user_id ON imported_products(user_id);
CREATE INDEX idx_imported_products_status ON imported_products(status);
CREATE INDEX idx_imported_products_platform ON imported_products(platform);
CREATE INDEX idx_imported_products_created_at ON imported_products(created_at);

-- Enable RLS
ALTER TABLE imported_products ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own imported products
CREATE POLICY "Users can view their own imported products"
  ON imported_products
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own imported products
CREATE POLICY "Users can insert their own imported products"
  ON imported_products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own imported products
CREATE POLICY "Users can update their own imported products"
  ON imported_products
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own imported products
CREATE POLICY "Users can delete their own imported products"
  ON imported_products
  FOR DELETE
  USING (auth.uid() = user_id);
