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
};

export const getPublicSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicSiteSettings> => {
    const sb = publicClient();
    const { data } = await sb
      .from("shop_settings")
      .select("shop_name, shop_tagline, contact_email, contact_phone, whatsapp, facebook_url, address_line, city, country, business_hours")
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
    };
  },
);
