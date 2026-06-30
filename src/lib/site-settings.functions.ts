import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type PublicSiteSettings = {
  shop_name: string;
  shop_tagline: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp: string | null;
  facebook_url: string | null;
  address_line: string | null;
  city: string | null;
  country: string | null;
  business_hours: string | null;
  invoice_logo_url: string | null;
  invoice_signature_url: string | null;
  invoice_signatory_name: string | null;
  invoice_primary_color: string | null;
  invoice_accent_color: string | null;
  invoice_header_text: string | null;
  invoice_footer_text: string | null;
  invoice_layout: string | null;
  invoice_show_signature: boolean;
};

export const getPublicSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicSiteSettings> => {
    const sb = publicClient();
    const { data } = await sb
      .from("shop_settings")
      .select("shop_name, shop_tagline, contact_email, contact_phone, whatsapp, facebook_url, address_line, city, country, business_hours, invoice_logo_url, invoice_signature_url, invoice_signatory_name, invoice_primary_color, invoice_accent_color, invoice_header_text, invoice_footer_text, invoice_layout, invoice_show_signature")
      .eq("id", true)
      .maybeSingle();
    return {
      shop_name: data?.shop_name ?? "CONETEC",
      shop_tagline: data?.shop_tagline ?? null,
      contact_email: data?.contact_email ?? null,
      contact_phone: data?.contact_phone ?? null,
      whatsapp: data?.whatsapp ?? null,
      facebook_url: data?.facebook_url ?? null,
      address_line: data?.address_line ?? "Quartier Virunga, Av. OSSO N°18",
      city: data?.city ?? "Goma",
      country: data?.country ?? "RDC",
      business_hours: data?.business_hours ?? null,
      invoice_logo_url: (data as any)?.invoice_logo_url ?? null,
      invoice_signature_url: (data as any)?.invoice_signature_url ?? null,
      invoice_signatory_name: (data as any)?.invoice_signatory_name ?? null,
      invoice_primary_color: (data as any)?.invoice_primary_color ?? "#0c275d",
      invoice_accent_color: (data as any)?.invoice_accent_color ?? "#00796f",
      invoice_header_text: (data as any)?.invoice_header_text ?? null,
      invoice_footer_text: (data as any)?.invoice_footer_text ?? null,
      invoice_layout: (data as any)?.invoice_layout ?? "classic",
      invoice_show_signature: Boolean((data as any)?.invoice_show_signature),
    };
  },
);
