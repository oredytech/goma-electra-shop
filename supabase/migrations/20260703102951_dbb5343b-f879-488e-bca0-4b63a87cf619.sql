-- 1) CUSTOMERS repertory
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  neighborhood TEXT,
  address TEXT,
  notes TEXT,
  total_spent NUMERIC(14,2) NOT NULL DEFAULT 0,
  orders_count INT NOT NULL DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_key ON public.customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS customers_email_idx ON public.customers(email);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read customers" ON public.customers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage customers" ON public.customers FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: upsert customer on order create + refresh stats on paid
CREATE OR REPLACE FUNCTION public.sync_customer_from_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid UUID;
BEGIN
  IF NEW.customer_phone IS NULL OR length(trim(NEW.customer_phone)) = 0 THEN RETURN NEW; END IF;
  SELECT id INTO cid FROM public.customers WHERE phone = NEW.customer_phone LIMIT 1;
  IF cid IS NULL THEN
    INSERT INTO public.customers(full_name, phone, email, neighborhood)
    VALUES (COALESCE(NEW.customer_name,'Client'), NEW.customer_phone, NEW.customer_email, NEW.neighborhood)
    RETURNING id INTO cid;
  ELSE
    UPDATE public.customers SET
      full_name = COALESCE(NULLIF(NEW.customer_name,''), full_name),
      email = COALESCE(NULLIF(NEW.customer_email,''), email),
      neighborhood = COALESCE(NULLIF(NEW.neighborhood,''), neighborhood)
    WHERE id = cid;
  END IF;
  IF NEW.status IN ('paid','delivered') AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.customers SET
      total_spent = total_spent + NEW.total,
      orders_count = orders_count + 1,
      last_order_at = now()
    WHERE id = cid;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_customer_from_order ON public.orders;
CREATE TRIGGER trg_sync_customer_from_order AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_customer_from_order();

-- 2) CUSTOMER CREDITS (dettes)
CREATE TABLE IF NOT EXISTS public.customer_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  balance NUMERIC(14,2) NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open',  -- open | partial | paid | overdue
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_credits TO authenticated;
GRANT ALL ON public.customer_credits TO service_role;
ALTER TABLE public.customer_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read credits" ON public.customer_credits FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage credits" ON public.customer_credits FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_credits_updated BEFORE UPDATE ON public.customer_credits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.credit_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id UUID NOT NULL REFERENCES public.customer_credits(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_payments TO authenticated;
GRANT ALL ON public.credit_payments TO service_role;
ALTER TABLE public.credit_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read credit_payments" ON public.credit_payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage credit_payments" ON public.credit_payments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.apply_credit_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_balance NUMERIC;
BEGIN
  UPDATE public.customer_credits SET balance = GREATEST(0, balance - NEW.amount) WHERE id = NEW.credit_id RETURNING balance INTO new_balance;
  UPDATE public.customer_credits SET status = CASE WHEN new_balance <= 0 THEN 'paid' WHEN new_balance < amount THEN 'partial' ELSE status END WHERE id = NEW.credit_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_apply_credit_payment ON public.credit_payments;
CREATE TRIGGER trg_apply_credit_payment AFTER INSERT ON public.credit_payments FOR EACH ROW EXECUTE FUNCTION public.apply_credit_payment();

-- Auto-overdue nightly (called by cron / manually)
CREATE OR REPLACE FUNCTION public.refresh_credit_overdue()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.customer_credits
    SET status = 'overdue'
    WHERE status IN ('open','partial') AND due_date IS NOT NULL AND due_date < CURRENT_DATE;
$$;
GRANT EXECUTE ON FUNCTION public.refresh_credit_overdue() TO authenticated;

-- 3) EXCHANGE RATE + product suggestions on shop_settings
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS usd_to_cdf NUMERIC(14,4) DEFAULT 2800,
  ADD COLUMN IF NOT EXISTS rate_updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS rate_source TEXT DEFAULT 'manual';

-- 4) CONTACT & SUGGESTIONS
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  handled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT INSERT ON public.contact_messages TO anon;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can send contact" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff read contact" ON public.contact_messages FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage contact" ON public.contact_messages FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.product_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  description TEXT,
  suggester_name TEXT,
  suggester_phone TEXT,
  suggester_email TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new | reviewing | added | rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_suggestions TO authenticated;
GRANT INSERT ON public.product_suggestions TO anon;
GRANT ALL ON public.product_suggestions TO service_role;
ALTER TABLE public.product_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can suggest" ON public.product_suggestions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff read suggestions" ON public.product_suggestions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage suggestions" ON public.product_suggestions FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 5) SALARY PAID -> AUTO EXPENSE
INSERT INTO public.expense_categories(name, color) VALUES
  ('Loyer', '#f59e0b'),
  ('Salaires', '#10b981')
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.salary_to_expense()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cat UUID; emp_name TEXT;
BEGIN
  IF NEW.status = 'paid' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    SELECT id INTO cat FROM public.expense_categories WHERE name = 'Salaires' LIMIT 1;
    SELECT full_name INTO emp_name FROM public.employees WHERE id = NEW.employee_id;
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE notes = 'salary:' || NEW.id::text) THEN
      INSERT INTO public.expenses(category_id, label, amount, currency, expense_date, status, payment_method, notes, created_by)
      VALUES (cat, 'Salaire — ' || COALESCE(emp_name,'employé') || ' (' || to_char(NEW.period_month, 'MM/YYYY') || ')',
              NEW.amount, NEW.currency, COALESCE(NEW.paid_at::date, CURRENT_DATE),
              'paid', NEW.payment_method, 'salary:' || NEW.id::text, NEW.created_by);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_salary_to_expense ON public.salary_payments;
CREATE TRIGGER trg_salary_to_expense AFTER INSERT OR UPDATE ON public.salary_payments FOR EACH ROW EXECUTE FUNCTION public.salary_to_expense();

-- 6) SEED default categories requested
INSERT INTO public.categories(slug, name, position) VALUES
  ('accessoires-telephoniques', 'Accessoires téléphoniques', 10),
  ('vetement-accessoires', 'Vêtement et accessoires', 20),
  ('informatique', 'Informatique', 30),
  ('electronique-grand-public', 'Électronique grand public', 40),
  ('composants-electroniques', 'Composants électroniques', 50),
  ('electricite', 'Électricité', 60),
  ('medical-sante', 'Médical et Santé', 70),
  ('autres', 'Autres', 999)
ON CONFLICT (slug) DO NOTHING;