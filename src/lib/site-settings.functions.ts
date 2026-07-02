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
  instagram_url: string | null;
  linkedin_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  maps_url: string | null;
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
      .select("*")
      .eq("id", true)
      .maybeSingle();
    const d = (data ?? {}) as Record<string, unknown>;
    const s = <T,>(k: string, fb: T): T => (d[k] as T) ?? fb;
    return {
      shop_name: s("shop_name", "CONETEC"),
      shop_tagline: s("shop_tagline", null),
      contact_email: s("contact_email", null),
      contact_phone: s("contact_phone", null),
      whatsapp: s("whatsapp", null),
      facebook_url: s("facebook_url", null),
      instagram_url: s("instagram_url", null),
      linkedin_url: s("linkedin_url", null),
      tiktok_url: s("tiktok_url", null),
      youtube_url: s("youtube_url", null),
      twitter_url: s("twitter_url", null),
      website_url: s("website_url", null),
      maps_url: s("maps_url", null),
      address_line: s("address_line", "Quartier Virunga, Av. OSSO N°18"),
      city: s("city", "Goma"),
      country: s("country", "RDC"),
      business_hours: s("business_hours", null),
      invoice_logo_url: s("invoice_logo_url", null),
      invoice_signature_url: s("invoice_signature_url", null),
      invoice_signatory_name: s("invoice_signatory_name", null),
      invoice_primary_color: s("invoice_primary_color", "#0c275d"),
      invoice_accent_color: s("invoice_accent_color", "#00796f"),
      invoice_header_text: s("invoice_header_text", null),
      invoice_footer_text: s("invoice_footer_text", null),
      invoice_layout: s("invoice_layout", "classic"),
      invoice_show_signature: Boolean(d["invoice_show_signature"]),
    };
  },
);
