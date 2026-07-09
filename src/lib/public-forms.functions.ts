import { createServerFn } from "@/lib/tanstack-start-compat";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function anonClient() {
  const SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL ??
    (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined);
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    (typeof process !== 'undefined' ? process.env.SUPABASE_PUBLISHABLE_KEY : undefined);

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
  }

  return createClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (!data) throw new Error("Réservé au staff.");
}

// Public — Contact form
const contactInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  subject: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().min(3).max(2000),
});
export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => contactInput.parse(d))
  .handler(async ({ data }) => {
    const sb = anonClient();
    const { error } = await sb.from("contact_messages").insert({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      subject: data.subject || null,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public — Product suggestion
const suggestInput = z.object({
  product_name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  suggester_name: z.string().trim().max(120).optional().or(z.literal("")),
  suggester_phone: z.string().trim().max(30).optional().or(z.literal("")),
  suggester_email: z.string().trim().email().max(160).optional().or(z.literal("")),
});
export const submitProductSuggestion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => suggestInput.parse(d))
  .handler(async ({ data }) => {
    const sb = anonClient();
    const { error } = await sb.from("product_suggestions").insert({
      product_name: data.product_name,
      description: data.description || null,
      suggester_name: data.suggester_name || null,
      suggester_phone: data.suggester_phone || null,
      suggester_email: data.suggester_email || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin — lists
export const listContactMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listProductSuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("product_suggestions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markContactHandled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), handled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("contact_messages").update({ handled: data.handled }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSuggestionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["new", "reviewing", "added", "rejected"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("product_suggestions").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const replyContactMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), reply: z.string().trim().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("contact_messages")
      .update({ admin_reply: data.reply, replied_at: new Date().toISOString(), handled: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const replyProductSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), reply: z.string().trim().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("product_suggestions")
      .update({ admin_reply: data.reply, replied_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

