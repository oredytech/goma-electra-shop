
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS admin_reply text;
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS replied_at timestamptz;
ALTER TABLE public.product_suggestions ADD COLUMN IF NOT EXISTS admin_reply text;
ALTER TABLE public.product_suggestions ADD COLUMN IF NOT EXISTS replied_at timestamptz;
