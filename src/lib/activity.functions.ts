import { createServerFn } from "@/lib/tanstack-start-compat";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertManagerOrAdmin(ctx: { supabase: any; userId: string }) {
  const [a, m] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "manager" }),
  ]);
  if (!(a.data || m.data)) throw new Error("Réservé aux administrateurs et managers.");
}

const filterInput = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  entity: z.string().optional(),
  action: z.enum(["create", "update", "delete"]).optional(),
  limit: z.number().int().min(1).max(2000).default(500),
});

export const listActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => filterInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertManagerOrAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("activity_log")
      .select("id, user_id, action, entity, entity_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.entity) q = q.eq("entity", data.entity);
    if (data.action) q = q.eq("action", data.action);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Resolve emails
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id).filter(Boolean))) as string[];
    const users = new Map<string, string>();
    if (ids.length) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      list?.users?.forEach((u) => users.set(u.id, u.email ?? ""));
    }
    return (rows ?? []).map((r) => ({ ...r, user_email: r.user_id ? users.get(r.user_id) ?? "—" : "système" }));
  });
