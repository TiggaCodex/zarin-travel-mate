-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.airline_scope AS ENUM ('local', 'international');
CREATE TYPE public.travel_class AS ENUM ('economy', 'premium_economy', 'business', 'first');
CREATE TYPE public.payment_method AS ENUM ('cash', 'transfer', 'pos', 'other');
CREATE TYPE public.transaction_status AS ENUM ('active', 'cancelled');
CREATE TYPE public.reminder_kind AS ENUM ('departure', 'return');
CREATE TYPE public.reminder_status AS ENUM ('pending', 'sent', 'dismissed');

-- Shared updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_staff_member()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid() AND p.is_active
  );
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profile / role policies
CREATE POLICY "Users read own profile" ON public.profiles
FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Staff read profiles" ON public.profiles
FOR SELECT TO authenticated USING (public.is_staff_member());
CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins update profiles" ON public.profiles
FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users read own roles" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.is_admin());

-- Airlines
CREATE TABLE public.airlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  scope public.airline_scope NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.airlines TO authenticated;
GRANT ALL ON public.airlines TO service_role;
ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER airlines_updated_at BEFORE UPDATE ON public.airlines
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Staff read airlines" ON public.airlines
FOR SELECT TO authenticated USING (public.is_staff_member());
CREATE POLICY "Admins insert airlines" ON public.airlines
FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update airlines" ON public.airlines
FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Staff read clients" ON public.clients
FOR SELECT TO authenticated USING (public.is_staff_member());
CREATE POLICY "Staff insert clients" ON public.clients
FOR INSERT TO authenticated WITH CHECK (public.is_staff_member() AND created_by = auth.uid());
CREATE POLICY "Owner or admin update clients" ON public.clients
FOR UPDATE TO authenticated
USING (public.is_admin() OR (public.is_staff_member() AND created_by = auth.uid()))
WITH CHECK (public.is_admin() OR (public.is_staff_member() AND created_by = auth.uid()));

-- Transactions
CREATE SEQUENCE public.transaction_serial_seq START 1;

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number INTEGER NOT NULL UNIQUE DEFAULT nextval('public.transaction_serial_seq'),
  register_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  airline_id UUID NOT NULL REFERENCES public.airlines(id),
  travel_class public.travel_class NOT NULL DEFAULT 'economy',
  departure_date DATE NOT NULL,
  return_date DATE,
  client_fare INTEGER NOT NULL CHECK (client_fare >= 0),
  payable INTEGER NOT NULL CHECK (payable >= 0),
  pnr TEXT,
  pickup_dropoff TEXT,
  remark TEXT,
  status public.transaction_status NOT NULL DEFAULT 'active',
  cancel_reason TEXT,
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT client_fare_not_below_payable CHECK (client_fare >= payable),
  CONSTRAINT return_after_departure CHECK (return_date IS NULL OR return_date >= departure_date),
  CONSTRAINT cancelled_needs_reason CHECK (
    status <> 'cancelled' OR (cancel_reason IS NOT NULL AND length(btrim(cancel_reason)) > 0)
  )
);
GRANT SELECT, INSERT, UPDATE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.transaction_serial_seq TO authenticated, service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX transactions_departure_date_idx ON public.transactions (departure_date);
CREATE INDEX transactions_return_date_idx ON public.transactions (return_date);
CREATE INDEX transactions_client_idx ON public.transactions (client_id);

CREATE POLICY "Staff read transactions" ON public.transactions
FOR SELECT TO authenticated USING (public.is_staff_member());
CREATE POLICY "Staff insert transactions" ON public.transactions
FOR INSERT TO authenticated
WITH CHECK (public.is_staff_member() AND created_by = auth.uid() AND status = 'active');
CREATE POLICY "Owner or admin update transactions" ON public.transactions
FOR UPDATE TO authenticated
USING (
  status = 'active' AND (public.is_admin() OR (public.is_staff_member() AND created_by = auth.uid()))
)
WITH CHECK (
  public.is_admin() OR (public.is_staff_member() AND created_by = auth.uid() AND status = 'active')
);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT,
  amount INTEGER NOT NULL CHECK (amount > 0),
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  method public.payment_method NOT NULL DEFAULT 'cash',
  reference TEXT,
  note TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX payments_transaction_idx ON public.payments (transaction_id);

CREATE POLICY "Staff read payments" ON public.payments
FOR SELECT TO authenticated USING (public.is_staff_member());
CREATE POLICY "Staff insert payments" ON public.payments
FOR INSERT TO authenticated WITH CHECK (public.is_staff_member() AND recorded_by = auth.uid());

-- Overpayment + cancelled guard
CREATE OR REPLACE FUNCTION public.validate_payment()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  t RECORD;
  already INTEGER;
BEGIN
  SELECT client_fare, status INTO t FROM public.transactions WHERE id = NEW.transaction_id;
  IF t IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  IF t.status <> 'active' THEN
    RAISE EXCEPTION 'Cannot record a payment on a cancelled transaction';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO already
  FROM public.payments WHERE transaction_id = NEW.transaction_id;

  IF already + NEW.amount > t.client_fare THEN
    RAISE EXCEPTION 'Payment exceeds the client fare. Outstanding balance is % naira', t.client_fare - already;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER payments_validate BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.validate_payment();

-- Reminders
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  kind public.reminder_kind NOT NULL,
  due_date DATE NOT NULL,
  status public.reminder_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  sent_by UUID,
  channel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, kind)
);
GRANT SELECT, UPDATE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER reminders_updated_at BEFORE UPDATE ON public.reminders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX reminders_due_date_idx ON public.reminders (due_date, status);

CREATE POLICY "Staff read reminders" ON public.reminders
FOR SELECT TO authenticated USING (public.is_staff_member());
CREATE POLICY "Staff update reminders" ON public.reminders
FOR UPDATE TO authenticated USING (public.is_staff_member()) WITH CHECK (public.is_staff_member());

-- Keep reminders in sync with transaction dates
CREATE OR REPLACE FUNCTION public.sync_reminders()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cancelled' THEN
    DELETE FROM public.reminders WHERE transaction_id = NEW.id AND status = 'pending';
    RETURN NEW;
  END IF;

  INSERT INTO public.reminders (transaction_id, kind, due_date)
  VALUES (NEW.id, 'departure', NEW.departure_date)
  ON CONFLICT (transaction_id, kind) DO UPDATE
    SET due_date = EXCLUDED.due_date
    WHERE public.reminders.status = 'pending';

  IF NEW.return_date IS NULL THEN
    DELETE FROM public.reminders
    WHERE transaction_id = NEW.id AND kind = 'return' AND status = 'pending';
  ELSE
    INSERT INTO public.reminders (transaction_id, kind, due_date)
    VALUES (NEW.id, 'return', NEW.return_date)
    ON CONFLICT (transaction_id, kind) DO UPDATE
      SET due_date = EXCLUDED.due_date
      WHERE public.reminders.status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER transactions_sync_reminders
AFTER INSERT OR UPDATE OF departure_date, return_date, status ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_reminders();

-- Derived financials
CREATE VIEW public.transaction_financials WITH (security_invoker = true) AS
SELECT
  t.id AS transaction_id,
  t.serial_number,
  t.register_date,
  t.client_id,
  t.airline_id,
  a.scope AS commission_scope,
  t.status,
  t.departure_date,
  t.return_date,
  t.client_fare,
  t.payable,
  COALESCE(p.amount_paid, 0) AS amount_paid,
  t.client_fare - COALESCE(p.amount_paid, 0) AS outstanding,
  t.client_fare - t.payable AS potential_commission,
  CASE WHEN COALESCE(p.amount_paid, 0) >= t.client_fare THEN t.client_fare - t.payable ELSE 0 END
    AS recognized_commission,
  CASE WHEN COALESCE(p.amount_paid, 0) >= t.client_fare THEN 0 ELSE t.client_fare - t.payable END
    AS pending_commission,
  CASE
    WHEN COALESCE(p.amount_paid, 0) = 0 THEN 'pending'
    WHEN COALESCE(p.amount_paid, 0) < t.client_fare THEN 'partially_paid'
    ELSE 'paid'
  END AS payment_status
FROM public.transactions t
JOIN public.airlines a ON a.id = t.airline_id
LEFT JOIN (
  SELECT transaction_id, SUM(amount)::INTEGER AS amount_paid
  FROM public.payments GROUP BY transaction_id
) p ON p.transaction_id = t.id;

GRANT SELECT ON public.transaction_financials TO authenticated;
GRANT ALL ON public.transaction_financials TO service_role;