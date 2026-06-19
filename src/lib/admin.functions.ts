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
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9-]+$/, "lowercase, digits, hyphens only"),
  description: z.string().trim().max(5000).optional().nullable(),
  price_naira: z.number().int().min(0).max(100_000_000),
  category_id: z.string().uuid().nullable().optional(),
  image_urls: z.array(z.string()).default([]),
  is_trending: z.boolean().default(false),
  is_active: z.boolean().default(true),
  stock: z.number().int().min(0).default(0),
});

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productInput.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.id) {
      const { error } = await context.supabase.from("products").update(data).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("products")
      .insert(data)
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
