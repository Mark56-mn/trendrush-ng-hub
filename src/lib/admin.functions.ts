import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPublicSupabase, signImagePaths } from "./supabase-server";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return Boolean(data);
  });

export const adminDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      productsTotal,
      productsActive,
      productsLowStock,
      ordersPending,
      ordersPaidAll,
      ordersPaidToday,
      ordersPaid30d,
      recentOrders,
    ] = await Promise.all([
      sb.from("products").select("id", { count: "exact", head: true }),
      sb.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
      sb.from("products").select("id, title, stock").lte("stock", 3).order("stock", { ascending: true }).limit(5),
      sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("orders").select("base_amount").eq("status", "paid"),
      sb.from("orders").select("base_amount").eq("status", "paid").gte("paid_at", startToday.toISOString()),
      sb.from("orders").select("base_amount, paid_at").eq("status", "paid").gte("paid_at", since30),
      sb.from("orders")
        .select("id, status, base_amount, sender_name, created_at, products(title)")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const sum = (rows: any[] | null) => (rows ?? []).reduce((a, r) => a + (r.base_amount ?? 0), 0);

    return {
      products: {
        total: productsTotal.count ?? 0,
        active: productsActive.count ?? 0,
        lowStock: productsLowStock.data ?? [],
      },
      orders: {
        pending: ordersPending.count ?? 0,
        paidTotal: (ordersPaidAll.data ?? []).length,
        revenueAllTime: sum(ordersPaidAll.data),
        revenueToday: sum(ordersPaidToday.data),
        revenue30d: sum(ordersPaid30d.data),
        paid30dSeries: (ordersPaid30d.data ?? []) as { base_amount: number; paid_at: string }[],
        recent: recentOrders.data ?? [],
      },
    };
  });

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function cleanText(value: unknown) {
  return decodeHtml(String(value ?? ""))
    .replace(/\s+/g, " ")
    .trim();
}

function extractMeta(html: string, names: string[]) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
        "i",
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
        "i",
      ),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return cleanText(match[1]);
    }
  }
  return "";
}

function extractPageTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? cleanText(match[1]) : "";
}

function flattenJsonLd(value: unknown): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => flattenJsonLd(item));
  if (typeof value !== "object") return [];
  const item = value as any;
  return [
    item,
    ...flattenJsonLd(item["@graph"]),
    ...flattenJsonLd(item.mainEntity),
    ...flattenJsonLd(item.itemListElement),
  ];
}

function extractJsonLdProduct(html: string) {
  const blocks = [
    ...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1].trim());
      const product = flattenJsonLd(parsed).find((item) => {
        const type = item?.["@type"];
        return type === "Product" || (Array.isArray(type) && type.includes("Product"));
      });
      if (product) return product;
    } catch {
      // Ignore malformed merchant metadata and fall back to meta tags.
    }
  }
  return null;
}

function absoluteUrl(url: string, base: string) {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

function getImageUrl(image: unknown): string {
  if (typeof image === "string") return image;
  if (image && typeof image === "object" && "url" in image) {
    return String((image as { url?: unknown }).url ?? "");
  }
  return "";
}

function normalizeImages(images: unknown[], baseUrl: string) {
  return [...new Set(images.map(getImageUrl).map(cleanText).filter(Boolean))]
    .slice(0, 8)
    .map((image) => absoluteUrl(image, baseUrl));
}

function parsePrice(value: unknown) {
  const normalized = String(value ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  if (!normalized) return null;
  const price = Number.parseFloat(normalized[0]);
  return Number.isFinite(price) ? price : null;
}

function extractOffer(product: any) {
  const offer = Array.isArray(product?.offers) ? product.offers[0] : product?.offers;
  if (offer?.priceSpecification) {
    return Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification;
  }
  return offer;
}

function slugify(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function makeUniqueSlug(supabase: any, slug: string, ignoreId?: string) {
  const base = slugify(slug) || `product-${Date.now()}`;
  for (let index = 0; index < 50; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    let query = supabase.from("products").select("id").eq("slug", candidate);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export const importProductFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ url: z.string().trim().url().max(2000) }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const response = await fetch(data.url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; TrendRushNGImporter/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) throw new Error(`Could not read product page (${response.status})`);
    const html = await response.text();
    const jsonLd = extractJsonLdProduct(html);
    const title = cleanText(jsonLd?.name) || extractMeta(html, ["og:title", "twitter:title"]) || extractPageTitle(html);
    if (!title) throw new Error("No product title was found on that page. Please add the product manually.");
    const description =
      cleanText(jsonLd?.description) || extractMeta(html, ["og:description", "twitter:description", "description"]);
    const rawImages = Array.isArray(jsonLd?.image) ? jsonLd.image : jsonLd?.image ? [jsonLd.image] : [];
    const image_urls = normalizeImages([...rawImages, extractMeta(html, ["og:image", "twitter:image"])], data.url);
    const offer = extractOffer(jsonLd);
    const detectedPrice =
      parsePrice(offer?.price ?? offer?.lowPrice ?? offer?.highPrice) ??
      parsePrice(extractMeta(html, ["product:price:amount", "og:price:amount"]));
    const detectedCurrency = cleanText(
      offer?.priceCurrency ?? extractMeta(html, ["product:price:currency", "og:price:currency"]),
    ).toUpperCase();
    return {
      title,
      slug: await makeUniqueSlug(context.supabase, title),
      description,
      image_urls,
      source_url: data.url,
      detected_price: detectedPrice,
      detected_currency: detectedCurrency || null,
    };
  });

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("products")
      .select("*, categories(slug, name)")
      .order("created_at", { ascending: false });
    const pub = getPublicSupabase();
    return Promise.all(
      (data ?? []).map(async (p: any) => ({
        ...p,
        signed_image_urls: await signImagePaths(pub, "product-images", p.image_urls),
      })),
    );
  });

const productInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .transform(slugify)
    .pipe(z.string().min(1).regex(/^[a-z0-9-]+$/, "lowercase, digits, hyphens only")),
  description: z.string().trim().max(5000).optional().nullable(),
  price_naira: z.number().int().min(0).max(100_000_000),
  category_id: z.string().uuid().nullable().optional(),
  image_urls: z.array(z.string()).default([]),
  is_trending: z.boolean().default(false),
  is_active: z.boolean().default(true),
  stock: z.number().int().min(0).default(0),
  source_url: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().url().max(2000).optional().nullable(),
  ),
  product_cost_naira: z.number().int().min(0).max(100_000_000).optional().nullable(),
  shipping_cost_naira: z.number().int().min(0).max(100_000_000).optional().nullable(),
  import_notes: z.string().trim().max(2000).optional().nullable(),
});

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productInput.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const payload = { ...data, slug: await makeUniqueSlug(context.supabase, data.slug, data.id) };
    if (data.id) {
      const { error } = await context.supabase.from("products").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("products")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("orders")
      .select("*, products(title)")
      .order("created_at", { ascending: false })
      .limit(500);
    return data ?? [];
  });

export const markOrderPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        bank_name: z.string().trim().max(120).nullable().optional(),
        account_number: z.string().trim().max(40).nullable().optional(),
        account_name: z.string().trim().max(120).nullable().optional(),
        whatsapp_link: z.string().trim().url().max(500).nullable().optional(),
        logo_url: z.string().trim().max(500).nullable().optional(),
        banner_url: z.string().trim().max(500).nullable().optional(),
        hero_slogan: z.string().trim().max(200).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("site_settings").update(data).eq("id", 1);
    if (error) throw error;
    return { ok: true };
  });
