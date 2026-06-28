
CREATE OR REPLACE FUNCTION public.handle_order_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it RECORD;
  existing_stock INT;
BEGIN
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    INSERT INTO public.invoices (order_id, total, currency)
    VALUES (NEW.id, NEW.total, NEW.currency)
    ON CONFLICT (order_id) DO UPDATE
      SET total = EXCLUDED.total, currency = EXCLUDED.currency;

    FOR it IN SELECT product_id, quantity, name_snapshot FROM public.order_items WHERE order_id = NEW.id AND product_id IS NOT NULL LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.inventory_movements
        WHERE product_id = it.product_id AND reference = 'order:' || NEW.id::text
      ) THEN
        SELECT stock INTO existing_stock FROM public.products WHERE id = it.product_id FOR UPDATE;
        UPDATE public.products SET stock = GREATEST(0, existing_stock - it.quantity) WHERE id = it.product_id;
        INSERT INTO public.inventory_movements (product_id, type, quantity, reason, reference)
        VALUES (it.product_id, 'out', it.quantity, 'Vente commande ' || NEW.order_number, 'order:' || NEW.id::text);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_paid ON public.orders;
CREATE TRIGGER trg_orders_paid
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_paid();

-- Storage policies for product-images bucket (private; signed URLs used)
DROP POLICY IF EXISTS "Staff upload product images" ON storage.objects;
CREATE POLICY "Staff upload product images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff update product images" ON storage.objects;
CREATE POLICY "Staff update product images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff delete product images" ON storage.objects;
CREATE POLICY "Staff delete product images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff read product images" ON storage.objects;
CREATE POLICY "Staff read product images" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'product-images' AND public.is_staff(auth.uid()));
