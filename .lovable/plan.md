# Zarin Travels & Tours — Management System Plan

Digital replacement for the handwritten client/flight register, with payments, commission recognition, travel reminders, and reports.

## 1. Recommended architecture

- Frontend: TanStack Start (React) app with these pages:
  - `/auth` — sign in
  - `/` — dashboard (metrics + today's departures/returns)
  - `/transactions` — register list with search/filter, `/transactions/new`, `/transactions/$id` (detail + payments)
  - `/clients` — client list + detail (their bookings)
  - `/reminders` — today / upcoming departures & returns, mark as sent
  - `/reports` — daily, weekly, monthly, yearly, custom range
  - `/settings/users` — admin only (roles, airlines)
- Backend: Lovable Cloud (Postgres + auth). All reads/writes go through server functions; the signed-in user's permissions are enforced by row-level security.
- Money stored as integers (minor units) to avoid rounding errors; single currency (NGN assumed).
- No stored totals. Amount paid, outstanding, status and commission are derived from payments via database views.

## 2. Database schema

`profiles` — one row per user: id (auth user), full_name, phone, is_active, created_at.

`user_roles` — id, user_id, role (`admin` | `staff`), unique(user_id, role). Roles live in their own table for security.

`airlines` — id, name, scope (`local` | `international`), is_active. Keeps Airline + Local/International consistent; staff may still type a free-text airline if preferred (see questions).

`clients` — id, full_name, phone, email, notes, created_by, created_at.

`transactions` — the register row:
- id, serial_number (auto, sequential, unique)
- register_date (field 2), client_id, airline_id (or airline_name), travel_class (`economy` | `premium_economy` | `business` | `first`)
- departure_date, return_date (nullable)
- client_fare, payable (integers)
- commission_scope (`local` | `international`)
- pnr, pickup_dropoff, remark
- created_by, created_at, updated_at

`payments` — id, transaction_id, amount, paid_on, method (`cash` | `transfer` | `pos` | `other`), reference, note, recorded_by, created_at.

`reminders` — id, transaction_id, kind (`departure` | `return`), due_date, status (`pending` | `sent` | `dismissed`), sent_at, sent_by, channel (nullable, reserved for WhatsApp later), unique(transaction_id, kind). Created/updated automatically by a trigger from the transaction's dates.

View `transaction_financials` — per transaction: amount_paid, outstanding, payment_status, potential_commission, recognized_commission, pending_commission.

## 3. Relationships

```text
auth user 1─1 profiles
auth user 1─n user_roles
clients   1─n transactions
airlines  1─n transactions
transactions 1─n payments
transactions 1─2 reminders (departure, return)
```

## 4. Authentication / roles

- Email + password sign-in (no public self-signup; admin creates staff accounts).
- Roles checked through a secure `has_role(user_id, role)` database function.
- Admin: full read/write on everything, user management, delete/void, all reports.
- Staff: create/read clients, transactions and payments; edit own recent entries; read reminders and mark sent; no user management, no deletes, reports limited to their own entries unless you want full visibility (see questions).

## 5. Calculation logic

```text
amount_paid          = SUM(payments.amount)
outstanding          = max(client_fare - amount_paid, 0)
potential_commission = client_fare - payable
payment_status       = amount_paid = 0                -> pending
                       amount_paid < client_fare      -> partially_paid
                       amount_paid >= client_fare     -> paid
recognized_commission = payment_status = paid ? potential_commission : 0
pending_commission    = payment_status = paid ? 0 : potential_commission
```

Report aggregates (clients attended, transaction count, total fare, payable, received, outstanding, recognized & pending commission) are sums over the view filtered by date range, with local/international breakdown.

## 6. Reminder architecture

- A database trigger keeps two reminder rows in sync with each transaction: one for departure_date, one for return_date (removed if return date cleared). Editing a date resets a still-pending reminder to the new date.
- Dashboard and `/reminders` query reminders by due_date: today's departures, today's returns, and upcoming (next 7/30 days), plus overdue pending ones.
- Each reminder has a "Mark as sent" action and a "Send reminder" action that today only opens a prefilled message the admin can copy/share; the `channel` column and this action are the hook for WhatsApp later.
- No background jobs in phase 1 — reminders surface when the app is opened.

## 7. Implementation phases

1. Cloud setup: schema, roles, policies, auth pages, app shell and navigation.
2. Clients + transactions register: create, list, search, detail, edit.
3. Payments: record multiple payments, derived status/outstanding/commission everywhere.
4. Reminders: trigger, dashboard today's departures/returns, upcoming list, mark as sent.
5. Dashboard metrics and reports with the five range modes plus export to CSV.
6. Admin user management and staff permission tightening.

## 8. Questions to resolve before building

1. Currency and amounts — NGN only, and are kobo/decimals needed or whole naira?
2. Airline entry — pick from a managed airline list (recommended) or free text each time?
3. Is Local/International determined by the airline record, or chosen per transaction?
4. Should staff see all transactions and reports, or only the ones they entered?
5. Serial number format — plain incrementing number, or per-year like 2026/0001?
6. Should a payment ever exceed the client fare (overpayment/refund), or must it be capped?
7. Can transactions be deleted, or only voided/cancelled with a reason (admin only)?
8. Is one transaction ever for multiple passengers, or always one client per row?
9. Who creates staff accounts — admin invites by email, or you hand out credentials?
