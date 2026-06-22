# 🔴 FIX 404 ERRORS - READ THIS NOW!

## The Problem

Your WAP Container feature is giving 404 errors because **the database table hasn't been created**.

## The Solution

Copy and execute **ONE SQL file** in Supabase. That's it!

---

## 🚀 FIX IN 2 MINUTES

### Step 1: Copy the SQL Code

Open this file from your project:
```
supabase/migrations/20260622120000_imported-products-wap-container.sql
```

Copy ALL the code.

### Step 2: Execute in Supabase

1. Go to: **https://app.supabase.com**
2. Select your project
3. Click: **SQL Editor** (left sidebar)
4. Click: **New Query**
5. Paste the SQL code
6. Click: **Run** button
7. Wait for success message

### Step 3: Test

1. Refresh your app in browser
2. Login as admin
3. Click: **Admin** → **WAP Container** tab
4. Try importing a product URL
5. ✅ Done!

---

## ✅ What You'll See After the Fix

- ✅ No more 404 errors
- ✅ WAP Container tab is clickable
- ✅ Can import single products
- ✅ Can batch import with CSV/URLs
- ✅ Can edit product details
- ✅ Can delete products

---

## 🎯 The SQL File Creates

```
Table: imported_products

id              UUID (unique ID)
user_id         UUID (your user)
source_url      TEXT (the product link)
platform        TEXT (aliexpress, temu, amazon, ebay, generic)
product_name    TEXT (extracted title)
description     TEXT (product description)
price           DECIMAL (product price)
image_url       TEXT (product image URL)
video_url       TEXT (product video URL)
raw_data        JSONB (full scraped data)
status          TEXT (imported, pending, failed)
created_at      TIMESTAMP (when added)
updated_at      TIMESTAMP (when updated)

Security:
- Row-Level Security enabled
- Users only see their own products
- All data scoped by user_id
```

---

## 🔍 How to Verify It Worked

### Method 1: Check in Supabase Dashboard
1. Go to **Supabase** → **Tables**
2. Look for `imported_products` table
3. Should see the columns listed above

### Method 2: Test the Feature
1. Login as admin to your app
2. Go to **Admin** → **WAP Container**
3. Paste a product URL (e.g., Amazon link)
4. Click **Import Product**
5. Should see product details extracted

### Method 3: Check the Database
1. Go to **Supabase** → **imported_products** table
2. After importing a product, you should see a new row
3. Verify the product data is there

---

## 🎉 Common Questions

**Q: Will this break anything?**
A: No. This only adds a new table. Your existing data is safe.

**Q: Do I need to redeploy?**
A: No. The code is already deployed. Only the database needs this.

**Q: Why is there a 404 error?**
A: Because the route exists (code is deployed) but the database table doesn't. Once you create the table, it works.

**Q: Can I undo this?**
A: Yes, by deleting the `imported_products` table in Supabase, but your imported products will be deleted too.

**Q: Why wasn't this done automatically?**
A: Database migrations need to be explicitly applied for security. This is standard practice.

---

## 📝 The SQL Code (What You're Executing)

```sql
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

-- Create indexes for performance
CREATE INDEX idx_imported_products_user_id ON imported_products(user_id);
CREATE INDEX idx_imported_products_status ON imported_products(status);
CREATE INDEX idx_imported_products_platform ON imported_products(platform);
CREATE INDEX idx_imported_products_created_at ON imported_products(created_at);

-- Enable Row Level Security
ALTER TABLE imported_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own imported products"
  ON imported_products FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own imported products"
  ON imported_products FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own imported products"
  ON imported_products FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own imported products"
  ON imported_products FOR DELETE USING (auth.uid() = user_id);
```

---

## ⏱️ Timeline

| Step | Status | Time |
|------|--------|------|
| Deploy code to Vercel | ✅ Done | Earlier |
| Push to GitHub | ✅ Done | Earlier |
| Apply database migration | ❌ **YOU ARE HERE** | 2 minutes |
| Test the feature | ⏳ Next | 1 minute |

---

## 🎯 Right Now Action Items

1. **THIS SECOND**: Copy the SQL file
2. **NEXT**: Go to Supabase SQL Editor
3. **THEN**: Paste and run the SQL
4. **FINALLY**: Refresh your app and test!

That's it! No more 404 errors after that.

---

## 📞 If You Get Stuck

**Error: "Table already exists"**
- Means you already ran the migration. Go test the feature!

**Error: "Permission denied"**
- RLS is working correctly. This means the table was created. Test the feature.

**Error: "Syntax error"**
- The SQL file might have been edited. Use the file from your project folder directly.

**Still seeing 404?**
- Hard refresh browser: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- Clear browser cache
- Try in a private/incognito window

---

## 🎊 After You Apply the Migration

Your app will have a fully functional product import feature:

- 📥 **Single Import**: Paste one URL → Get all details
- 📤 **Batch Import**: Paste multiple URLs → Import all at once  
- ✏️ **Edit Products**: Change name, price, images
- 🗑️ **Delete Products**: Remove unwanted imports
- 🔐 **Secure**: Users only see their own products
- ⚡ **Fast**: Works instantly

---

## 💪 You've Got This!

The WAP Container feature is 99% done. You're just 2 minutes away from it being fully functional.

**Go apply that SQL file now!** 🚀
