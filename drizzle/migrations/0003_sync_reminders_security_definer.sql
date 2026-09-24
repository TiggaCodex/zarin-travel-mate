CREATE OR REPLACE FUNCTION public.sync_reminders()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
