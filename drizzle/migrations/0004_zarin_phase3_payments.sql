CREATE OR REPLACE FUNCTION public.validate_payment()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  t RECORD;
  already INTEGER;
  remaining INTEGER;
BEGIN
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero.';
  END IF;
  IF NEW.paid_on IS NULL THEN
    RAISE EXCEPTION 'Payment date is required.';
  END IF;
  NEW.recorded_by := auth.uid();
  SELECT client_fare, status INTO t FROM public.transactions WHERE id = NEW.transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found.';
  END IF;
  IF t.status <> 'active' THEN
    RAISE EXCEPTION 'This booking has been voided and cannot accept payments.';
  END IF;
  SELECT COALESCE(SUM(amount), 0) INTO already FROM public.payments WHERE transaction_id = NEW.transaction_id;
  remaining := GREATEST(t.client_fare - already, 0);
  IF NEW.amount > remaining THEN
    RAISE EXCEPTION 'Payment exceeds the outstanding balance of ₦%.', to_char(remaining, 'FM999,999,999,990');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE VIEW public.transaction_financials WITH (security_invoker = true) AS
SELECT
  t.id AS transaction_id, t.serial_number, t.register_date, t.client_id, t.airline_id,
  a.scope AS commission_scope, t.status, t.departure_date, t.return_date, t.client_fare, t.payable,
  COALESCE(p.amount_paid, 0) AS amount_paid,
  GREATEST(t.client_fare - COALESCE(p.amount_paid, 0), 0) AS outstanding,
  t.client_fare - t.payable AS potential_commission,
  CASE WHEN COALESCE(p.amount_paid, 0) >= t.client_fare THEN t.client_fare - t.payable ELSE 0 END AS recognized_commission,
  CASE WHEN COALESCE(p.amount_paid, 0) >= t.client_fare THEN 0 ELSE t.client_fare - t.payable END AS pending_commission,
  CASE
    WHEN COALESCE(p.amount_paid, 0) = 0 THEN 'pending'
    WHEN COALESCE(p.amount_paid, 0) < t.client_fare THEN 'partially_paid'
    ELSE 'paid'
  END AS payment_status
FROM public.transactions t
JOIN public.airlines a ON a.id = t.airline_id
LEFT JOIN (
  SELECT transaction_id, SUM(amount)::INTEGER AS amount_paid FROM public.payments GROUP BY transaction_id
) p ON p.transaction_id = t.id;