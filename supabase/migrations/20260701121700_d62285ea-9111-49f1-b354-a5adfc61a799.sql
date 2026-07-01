
-- Open activity log read to admin + manager
DROP POLICY IF EXISTS "Admin read activity" ON public.activity_log;
CREATE POLICY "Admin manager read activity" ON public.activity_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

-- Generic logger trigger function
CREATE OR REPLACE FUNCTION public.log_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  act text;
  ent text := TG_TABLE_NAME;
  eid text;
  det jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN act := 'create'; eid := (to_jsonb(NEW)->>'id'); det := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN act := 'update'; eid := (to_jsonb(NEW)->>'id');
    det := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
  ELSE act := 'delete'; eid := (to_jsonb(OLD)->>'id'); det := to_jsonb(OLD);
  END IF;
  INSERT INTO public.activity_log(user_id, action, entity, entity_id, details)
  VALUES (auth.uid(), act, ent, eid, det);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach to key tables
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['orders','expenses','salary_payments','products','user_roles','shop_settings','employees','inventory_movements']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS log_%I ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER log_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_row_change()', t, t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS activity_log_created_idx ON public.activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_entity_idx ON public.activity_log(entity, created_at DESC);
