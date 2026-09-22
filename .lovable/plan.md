# Zarin Travels & Tours — Management System

Digital replacement for the handwritten client/flight register: clients, bookings, payments, commission recognition, travel reminders, and reports. This plan reflects your confirmed decisions; only Phase 1 gets built now.

## Confirmed rules

- Currency NGN, whole-naira integers only.
- Airlines come from a managed list; each airline is Local or International and the booking inherits that scope automatically.
- Staff can view all clients and bookings; financial reports and admin functions are admin-only.
- Serial numbers are simple sequential: 0001, 0002, 0003.
- A payment may never push total paid above the Client Fare — rejected with a clear message.
- Client Fare can never be less than Payable.
- Nothing is ever deleted: admin can cancel a booking with a required reason; cancelled records stay visible for audit and are excluded from active totals.
- One booking = one client.
- Admin creates staff accounts.

## 1. Architecture

- Frontend (TanStack Start / React):
  - `/auth` — sign in (no public signup)
  - `/dashboard` — metrics + today's departures/returns
  - `/clients`, `/clients/$id`
  - `/transactions`, `/transactions/new`, `/transactions/$id`
  - `/reminders`
  - `/reports` (admin)
  - `/settings/airlines`, `/settings/users` (admin)
- Backend: Lovable Cloud (Postgres + auth). All data access via server functions; row-level security enforces role rules.
- Money stored as integer naira. No redundant totals — everything derived from payments.

## 2. Database schema

- `profiles` — id (auth user), full_name, phone, is_active, created_at.
- `user_roles` — user_id, role (`admin` | `staff`), unique(user_id, role). Roles in their own table for security.
- `airlines` — id, name (unique), scope (`local` | `international`), is_active, created_at.
- `clients` — id, full_name, phone, email, notes, created_by, created_at.
- `transactions` — id, serial_number (sequential, unique, zero-padded on display), register_date, client_id, airline_id, travel_class, departure_date, return_date (nullable), client_fare, payable, pnr, pickup_dropoff, remark, status (`active` | `cancelled`), cancel_reason, cancelled_by, cancelled_at, created_by, created_at, updated_at.
  - Constraint: `client_fare >= payable`, both >= 0.
  - Commission scope is read from the linked airline, not stored again.
- `payments` — id, transaction_id, amount (> 0), paid_on, method (`cash` | `transfer` | `pos` | `other`), reference, note, recorded_by, created_at.
- `reminders` — id, transaction_id, kind (`departure` | `return`), due_date, status (`pending` | `sent` | `dismissed`), sent_at, sent_by, channel (nullable, reserved for WhatsApp later), unique(transaction_id, kind).
- View `transaction_financials` — per booking: amount_paid, outstanding, payment_status, potential/recognized/pending commission, plus airline scope and booking status for report filtering.

## 3. Relationships

```text
auth user 1─1 profiles
auth user 1─n user_roles
clients      1─n transactions
airlines     1─n transactions
transactions 1─n payments
transactions 1─2 reminders (departure, return)
```

## 4. Authentication and roles

- Email + password sign-in, no self-signup; admin creates staff accounts and can deactivate them.
- Role checks go through a secure `has_role(user_id, role)` database function.
- Admin: everything — airlines, users, reports, cancelling bookings.
- Staff: create/read clients, bookings and payments; read all bookings; edit their own entries; mark reminders sent. No cancelling, no user/airline management, no reports.
- Cancelled bookings are read-only for everyone; new payments are blocked on them.

## 5. Calculation logic

```text
amount_paid           = SUM(payments.amount)
outstanding           = client_fare - amount_paid
potential_commission  = client_fare - payable
payment_status        = amount_paid = 0            -> pending
                        amount_paid < client_fare  -> partially_paid
                        amount_paid = client_fare  -> paid
recognized_commission = paid ? potential_commission : 0
pending_commission    = paid ? 0 : potential_commission
```

Overpayment guard runs server-side: a payment is rejected if it would make amount_paid exceed client_fare. Report aggregates cover active bookings only, with local/international breakdown.

## 6. Reminder architecture

- A database trigger keeps one departure reminder and one return reminder in sync with each booking's dates (return reminder removed if the date is cleared, pending reminders follow date edits, cancelled bookings drop pending reminders).
- Dashboard and `/reminders` list today's departures, today's returns, overdue pending, and upcoming.
- Each reminder has "Mark as sent" plus a prepare/copy/share message action — the `channel` column is the hook for WhatsApp later.

## 7. Implementation phases

- **Phase 1 (this build): foundation** — Cloud enabled, full schema with constraints, grants and row-level security policies, the financials view, the reminder trigger, sign-in page, admin/staff role setup, protected app shell with navigation and placeholder pages for each section.
- Phase 2: clients + bookings register (create, list, search, detail, edit, cancel with reason).
- Phase 3: payments with overpayment validation, derived status/outstanding/commission everywhere.
- Phase 4: reminders UI (today, upcoming, mark sent, share message).
- Phase 5: dashboard metrics and reports (daily, weekly, monthly, yearly, custom) with CSV export.
- Phase 6: admin airline and staff management screens, permission tightening.

## 8. Remaining detail (not blocking)

The very first admin account: after Phase 1 I will point you at the sign-in page and grant the admin role to the first account you create.
