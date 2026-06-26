import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Shwary payment webhook.
// Configure URL chez Shwary: https://<your-domain>/api/public/webhooks/shwary
// Secret HMAC: à renseigner dans /admin/settings (shwary_webhook_secret)
//
// Spec (à confirmer avec la doc Shwary):
// - Header 'X-Shwary-Signature' : HMAC SHA256 hex du raw body
// - Body JSON: { reference, status, transaction_id, amount, currency, ... }

export const Route = createFileRoute("/api/public/webhooks/shwary")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-shwary-signature") ?? "";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Fetch secret
        const { data: settings } = await supabaseAdmin
          .from("shop_settings")
          .select("shwary_webhook_secret")
          .eq("id", true)
          .maybeSingle();
        const secret = settings?.shwary_webhook_secret;

        if (secret) {
          if (!signature) return new Response("Missing signature", { status: 401 });
          const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
          const sig = Buffer.from(signature, "utf8");
          const exp = Buffer.from(expected, "utf8");
          if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
            return new Response("Invalid signature", { status: 401 });
          }
        } else {
          console.warn("[shwary-webhook] No webhook secret configured — accepting unsigned payload (configure secret in /admin/settings)");
        }

        let payload: any;
        try { payload = JSON.parse(rawBody); }
        catch { return new Response("Invalid JSON", { status: 400 }); }

        const reference: string | undefined = payload.reference ?? payload.order_reference;
        const status: string | undefined = payload.status;
        const transactionId: string | undefined = payload.transaction_id ?? payload.id;

        if (!reference) return new Response("Missing reference", { status: 400 });

        // Map Shwary status -> our order status
        const mapped =
          status === "success" || status === "paid" || status === "completed" ? "paid" :
          status === "failed" || status === "cancelled" ? "failed" :
          "pending";

        const patch: { status: "paid" | "failed" | "pending"; payment_reference: string | null; paid_at?: string } = {
          status: mapped,
          payment_reference: transactionId ?? null,
        };
        if (mapped === "paid") patch.paid_at = new Date().toISOString();

        const { data: order, error } = await supabaseAdmin
          .from("orders")
          .update(patch)
          .eq("order_number", reference)
          .select("id, total, currency")
          .maybeSingle();

        if (error) {
          console.error("[shwary-webhook] DB error:", error);
          return new Response("DB error", { status: 500 });
        }

        // Create invoice on payment
        if (order && mapped === "paid") {
          await supabaseAdmin.from("invoices").upsert(
            { order_id: order.id, total: order.total, currency: order.currency },
            { onConflict: "order_id" },
          );
          // TODO: email invoice to customer once email domain is configured
        }

        return Response.json({ ok: true });
      },
    },
  },
});
