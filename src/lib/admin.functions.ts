import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// All admin server fns: validate staff role first.
async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: vous n'êtes pas membre du staff.");
}

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map((r: any) => r.role as string);
    return {
      roles,
      isAdmin: roles.includes("admin"),
      isStaff: roles.some((r) => ["admin", "manager", "staff"].includes(r)),
    };
  });

// -------- PRODUCTS --------
const productInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(160).regex(/^[a-z0-9-]+$/, "slug: a-z, 0-9, -"),
  sku: z.string().trim().max(60).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  category_id: z.string().uuid().nullable().optional(),
  price_usd: z.number().min(0),
  price_cdf: z.number().min(0).default(0),
  stock: z.number().int().min(0),
  min_stock: z.number().int().min(0).default(0),
  image_url: z.string().url().max(500).optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => productInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      ...data,
      sku: data.sku || null,
      description: data.description || null,
      image_url: data.image_url || null,
      category_id: data.category_id || null,
    };
    const q = data.id
      ? supabaseAdmin.from("products").update(payload).eq("id", data.id).select().single()
      : supabaseAdmin.from("products").insert(payload).select().single();
    const { data: p, error } = await q;
    if (error) throw new Error(error.message);
    return p;
  });

export const listProductsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id, sku, slug, name, price_usd, stock, min_stock, is_active, image_url, category_id, categories(name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- STOCK --------
const stockInput = z.object({
  product_id: z.string().uuid(),
  type: z.enum(["in", "out", "adjust"]),
  quantity: z.number().int().min(1).max(100000),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
});

export const recordStockMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => stockInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p, error } = await supabaseAdmin
      .from("products").select("id, stock, name").eq("id", data.product_id).single();
    if (error || !p) throw new Error(error?.message ?? "Produit introuvable");
    let nextStock = p.stock;
    if (data.type === "in") nextStock = p.stock + data.quantity;
    else if (data.type === "out") nextStock = Math.max(0, p.stock - data.quantity);
    else nextStock = data.quantity;

    const { error: mErr } = await supabaseAdmin.from("inventory_movements").insert({
      product_id: data.product_id,
      type: data.type,
      quantity: data.quantity,
      reason: data.reason || null,
      reference: data.reference || null,
      created_by: context.userId,
    });
    if (mErr) throw new Error(mErr.message);

    const { error: uErr } = await supabaseAdmin.from("products").update({ stock: nextStock }).eq("id", data.product_id);
    if (uErr) throw new Error(uErr.message);

    return { ok: true, newStock: nextStock };
  });

export const listInventoryMovements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("inventory_movements")
      .select("id, type, quantity, reason, reference, created_at, products(name, sku)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// -------- ORDERS --------
export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, customer_name, customer_phone, customer_email, neighborhood, total, currency, status, channel, payment_method, created_at, paid_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getOrderDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: order }, { data: items }, { data: invoice }] = await Promise.all([
      supabaseAdmin.from("orders").select("*").eq("id", data.id).single(),
      supabaseAdmin.from("order_items").select("*").eq("order_id", data.id),
      supabaseAdmin.from("invoices").select("*").eq("order_id", data.id).maybeSingle(),
    ]);
    return { order, items: items ?? [], invoice };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["pending", "paid", "failed", "delivered", "cancelled"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from("orders").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.status === "paid") {
      await supabaseAdmin.from("invoices").upsert(
        { order_id: data.id, total: 0, currency: "USD" },
        { onConflict: "order_id", ignoreDuplicates: true },
      );
      // refresh total from order
      const { data: o } = await supabaseAdmin.from("orders").select("total, currency").eq("id", data.id).single();
      if (o) await supabaseAdmin.from("invoices").update({ total: o.total, currency: o.currency }).eq("order_id", data.id);
    }
    return { ok: true };
  });

// -------- SETTINGS --------
const settingsInput = z.object({
  shwary_merchant_id: z.string().trim().max(160).optional().or(z.literal("")),
  shwary_api_key: z.string().trim().max(400).optional().or(z.literal("")),
  shwary_webhook_secret: z.string().trim().max(400).optional().or(z.literal("")),
  contact_email: z.string().trim().email().max(160).optional().or(z.literal("")),
  contact_phone: z.string().trim().max(40).optional().or(z.literal("")),
  delivery_fee: z.number().min(0).default(0),
  default_currency: z.enum(["USD", "CDF"]).default("USD"),
});

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Admin only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("shop_settings").select("*").eq("id", true).single();
    if (error) throw new Error(error.message);
    // mask api_key
    return {
      ...data,
      shwary_api_key: data.shwary_api_key ? "••••••••" + data.shwary_api_key.slice(-4) : "",
    };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Admin only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Don't overwrite api_key if user submitted masked value
    const patch: Record<string, unknown> = { ...data };
    if (typeof patch.shwary_api_key === "string" && patch.shwary_api_key.startsWith("••")) {
      delete patch.shwary_api_key;
    }
    const { error } = await supabaseAdmin.from("shop_settings").update(patch).eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- REPORTS --------
const reportInput = z.object({
  from: z.string(),
  to: z.string(),
});

export const salesReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reportInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("id, total, currency, status, channel, created_at, paid_at")
      .gte("created_at", data.from)
      .lte("created_at", data.to);
    if (error) throw new Error(error.message);
    const all = orders ?? [];
    const paid = all.filter((o) => o.status === "paid" || o.status === "delivered");
    const totalRevenue = paid.reduce((s, o) => s + Number(o.total), 0);
    const pendingCount = all.filter((o) => o.status === "pending").length;
    return {
      ordersCount: all.length,
      paidCount: paid.length,
      pendingCount,
      totalRevenue,
      currency: paid[0]?.currency ?? "USD",
      orders: all,
    };
  });
