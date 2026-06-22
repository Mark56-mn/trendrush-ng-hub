import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { scrapeProductDetails, normalizeUrl } from './product-scraper';

/**
 * Import a single product by URL
 */
export const importSingleProduct = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ url: z.string().url() }).parse(input))
  .handler(async ({ context, data }): Promise<{
    success: boolean;
    importedData?: any;
    error?: string;
  }> => {
    try {
      const userId = context.userId;
      const normalizedUrl = normalizeUrl(data.url);
      
      // Check if URL already imported by this user
      const { data: existing } = await context.supabase
        .from('imported_products')
        .select('id')
        .eq('source_url', normalizedUrl)
        .eq('user_id', userId)
        .single();
      
      if (existing) {
        return { success: false, error: 'This URL has already been imported' };
      }
      
      // Scrape product data
      const scrapedData = await scrapeProductDetails(normalizedUrl);
      
      if (!scrapedData || !scrapedData.title) {
        return { success: false, error: 'Could not extract product information from the URL' };
      }
      
      // Insert into database
      const { data: imported, error } = await context.supabase
        .from('imported_products')
        .insert({
          user_id: userId,
          source_url: normalizedUrl,
          platform: scrapedData.platform,
          product_name: scrapedData.title,
          description: scrapedData.description,
          price: scrapedData.price,
          image_url: scrapedData.image,
          video_url: scrapedData.video,
          raw_data: scrapedData.rawData as any,
          status: 'imported'
        } as any)
        .select()
        .single();
      
      if (error) {
        console.error('[WAP] Database insert error:', error);
        return { success: false, error: 'Failed to save product to database' };
      }
      
      return { success: true, importedData: imported };
    } catch (error) {
      console.error('[WAP] Import single product error:', error);
      return { success: false, error: 'An error occurred during import' };
    }
  });

/**
 * Import multiple products (CSV or newline-separated URLs)
 */
export const importMultipleProducts = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ content: z.string(), isCSV: z.boolean() }).parse(input))
  .handler(async ({ context, data }): Promise<{
    success: boolean;
    results?: Array<{
      url: string;
      status: 'success' | 'failed';
      error?: string;
    }>;
    error?: string;
  }> => {
    try {
      const userId = context.userId;
      const results: Array<{
        url: string;
        status: 'success' | 'failed';
        error?: string;
      }> = [];
      
      // Parse input
      let urls: string[] = [];
      
      if (data.isCSV) {
        // Simple CSV parsing - assume first column is URL
        const lines = data.content.split('\n');
        for (const line of lines) {
          const cells = line.split(',');
          if (cells[0]) {
            urls.push(cells[0].trim());
          }
        }
      } else {
        // Newline-separated URLs
        urls = data.content
          .split('\n')
          .map(url => url.trim())
          .filter(url => url.length > 0);
      }
      
      // Process each URL
      for (const url of urls) {
        try {
          const normalizedUrl = normalizeUrl(url);
          
          // Check if already imported
          const { data: existing } = await context.supabase
            .from('imported_products')
            .select('id')
            .eq('source_url', normalizedUrl)
            .eq('user_id', userId)
            .single();
          
          if (existing) {
            results.push({
              url,
              status: 'failed',
              error: 'Already imported'
            });
            continue;
          }
          
          // Scrape product
          const scrapedData = await scrapeProductDetails(normalizedUrl);
          
          if (!scrapedData || !scrapedData.title) {
            results.push({
              url,
              status: 'failed',
              error: 'Could not extract product information'
            });
            continue;
          }
          
          // Insert into database
          const { error } = await context.supabase
            .from('imported_products')
            .insert({
              user_id: userId,
              source_url: normalizedUrl,
              platform: scrapedData.platform,
              product_name: scrapedData.title,
              description: scrapedData.description,
              price: scrapedData.price,
              image_url: scrapedData.image,
              video_url: scrapedData.video,
              raw_data: scrapedData.rawData as any,
              status: 'imported'
            } as any);
          
          if (error) {
            results.push({
              url,
              status: 'failed',
              error: 'Database error'
            });
          } else {
            results.push({
              url,
              status: 'success'
            });
          }
        } catch (err) {
          results.push({
            url,
            status: 'failed',
            error: String(err)
          });
        }
      }
      
      return { success: true, results };
    } catch (error) {
      console.error('[WAP] Import multiple products error:', error);
      return { success: false, error: 'An error occurred during batch import' };
    }
  });

/**
 * Fetch imported products for current user
 */
export const fetchImportedProducts = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    success: boolean;
    importedProducts?: any[];
    error?: string;
  }> => {
    try {
      const userId = context.userId;
      
      const { data, error } = await context.supabase
        .from('imported_products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[WAP] Fetch error:', error);
        return { success: false, error: 'Failed to fetch products' };
      }
      
      return { success: true, importedProducts: data };
    } catch (error) {
      console.error('[WAP] Fetch imported products error:', error);
      return { success: false, error: 'An error occurred' };
    }
  });

/**
 * Delete an imported product
 */
export const deleteImportedProduct = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const userId = context.userId;
      
      const { error } = await context.supabase
        .from('imported_products')
        .delete()
        .eq('id', data.id)
        .eq('user_id', userId);
      
      if (error) {
        console.error('[WAP] Delete error:', error);
        return { success: false, error: 'Failed to delete product' };
      }
      
      return { success: true };
    } catch (error) {
      console.error('[WAP] Delete imported product error:', error);
      return { success: false, error: 'An error occurred' };
    }
  });

/**
 * Update an imported product
 */
export const updateImportedProduct = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      productName: z.string().optional(),
      description: z.string().optional(),
      price: z.number().optional(),
      imageUrl: z.string().optional()
    }).parse(input)
  )
  .handler(async ({ context, data }): Promise<{
    success: boolean;
    updatedData?: any;
    error?: string;
  }> => {
    try {
      const userId = context.userId;
      
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };
      
      if (data.productName) updatePayload.product_name = data.productName;
      if (data.description) updatePayload.description = data.description;
      if (data.price !== undefined) updatePayload.price = data.price;
      if (data.imageUrl) updatePayload.image_url = data.imageUrl;
      
      const { data: updated, error } = await context.supabase
        .from('imported_products')
        .update(updatePayload as any)
        .eq('id', data.id)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        console.error('[WAP] Update error:', error);
        return { success: false, error: 'Failed to update product' };
      }
      
      return { success: true, updatedData: updated };
    } catch (error) {
      console.error('[WAP] Update imported product error:', error);
      return { success: false, error: 'An error occurred' };
    }
  });
