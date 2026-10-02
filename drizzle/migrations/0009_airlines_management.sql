CREATE OR REPLACE FUNCTION public.normalize_airline() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.name := btrim(regexp_replace(COALESCE(NEW.name,''), '\s+', ' ', 'g'));
  IF NEW.name = '' THEN RAISE EXCEPTION 'Airline name is required.'; END IF;
  IF length(NEW.name) > 100 THEN RAISE EXCEPTION 'Airline name must be 100 characters or fewer.'; END IF;
  IF EXISTS (SELECT 1 FROM public.airlines WHERE lower(name) = lower(NEW.name) AND id <> NEW.id) THEN
    RAISE EXCEPTION 'An airline named "%" already exists.', NEW.name;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS airlines_normalize ON public.airlines;
CREATE TRIGGER airlines_normalize BEFORE INSERT OR UPDATE ON public.airlines FOR EACH ROW EXECUTE FUNCTION public.normalize_airline();
CREATE UNIQUE INDEX IF NOT EXISTS airlines_name_lower_key ON public.airlines (lower(name));
INSERT INTO public.airlines (name, scope)
SELECT v.name, v.scope::public.airline_scope FROM (VALUES
 ('Air Peace','local'),('Ibom Air','local'),('United Nigeria Airlines','local'),('Green Africa Airways','local'),('Overland Airways','local'),('Max Air','local'),
 ('Qatar Airways','international'),('Emirates','international'),('Ethiopian Airlines','international'),('British Airways','international'),('Turkish Airlines','international'),('Kenya Airways','international')
) v(name, scope)
WHERE NOT EXISTS (SELECT 1 FROM public.airlines a WHERE lower(a.name) = lower(v.name));