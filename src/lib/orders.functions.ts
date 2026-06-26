import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Guest checkout: anyone can place an order. Uses supabaseAdmin to bypass RLS
// since order/items writes are controlled server-side.
const placeOrderInput = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(7).max(20),
    email: z.string().trim().email().max(160).optional().or(z.literal("")),
    address: z.string().trim().min(3).max(300),
    neighborhood: z.string().trim().min(2).max(120),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  }),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(999),
  })).min(1).max(50),
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => placeOrderInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = data.items.map((i) => i.productId);

    // Re-fetch products server-side for authoritative pricing & stock
    const { data: products, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id, name, price_usd, stock, is_active")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);

    let subtotal = 0;
    const lines = data.items.map((i) => {
      const p = products?.find((x) => x.id === i.productId);
      if (!p || !p.is_active) throw new Error("Produit indisponible");
      if (p.stock < i.quantity) throw new Error(`Stock insuffisant pour ${p.name}`);
      const unit = Number(p.price_usd);
      const line = unit * i.quantity;
      subtotal += line;
      return {
        product_id: p.id,
        name_snapshot: p.name,
        unit_price: unit,
        quantity: i.quantity,
        line_total: line,
      };
    });

    // Read delivery fee from settings
    const { data: settings } = await supabaseAdmin
      .from("shop_settings")
      .select("delivery_fee, default_currency")
      .eq("id", true)
      .maybeSingle();
    const delivery_fee = Number(settings?.delivery_fee ?? 0);
    const total = subtotal + delivery_fee;
    const currency = settings?.default_currency ?? "USD";

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer.name,
        customer_phone: data.customer.phone,
        customer_email: data.customer.email || null,
        delivery_address: data.customer.address,
        neighborhood: data.customer.neighborhood,
        notes: data.customer.notes || null,
        subtotal,
        delivery_fee,
        total,
        currency,
        status: "pending",
        channel: "online",
        payment_method: "mobile_money_shwary",
      })
      .select("id, order_number, total, currency")
      .single();
    if (oErr || !order) throw new Error(oErr?.message ?? "Erreur création commande");

    const { error: iErr } = await supabaseAdmin
      .from("order_items")
      .insert(lines.map((l) => ({ ...l, order_id: order.id })));
    if (iErr) throw new Error(iErr.message);

    // Initiate Shwary payment (best-effort; webhook will confirm)
    let paymentUrl: string | null = null;
    try {
      const { initiateShwaryPayment } = await import("./shwary.server");
      const r = await initiateShwaryPayment({
        orderId: order.id,
        orderNumber: order.order_number,
        amount: Number(order.total),
        currency: order.currency,
        customerPhone: data.customer.phone,
        customerName: data.customer.name,
      });
      paymentUrl = r.paymentUrl ?? null;
      if (r.reference) {
        await supabaseAdmin.from("orders").update({ shwary_reference: r.reference }).eq("id", order.id);
      }
    } catch (e) {
      console.error("Shwary init failed:", e);
    }

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      total: Number(order.total),
      currency: order.currency,
      paymentUrl,
    };
  });
