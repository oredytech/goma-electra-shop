ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS invoice_logo_url text,
  ADD COLUMN IF NOT EXISTS invoice_signature_url text,
  ADD COLUMN IF NOT EXISTS invoice_signatory_name text,
  ADD COLUMN IF NOT EXISTS invoice_primary_color text DEFAULT '#0c275d',
  ADD COLUMN IF NOT EXISTS invoice_accent_color text DEFAULT '#00796f',
  ADD COLUMN IF NOT EXISTS invoice_header_text text,
  ADD COLUMN IF NOT EXISTS invoice_footer_text text,
  ADD COLUMN IF NOT EXISTS invoice_layout text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS invoice_show_signature boolean NOT NULL DEFAULT false;

-- Refresh the public read policy to expose invoice branding to anon
DROP POLICY IF EXISTS "Public read contact info" ON public.shop_settings;
CREATE POLICY "Public read contact info" ON public.shop_settings
  FOR SELECT TO anon, authenticated USING (true);