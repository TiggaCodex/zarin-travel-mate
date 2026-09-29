-- New accounts after the first start INACTIVE; only an admin (via staff management) activates them.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  assigned_role public.app_role;
  first_account boolean;
BEGIN
  first_account := NOT EXISTS (SELECT 1 FROM public.user_roles);
  INSERT INTO public.profiles (id, full_name, phone, is_active)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), NEW.raw_user_meta_data ->> 'phone', first_account)
  ON CONFLICT (id) DO NOTHING;
  assigned_role := CASE WHEN first_account THEN 'admin'::public.app_role ELSE 'staff'::public.app_role END;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role) ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Only administrators may change a profile's active status (blocks self-reactivation).
CREATE OR REPLACE FUNCTION public.guard_profile_update()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active AND auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an administrator can change account status.';
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS profiles_guard ON public.profiles;
CREATE TRIGGER profiles_guard BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

CREATE OR REPLACE FUNCTION public.other_active_admins(_user uuid)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT count(*)::int FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'admin' AND p.is_active AND ur.user_id <> _user;
$$;
REVOKE EXECUTE ON FUNCTION public.other_active_admins(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_staff_role(_user uuid, _role public.app_role)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only an administrator can change roles.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user) THEN RAISE EXCEPTION 'Account not found.'; END IF;
  IF _role = 'staff' AND public.has_role(_user, 'admin') AND public.other_active_admins(_user) = 0 THEN
    RAISE EXCEPTION 'This is the last active administrator. Make someone else an administrator first.';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user AND role <> _role;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user, _role) ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_staff_active(_user uuid, _active boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only an administrator can change account status.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user) THEN RAISE EXCEPTION 'Account not found.'; END IF;
  IF NOT _active AND _user = auth.uid() THEN RAISE EXCEPTION 'You cannot deactivate your own account.'; END IF;
  IF NOT _active AND public.has_role(_user, 'admin') AND public.other_active_admins(_user) = 0 THEN
    RAISE EXCEPTION 'This is the last active administrator and cannot be deactivated.';
  END IF;
  UPDATE public.profiles SET is_active = _active WHERE id = _user;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_set_staff_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_staff_active(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_staff_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_staff_active(uuid, boolean) TO authenticated;