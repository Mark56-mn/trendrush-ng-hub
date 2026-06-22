# How to Fix 404 Errors - Step by Step

## The Problem

Your WAP Container feature is showing 404 errors because **the database table hasn't been created yet**. The code is deployed correctly to Vercel, but the database schema is missing.

---

## The Solution - 3 Simple Steps

### Step 1: Copy the Database Migration SQL

1. Open this file in your project:
   ```
   supabase/migrations/20260622120000_imported-products-wap-container.sql
   ```

2. Copy the entire contents of this SQL file

---

### Step 2: Execute the SQL in Supabase

1. Go to: **Supabase Dashboard** → Your Project → **SQL Editor**
2. Click **"New Query"** or **"+"** button
3. Paste the SQL file contents into the editor
4. Click **"Run"** button (or press Ctrl+Enter)
5. Wait for the query to complete (should be instant)

**Expected Output**:
```
Query completed successfully
```

---

### Step 3: Verify the Table Was Created

1. Go to: **Supabase Dashboard** → **Tables** (sidebar)
2. Look for `imported_products` table in the list
3. Click on it to view the structure
4. Verify these fields exist:
   - `id` (UUID)
   - `user_id` (UUID)
   - `source_url` (text)
   - `platform` (text)
   - `product_name` (text)
   - `price` (numeric)
   - `image_url` (text)
   - `status` (text)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

---

## Test the Feature

### After the migration is applied:

1. **Hard refresh your browser**:
   - Windows/Linux: Press `Ctrl+F5`
   - Mac: Press `Cmd+Shift+R`

2. **Login as admin** to your application

3. **Navigate to Admin Panel** → **WAP Container tab**

4. **Test import a product**:
   - Paste this test URL: `https://www.amazon.com/s?k=laptop`
   - Click "Import Product"
   - You should see the product details being extracted!

---

## If It Still Doesn't Work

### Check Row-Level Security (RLS)

1. Go to: **Supabase Dashboard** → **Authentication** → **Policies** (or **Tables** → `imported_products`)
2. Check if Row-Level Security is **enabled** (should be ON)
3. Verify policies exist for:
   - SELECT - Users can see own products
   - INSERT - Users can create products
   - UPDATE - Users can edit own products
   - DELETE - Users can delete own products

The migration SQL already includes these policies, so they should be created automatically.

### Check Error Logs

1. Go to: **Vercel Dashboard** → Your Project → **Deployments**
2. Click on the latest deployment
3. Go to **Logs** tab
4. Look for error messages
5. Share error details if you need help

### Check Browser Console

1. Press `F12` to open Developer Tools
2. Go to **Console** tab
3. Refresh the page
4. Look for red error messages
5. Share the error if you need help

---

## What Each Step Does

| Step | What | Why | Status |
|------|------|-----|--------|
| Deploy Code | GitHub → Vercel | Get the feature live | ✅ Done |
| Apply Migration | SQL → Supabase | Create database table | ❌ **YOU ARE HERE** |
| Test Feature | Browser → Test | Verify it works | ⏳ Next |

---

## The WAP Container Feature

Once the database is ready, you'll be able to:

✅ **Import Single Product**
- Paste any product URL (AliExpress, Temu, Amazon, eBay)
- Automatically extracts: Title, Price, Description, Images

✅ **Batch Import**
- Paste multiple URLs (one per line)
- Or upload CSV file
- See results for each product

✅ **Edit Products**
- Update product name, price, description
- Change product image URL
- Save changes to database

✅ **Delete Products**
- Remove products you no longer need
- Automatic confirmation to prevent accidents

---

## Your Next Action

👉 **Go apply the database migration SQL NOW!**

1. Copy: `supabase/migrations/20260622120000_imported-products-wap-container.sql`
2. Go to: **Supabase SQL Editor**
3. Execute the SQL
4. Refresh your app
5. Test the feature!

---

## Questions?

If you have issues:
1. Check the browser console for error messages
2. Check Vercel logs for deployment issues
3. Check Supabase tables to verify table creation
4. Read `DIAGNOSTIC_REPORT.md` for more details

**The migration SQL is the only missing piece. Apply it and you're done!**
