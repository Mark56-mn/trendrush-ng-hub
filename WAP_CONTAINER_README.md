# WAP Container Feature - Deployment Guide

## Overview

The WAP Container (Web Application Product Container) is a powerful admin feature that allows you to import product details from external e-commerce platforms directly into your application. Simply paste a product URL from AliExpress, Temu, Amazon, or any other platform, and the system will automatically scrape and import the product information.

## Features

✅ **Single Product Import** - Import one product at a time with real-time preview
✅ **Batch Import** - Import multiple products via URL list or CSV
✅ **Multi-Platform Support** - Smart detection for AliExpress, Temu, Amazon, and generic URLs
✅ **Smart Scraping** - Hybrid approach: platform-specific APIs first, fallback to HTML parsing
✅ **Product Editing** - Modify imported product details before finalizing
✅ **Database Storage** - All products stored securely in Supabase with user-scoped access
✅ **Duplicate Prevention** - Automatic detection and rejection of already-imported URLs

## Files Added/Modified

### New Files Created

1. **`src/lib/product-scraper.ts`** - Product scraping utility
   - Platform detection (AliExpress, Temu, Amazon, generic)
   - HTML parsing with Cheerio
   - Extracts: title, price, description, images, videos

2. **`src/lib/wap-import.functions.ts`** - Server-side import functions
   - `importSingleProduct()` - Import single product URL
   - `importMultipleProducts()` - Batch import from CSV/URL list
   - `fetchImportedProducts()` - List user's imported products
   - `updateImportedProduct()` - Edit product details
   - `deleteImportedProduct()` - Remove imported product

3. **`src/components/wap-container.tsx`** - React admin UI component
   - Tabbed interface (Single/Batch import)
   - Product preview and editing
   - Real-time import results
   - Error handling and success feedback

4. **`src/routes/_authenticated/admin/wap-container.tsx`** - Admin page route
   - Wrapper page that displays the WAP Container component

5. **`supabase/migrations/20260622120000_imported-products-wap-container.sql`** - Database migration
   - Creates `imported_products` table
   - Sets up Row-Level Security (RLS) policies
   - Creates indexes for performance
   - Defines schema with all product fields

6. **`src/integrations/supabase/types.ts`** - Updated Supabase types
   - Added TypeScript definitions for the new `imported_products` table

### Modified Files

1. **`src/routes/_authenticated/admin/route.tsx`** - Admin navigation
   - Added "WAP Container" tab to admin menu
   - Added Download icon import

## Deployment Steps

### Step 1: Apply Database Migration

The database migration is automatically created and ready to be applied:

```bash
# If using Supabase CLI
supabase migration up

# Or manually run the SQL migration in Supabase dashboard:
# Navigate to: SQL Editor > New Query
# Copy the contents of: supabase/migrations/20260622120000_imported-products-wap-container.sql
# Execute
```

### Step 2: Deploy to Vercel

```bash
# Commit your changes
git add .
git commit -m "feat: add WAP Container product import feature"

# Push to your repository
git push origin main

# Vercel will automatically deploy on push
# Or use Vercel CLI:
vercel --prod
```

### Step 3: Verify Deployment

1. Go to your Vercel deployed app
2. Log in as an admin user
3. Navigate to "Admin Panel" → "WAP Container" tab
4. Try importing a test product from a public e-commerce site

## Usage Guide

### Importing a Single Product

1. Click the "Single Import" tab
2. Paste a product URL (e.g., `https://www.aliexpress.com/item/...`)
3. Click "Import Product"
4. Wait for scraping to complete (~2-5 seconds)
5. Product details will appear in the "Imported Products" section below

### Batch Importing Products

1. Click the "Batch Import" tab
2. Choose import mode:
   - **URL List**: Paste URLs one per line
   - **CSV Format**: Paste CSV with URLs in first column
3. Click "Import Batch"
4. View import results showing success/failure for each URL

### Editing Imported Products

1. Find the product in "Imported Products" list
2. Click the "Edit" button
3. Modify: product name, description, price, or image URL
4. Click "Save"

### Deleting Products

1. Find the product in the list
2. Click "Delete"
3. Confirm deletion

## Database Schema

### `imported_products` Table

```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users) - foreign key
- source_url: TEXT - original product URL (unique per user)
- platform: VARCHAR - 'aliexpress' | 'temu' | 'amazon' | 'ebay' | 'generic'
- product_name: TEXT - scraped product title
- description: TEXT - product description (max 500 chars)
- price: DECIMAL - product price
- original_price: DECIMAL - original price if on sale
- image_url: TEXT - primary product image
- video_url: TEXT - product video URL if available
- raw_data: JSONB - raw scraped data for debugging
- status: VARCHAR - 'pending' | 'imported' | 'failed'
- error_message: TEXT - error details if status = 'failed'
- created_at: TIMESTAMP - import timestamp
- updated_at: TIMESTAMP - last modification timestamp
```

**Row-Level Security (RLS):**
- Users can only view/edit/delete their own imported products
- All operations are scoped to authenticated user_id

## Security Considerations

✅ **User-Scoped Access** - Each user only sees their own imported products
✅ **Authentication Required** - Only logged-in admin users can access
✅ **RLS Policies** - Database enforces user isolation at the SQL level
✅ **URL Validation** - Product URLs are validated before scraping
✅ **Input Sanitization** - Product data is sanitized before storage
✅ **Error Handling** - Failed imports don't expose sensitive data

## Supported Platforms

### Primary Support (Platform-Specific)
- ✅ **AliExpress** - Full product details extraction
- ✅ **Temu** - Price, title, images, description
- ✅ **Amazon** - Product title, price, description
- ✅ **eBay** - Generic fallback supported

### Fallback (Generic HTML Parsing)
- ✅ **Any URL** - Generic HTML parser extracts common elements

## Performance Notes

- Single product import: ~2-5 seconds (depends on website response time)
- Batch import: ~3-8 seconds per product
- Vercel function timeout: 30 seconds
- Each import makes a single HTTP request to the target website
- Data is stored efficiently in PostgreSQL

## Environment Variables Required

All required environment variables should already be configured:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` - Supabase public key
- `SUPABASE_SERVICE_ROLE_KEY` - For RLS policy enforcement

## Troubleshooting

### "Could not extract product information"
- The website might have anti-scraping measures
- Try a different product URL
- Check if the URL is accessible in your region

### "This URL has already been imported"
- The URL has previously been imported by this user
- Delete the existing import if you want to re-import
- Use a different URL format or product variant

### Images not loading
- Some websites block image hotlinking
- Consider downloading and uploading images to Blob storage
- Edit the product and update the image_url

### Batch import partial failures
- Check the import results table for specific errors
- Failed URLs won't affect other imports in the batch
- Re-try failed URLs individually for more details

## Advanced Customization

### Modifying Scraper Logic

Edit `src/lib/product-scraper.ts`:
- Add new platform-specific scrapers in `scrapeXyz()` functions
- Adjust CSS selectors to match website structure
- Modify field extraction logic

### Extending Database Schema

To add new fields:
1. Create a new migration: `supabase migration new add_custom_fields`
2. Add columns to `imported_products` table
3. Update types in `src/integrations/supabase/types.ts`
4. Update server functions to handle new fields
5. Update the component UI for new fields

### Custom Import Validation

Edit `src/lib/wap-import.functions.ts`:
- Add custom validation in `importSingleProduct()` handler
- Implement business logic (min price, category filters, etc.)
- Add custom error messages

## Best Practices

1. **Test URLs First** - Try importing from public product pages
2. **Monitor Rates** - Don't bulk import from protected websites (anti-scraping)
3. **Review Data** - Always verify scraped data accuracy before publishing
4. **Use Fallbacks** - Generic scraper handles edge cases gracefully
5. **Regular Backups** - Backup your Supabase database regularly
6. **Error Logs** - Check `raw_data` JSONB field for scraping details

## Support

For issues or feature requests:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Check Supabase logs for database errors
4. Review server function logs in Vercel dashboard

## Future Enhancements

Possible improvements for future versions:
- API key integration for platform-specific scraping
- Image download and local storage
- Scheduled re-scraping for price updates
- Product comparison and merging
- Bulk export to CSV
- Advanced filtering and search
- Import templates and presets

---

**Last Updated:** June 22, 2026
**Version:** 1.0
**Status:** Production Ready
