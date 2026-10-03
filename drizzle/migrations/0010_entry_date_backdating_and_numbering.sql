CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(current_setting('zarin.renumbering', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_transaction_entry_date() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.register_date IS NULL THEN
    NEW.register_date := (now() AT TIME ZONE 'Africa/Lagos')::date;
  END IF;
  IF NEW.register_date > (now() AT TIME ZONE 'Africa/Lagos')::date THEN
    RAISE EXCEPTION 'The entry date cannot be in the future.';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.created_at := OLD.created_at; -- submission timestamp is immutable
  ELSE
    NEW.created_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_transaction_entry_date ON public.transactions;
CREATE TRIGGER trg_guard_transaction_entry_date BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.guard_transaction_entry_date();

CREATE OR REPLACE FUNCTION public.renumber_transactions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(current_setting('zarin.renumbering', true), '') = 'on' THEN
    RETURN NULL;
  END IF;
  PERFORM set_config('zarin.renumbering', 'on', true);
  PERFORM pg_advisory_xact_lock(hashtext('zarin_renumber'));
  UPDATE public.transactions t SET serial_number = -o.rn
  FROM (SELECT id, row_number() OVER (ORDER BY register_date, created_at, id) AS rn FROM public.transactions) o
  WHERE o.id = t.id AND t.serial_number IS DISTINCT FROM o.rn;
  UPDATE public.transactions SET serial_number = -serial_number WHERE serial_number < 0;
  PERFORM setval('public.transaction_serial_seq', greatest((SELECT count(*) FROM public.transactions), 1));
  PERFORM set_config('zarin.renumbering', 'off', true);
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.renumber_transactions() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_renumber_transactions ON public.transactions;
CREATE TRIGGER trg_renumber_transactions AFTER INSERT OR UPDATE OF register_date ON public.transactions
FOR EACH STATEMENT EXECUTE FUNCTION public.renumber_transactions();

-- Renumber existing records once
DO $$ BEGIN
  PERFORM set_config('zarin.renumbering', 'on', true);
  UPDATE public.transactions t SET serial_number = -o.rn
  FROM (SELECT id, row_number() OVER (ORDER BY register_date, created_at, id) AS rn FROM public.transactions) o
  WHERE o.id = t.id;
  UPDATE public.transactions SET serial_number = -serial_number WHERE serial_number < 0;
  PERFORM setval('public.transaction_serial_seq', greatest((SELECT count(*) FROM public.transactions), 1));
END $$;