import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("categories")
    .select("id, slug, name, description, position")
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

const listProductsInput = z.object({
  categorySlug: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(48),
});

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => listProductsInput.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb
      .from("products")
      .select("id, sku, slug, name, description, price_usd, stock, image_url, category_id, categories(slug, name)")
      .eq("is_active", true)
      .limit(data.limit);

    if (data.categorySlug) {
      const { data: cat } = await sb.from("categories").select("id").eq("slug", data.categorySlug).maybeSingle();
      if (cat) q = q.eq("category_id", cat.id);
    }
    if (data.search && data.search.trim().length > 0) {
      const s = `%${data.search.trim()}%`;
      q = q.or(`name.ilike.${s},description.ilike.${s},sku.ilike.${s}`);
    }
    const { data: rows, error } = await q.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: p, error } = await sb
      .from("products")
      .select("id, sku, slug, name, description, price_usd, price_cdf, stock, image_url, category_id, categories(slug, name)")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return p;
  });
