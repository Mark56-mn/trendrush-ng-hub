import * as cheerio from 'cheerio';

export interface ScrapedProduct {
  title?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  image?: string;
  video?: string;
  platform: 'aliexpress' | 'temu' | 'amazon' | 'ebay' | 'generic';
  rawData: Record<string, unknown>;
}

/**
 * Detect platform from URL
 */
export function detectPlatform(url: string): 'aliexpress' | 'temu' | 'amazon' | 'ebay' | 'generic' {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('aliexpress')) return 'aliexpress';
  if (urlLower.includes('temu')) return 'temu';
  if (urlLower.includes('amazon')) return 'amazon';
  if (urlLower.includes('ebay')) return 'ebay';
  
  return 'generic';
}

/**
 * Scrape product from AliExpress
 */
async function scrapeAliExpress(url: string): Promise<ScrapedProduct | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract product name from h1 or title
    const title = $('h1').first().text().trim() || 
                       $('title').text().split('-')[0].trim();
    
    // Extract price - AliExpress typically has price data in script tags
    let price: number | undefined;
    const priceText = $('[class*="price"]').first().text();
    const priceMatch = priceText.match(/[\d.]+/);
    if (priceMatch) {
      price = parseFloat(priceMatch[0]);
    }
    
    // Extract image
    const image = $('img[class*="product"]').first().attr('src') ||
                     $('img[class*="preview"]').first().attr('src') ||
                     $('img').first().attr('src');
    
    // Extract description
    const description = $('[class*="description"]').text().trim().substring(0, 500);
    
    return {
      title,
      price,
      image,
      description,
      platform: 'aliexpress',
      rawData: {
        scrapedAt: new Date().toISOString(),
        sourceUrl: url
      }
    };
  } catch (error) {
    console.error('[WAP] AliExpress scrape error:', error);
    return null;
  }
}

/**
 * Scrape product from Temu
 */
async function scrapeTemu(url: string): Promise<ScrapedProduct | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract product name
    const title = $('h1').first().text().trim() || 
                       $('[class*="product-title"]').first().text().trim();
    
    // Extract price
    let price: number | undefined;
    const priceElements = $('[class*="price"]');
    priceElements.each((_, el) => {
      const text = $(el).text();
      const match = text.match(/\$?([\d.]+)/);
      if (match && !price) {
        price = parseFloat(match[1]);
      }
    });
    
    // Extract image
    const image = $('img[class*="product"]').first().attr('src') ||
                     $('img[class*="main"]').first().attr('src') ||
                     $('img').first().attr('src');
    
    // Extract description
    const description = $('[class*="desc"]').text().trim().substring(0, 500);
    
    return {
      title,
      price,
      image,
      description,
      platform: 'temu',
      rawData: {
        scrapedAt: new Date().toISOString(),
        sourceUrl: url
      }
    };
  } catch (error) {
    console.error('[WAP] Temu scrape error:', error);
    return null;
  }
}

/**
 * Scrape product from Amazon
 */
async function scrapeAmazon(url: string): Promise<ScrapedProduct | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract product name
    const title = $('#productTitle').text().trim() || $('h1').first().text().trim();
    
    // Extract price
    let price: number | undefined;
    const priceText = $('.a-price-whole').first().text();
    const priceMatch = priceText.match(/[\d.]+/);
    if (priceMatch) {
      price = parseFloat(priceMatch[0]);
    }
    
    // Extract image
    const image = $('#landingImage').attr('src') || $('img[class*="a-dynamic-image"]').first().attr('src');
    
    // Extract description
    const description = $('#feature-bullets').text().trim().substring(0, 500);
    
    return {
      title,
      price,
      image,
      description,
      platform: 'amazon',
      rawData: {
        scrapedAt: new Date().toISOString(),
        sourceUrl: url
      }
    };
  } catch (error) {
    console.error('[WAP] Amazon scrape error:', error);
    return null;
  }
}

/**
 * Generic fallback scraper for any product URL
 */
async function scrapeGeneric(url: string): Promise<ScrapedProduct | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract product name from common selectors
    const title = $('h1').first().text().trim() || 
                       $('[class*="product-title"]').first().text().trim() ||
                       $('title').text().split('-')[0].trim();
    
    // Extract price
    let price: number | undefined;
    const priceText = $('[class*="price"]').first().text();
    const priceMatch = priceText.match(/[\d.]+/);
    if (priceMatch) {
      price = parseFloat(priceMatch[0]);
    }
    
    // Extract image
    const image = $('img').first().attr('src');
    
    // Extract description
    const description = $('[class*="description"]').first().text().trim().substring(0, 500) ||
                       $('[class*="details"]').first().text().trim().substring(0, 500);
    
    return {
      title,
      price,
      image,
      description,
      platform: 'generic',
      rawData: {
        scrapedAt: new Date().toISOString(),
        sourceUrl: url
      }
    };
  } catch (error) {
    console.error('[WAP] Generic scrape error:', error);
    return null;
  }
}

/**
 * Main scraper function with platform detection and fallback
 */
export async function scrapeProduct(url: string): Promise<ScrapedProduct | null> {
  try {
    // Validate URL
    new URL(url);
  } catch {
    console.error('[WAP] Invalid URL:', url);
    return null;
  }
  
  const platform = detectPlatform(url);
  
  let result: ScrapedProduct | null = null;
  
  // Try platform-specific scraper
  if (platform === 'aliexpress') {
    result = await scrapeAliExpress(url);
  } else if (platform === 'temu') {
    result = await scrapeTemu(url);
  } else if (platform === 'amazon') {
    result = await scrapeAmazon(url);
  }
  
  // Fallback to generic scraper if platform-specific fails
  if (!result || !result.title) {
    result = await scrapeGeneric(url);
  }
  
  return result;
}

/**
 * Validate and normalize URL
 */
export function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  return normalized;
}

/**
 * Alias for scrapeProduct for consistency in function naming
 */
export async function scrapeProductDetails(url: string): Promise<ScrapedProduct | null> {
  return scrapeProduct(url);
}
