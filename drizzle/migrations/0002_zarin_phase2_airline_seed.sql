-- Phase 2 support: require a client phone number and seed the managed airline list.

ALTER TABLE public.clients
  ALTER COLUMN phone SET NOT NULL;

INSERT INTO public.airlines (name, scope)
VALUES
  ('Air Peace', 'local'),
  ('Arik Air', 'local'),
  ('Ibom Air', 'local'),
  ('Max Air', 'local'),
  ('United Nigeria Airlines', 'local'),
  ('ValueJet', 'local'),
  ('Aero Contractors', 'local'),
  ('Overland Airways', 'local'),
  ('Rano Air', 'local'),
  ('XEJet', 'local'),
  ('Emirates', 'international'),
  ('Qatar Airways', 'international'),
  ('Ethiopian Airlines', 'international'),
  ('Turkish Airlines', 'international'),
  ('British Airways', 'international'),
  ('Lufthansa', 'international'),
  ('Air France', 'international'),
  ('KLM Royal Dutch Airlines', 'international'),
  ('Kenya Airways', 'international'),
  ('EgyptAir', 'international'),
  ('Royal Air Maroc', 'international'),
  ('Saudia', 'international'),
  ('Etihad Airways', 'international'),
  ('RwandAir', 'international'),
  ('Delta Air Lines', 'international'),
  ('Virgin Atlantic', 'international'),
  ('Qatar Executive', 'international'),
  ('Uganda Airlines', 'international')
ON CONFLICT DO NOTHING;
