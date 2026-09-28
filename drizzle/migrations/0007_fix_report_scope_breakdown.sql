CREATE OR REPLACE FUNCTION public.business_report(_from date, _to date)
 RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Reports are available to administrators only.';
  END IF;
  WITH f AS (
    SELECT * FROM public.transaction_financials
    WHERE status = 'active' AND register_date BETWEEN _from AND _to
  ),
  agg AS (
    SELECT count(DISTINCT client_id) AS clients, count(*) AS bookings,
      COALESCE(sum(client_fare),0) AS client_fare, COALESCE(sum(payable),0) AS payable,
      COALESCE(sum(amount_paid),0) AS received, COALESCE(sum(outstanding),0) AS outstanding,
      COALESCE(sum(recognized_commission),0) AS earned, COALESCE(sum(pending_commission),0) AS pending
    FROM f
  ),
  sc AS (
    SELECT s.scope, count(f.transaction_id) AS bookings,
      COALESCE(sum(f.client_fare),0) AS client_fare, COALESCE(sum(f.payable),0) AS payable,
      COALESCE(sum(f.amount_paid),0) AS received, COALESCE(sum(f.outstanding),0) AS outstanding,
      COALESCE(sum(f.recognized_commission),0) AS earned, COALESCE(sum(f.pending_commission),0) AS pending
    FROM unnest(enum_range(NULL::public.airline_scope)) AS s(scope)
    LEFT JOIN f ON f.commission_scope = s.scope
    GROUP BY s.scope
  ),
  daily AS (
    SELECT register_date AS day, count(*) AS bookings,
      count(*) FILTER (WHERE commission_scope='local') AS local,
      count(*) FILTER (WHERE commission_scope='international') AS international,
      sum(client_fare) AS client_fare, sum(amount_paid) AS received,
      sum(outstanding) AS outstanding, sum(recognized_commission) AS earned
    FROM f GROUP BY register_date
  ),
  monthly AS (
    SELECT to_char(date_trunc('month', register_date), 'YYYY-MM') AS month, count(*) AS bookings,
      count(*) FILTER (WHERE commission_scope='local') AS local,
      count(*) FILTER (WHERE commission_scope='international') AS international,
      sum(client_fare) AS client_fare, sum(amount_paid) AS received,
      sum(outstanding) AS outstanding, sum(recognized_commission) AS earned
    FROM f GROUP BY 1
  )
  SELECT jsonb_build_object(
    'summary', (SELECT to_jsonb(agg) FROM agg),
    'by_scope', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.scope), '[]') FROM sc x),
    'daily', (SELECT COALESCE(jsonb_agg(to_jsonb(d) ORDER BY d.day), '[]') FROM daily d),
    'monthly', (SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.month), '[]') FROM monthly m)
  ) INTO result;
  RETURN result;
END;
$function$;