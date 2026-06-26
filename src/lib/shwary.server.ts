// Shwary Mobile Money integration helper.
// Docs: https://github.com/shwary-co/shwary-doc/blob/main/merchant-fr.md
//
// Credentials (merchant_id, api_key, webhook_secret) are stored in
// shop_settings and managed by the admin via /admin/settings.
//
// NOTE: Endpoint path / payload field names may need to be adjusted
// to match Shwary's current spec; this file isolates the integration
// so only this one place needs to change.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SHWARY_API_BASE = process.env.SHWARY_API_BASE ?? "https://api.shwary.co";

export type InitiateInput = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerPhone: string;
  customerName: string;
};

export type InitiateResult = {
  reference?: string;
  paymentUrl?: string;
};

async function getCreds() {
  const { data, error } = await supabaseAdmin
    .from("shop_settings")
    .select("shwary_merchant_id, shwary_api_key")
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.shwary_merchant_id || !data?.shwary_api_key) {
    throw new Error("Shwary non configuré. Renseignez merchant_id et api_key dans /admin/settings.");
  }
  return { merchantId: data.shwary_merchant_id, apiKey: data.shwary_api_key };
}

export async function initiateShwaryPayment(input: InitiateInput): Promise<InitiateResult> {
  const { merchantId, apiKey } = await getCreds();

  const res = await fetch(`${SHWARY_API_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Merchant-Id": merchantId,
    },
    body: JSON.stringify({
      merchant_id: merchantId,
      reference: input.orderNumber,
      amount: input.amount,
      currency: input.currency,
      customer: { phone: input.customerPhone, name: input.customerName },
      metadata: { order_id: input.orderId },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Shwary ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = (await res.json().catch(() => ({}))) as {
    reference?: string;
    transaction_id?: string;
    payment_url?: string;
    redirect_url?: string;
  };
  return {
    reference: body.reference ?? body.transaction_id,
    paymentUrl: body.payment_url ?? body.redirect_url,
  };
}
