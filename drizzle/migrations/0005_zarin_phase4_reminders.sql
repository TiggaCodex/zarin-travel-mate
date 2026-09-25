CREATE OR REPLACE FUNCTION public.sync_reminders()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Voided bookings keep their reminder history; lists filter them out by booking status.
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.reminders (transaction_id, kind, due_date)
  VALUES (NEW.id, 'departure', NEW.departure_date)
  ON CONFLICT (transaction_id, kind) DO UPDATE
    SET due_date = EXCLUDED.due_date
    WHERE public.reminders.due_date IS DISTINCT FROM EXCLUDED.due_date;

  IF NEW.return_date IS NULL THEN
    DELETE FROM public.reminders WHERE transaction_id = NEW.id AND kind = 'return';
  ELSE
    INSERT INTO public.reminders (transaction_id, kind, due_date)
    VALUES (NEW.id, 'return', NEW.return_date)
    ON CONFLICT (transaction_id, kind) DO UPDATE
      SET due_date = EXCLUDED.due_date
      WHERE public.reminders.due_date IS DISTINCT FROM EXCLUDED.due_date;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_reminder_update()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Only the booking sync (nested trigger) or the service role may change the booking link or date.
  IF pg_trigger_depth() <= 1 AND auth.uid() IS NOT NULL THEN
    IF NEW.transaction_id <> OLD.transaction_id OR NEW.kind <> OLD.kind OR NEW.due_date <> OLD.due_date THEN
      RAISE EXCEPTION 'Reminder dates follow the booking and cannot be edited directly.';
    END IF;
    IF NEW.status = 'dismissed' AND OLD.status <> 'dismissed' AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only an administrator can dismiss a reminder.';
    END IF;
    IF NEW.status = 'pending' AND OLD.status <> 'pending' AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only an administrator can reopen a reminder.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.transactions WHERE id = NEW.transaction_id AND status <> 'active') THEN
      RAISE EXCEPTION 'This booking has been voided.';
    END IF;
  END IF;

  IF NEW.status = 'sent' AND OLD.status <> 'sent' THEN
    NEW.sent_at := now();
    NEW.sent_by := auth.uid();
  ELSIF NEW.status <> 'sent' THEN
    NEW.sent_at := NULL;
    NEW.sent_by := NULL;
  ELSE
    NEW.sent_at := OLD.sent_at;
    NEW.sent_by := OLD.sent_by;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reminders_guard BEFORE UPDATE ON public.reminders
FOR EACH ROW EXECUTE FUNCTION public.guard_reminder_update();