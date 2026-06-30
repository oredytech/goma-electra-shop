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
    const patch: { status: typeof data.status; paid_at?: string } = { status: data.status };
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
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  facebook_url: z.string().trim().max(300).optional().or(z.literal("")),
  address_line: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  business_hours: z.string().trim().max(200).optional().or(z.literal("")),
  shop_name: z.string().trim().max(120).optional().or(z.literal("")),
  shop_tagline: z.string().trim().max(300).optional().or(z.literal("")),
  delivery_fee: z.number().min(0).default(0),
  default_currency: z.enum(["USD", "CDF"]).default("USD"),
  invoice_logo_url: z.string().trim().max(500000).optional().or(z.literal("")).nullable(),
  invoice_signature_url: z.string().trim().max(500000).optional().or(z.literal("")).nullable(),
  invoice_signatory_name: z.string().trim().max(120).optional().or(z.literal("")).nullable(),
  invoice_primary_color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal("")).nullable(),
  invoice_accent_color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal("")).nullable(),
  invoice_header_text: z.string().trim().max(400).optional().or(z.literal("")).nullable(),
  invoice_footer_text: z.string().trim().max(200).optional().or(z.literal("")).nullable(),
  invoice_layout: z.enum(["classic", "modern", "minimal"]).optional(),
  invoice_show_signature: z.boolean().optional(),
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
    const { shwary_api_key, ...rest } = data;
    const patch: typeof data | Omit<typeof data, "shwary_api_key"> =
      typeof shwary_api_key === "string" && shwary_api_key.startsWith("••")
        ? rest
        : data;
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

// -------- TEAM / ROLES --------
const ROLE_VALUES = ["admin", "manager", "staff", "customer"] as const;

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Réservé aux administrateurs.");
}

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: cErr } = await supabaseAdmin
      .from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin");
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) throw new Error("Un administrateur existe déjà. Demandez-lui de vous attribuer un rôle.");
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    const { data: roles, error: rErr } = await supabaseAdmin.from("user_roles").select("user_id, role");
    if (rErr) throw new Error(rErr.message);
    const byUser = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    });
    return (users.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      roles: byUser.get(u.id) ?? [],
    }));
  });

const roleMutInput = z.object({
  user_id: z.string().uuid(),
  role: z.enum(ROLE_VALUES),
});

export const assignRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => roleMutInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => roleMutInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId && data.role === "admin") {
      const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");
      const { count } = await sa.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin");
      if ((count ?? 0) <= 1) throw new Error("Impossible : vous êtes le dernier administrateur.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles").delete().eq("user_id", data.user_id).eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- DIRECT SALE (vente comptoir) --------
const directSaleInput = z.object({
  customer_name: z.string().trim().max(120).optional().or(z.literal("")),
  customer_phone: z.string().trim().max(20).optional().or(z.literal("")),
  payment_method: z.enum(["cash", "mobile_money", "card"]).default("cash"),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(999),
  })).min(1).max(50),
});

export const createDirectSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => directSaleInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = data.items.map((i) => i.product_id);
    const { data: products, error: pErr } = await supabaseAdmin
      .from("products").select("id, name, price_usd, stock, is_active").in("id", ids);
    if (pErr) throw new Error(pErr.message);
    let subtotal = 0;
    const lines = data.items.map((i) => {
      const p = products?.find((x) => x.id === i.product_id);
      if (!p || !p.is_active) throw new Error("Produit indisponible");
      if (p.stock < i.quantity) throw new Error(`Stock insuffisant pour ${p.name}`);
      const unit = Number(p.price_usd);
      const total = unit * i.quantity;
      subtotal += total;
      return { product_id: p.id, name_snapshot: p.name, unit_price: unit, quantity: i.quantity, line_total: total };
    });
    const { data: settings } = await supabaseAdmin
      .from("shop_settings").select("default_currency").eq("id", true).maybeSingle();
    const currency = settings?.default_currency ?? "USD";
    const { data: order, error: oErr } = await supabaseAdmin.from("orders").insert({
      customer_name: data.customer_name?.trim() || "Client comptoir",
      customer_phone: data.customer_phone?.trim() || "—",
      delivery_address: "Boutique CONETEC – Av. OSSO 18, Virunga",
      neighborhood: "Virunga (comptoir)",
      subtotal, delivery_fee: 0, total: subtotal, currency,
      status: "paid", channel: "offline",
      payment_method: data.payment_method,
      paid_at: new Date().toISOString(),
    }).select("id, order_number, total, currency").single();
    if (oErr || !order) throw new Error(oErr?.message ?? "Erreur création vente");
    const { error: iErr } = await supabaseAdmin
      .from("order_items").insert(lines.map((l) => ({ ...l, order_id: order.id })));
    if (iErr) throw new Error(iErr.message);
    // Trigger handle_order_paid creates invoice + deducts stock automatically.
    return { orderId: order.id, orderNumber: order.order_number, total: Number(order.total), currency: order.currency };
  });

// -------- IMAGE UPLOAD --------
const uploadInput = z.object({
  filename: z.string().min(1).max(160),
  contentType: z.string().min(3).max(80),
  // base64 (without data: prefix), max ~4MB
  base64: z.string().min(10).max(6_000_000),
});

export const uploadProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uploadInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = (data.filename.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${context.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = Buffer.from(data.base64, "base64");
    const { error: upErr } = await supabaseAdmin.storage
      .from("product-images")
      .upload(path, buf, { contentType: data.contentType, upsert: false });
    if (upErr) throw new Error(upErr.message);
    // 10-year signed URL
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (sErr || !signed) throw new Error(sErr?.message ?? "Signed URL error");
    return { url: signed.signedUrl, path };
  });

