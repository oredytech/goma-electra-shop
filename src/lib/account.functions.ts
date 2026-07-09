import { createServerFn } from "@/lib/tanstack-start-compat";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles").select("*").eq("id", context.userId).maybeSingle();
    return data;
  });

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = context.claims?.email as string | undefined;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // orders linked either by user id or by same email (guest checkout)
    let query = supabaseAdmin
      .from("orders")
      .select("id, order_number, status, total, currency, created_at, channel, customer_name, customer_email, customer_user_id, order_items(id, name_snapshot, quantity, unit_price, line_total)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (email) {
      query = query.or(`customer_user_id.eq.${context.userId},customer_email.eq.${email}`);
    } else {
      query = query.eq("customer_user_id", context.userId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  });
