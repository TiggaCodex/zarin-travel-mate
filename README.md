# Zarin Travel Hub

We are building a web-based management system for Zarin Travels & Tours.

IMPORTANT:

Do not start implementing yet. First analyze the requirements below, propose the application architecture, database schema, relationships, user roles, and implementation plan. Do not create unnecessary features.

PROJECT PURPOSE:

Replace Zarin Travels & Tours' manual handwritten client/flight register with a secure digital management system.

CORE REGISTER FIELDS:

1. Serial Number

2. Date

3. Name of Client

4. Airline

5. Class

6. Departure Date

7. Return Date

8. Client Fare

9. Payable

10. Commission (Local/International)

11. PNR

12. Pickup/Drop-off

13. Remark

FINANCIAL LOGIC:

- Staff enters Client Fare.

- Staff enters Payable.

- Staff selects whether the airline is Local or International.

- Potential Commission = Client Fare - Payable.

- However, commission must NOT be recognized/earned until the client has completely paid the Client Fare.

- If the client has only partially paid, record the outstanding balance but recognized commission remains 0.

- When total payment reaches the Client Fare, the transaction becomes fully paid and the commission becomes recognized.

- Outstanding = Client Fare - Total Amount Paid.

- Payment status should support Pending, Partially Paid, and Paid.

- Multiple payments against one transaction should be supported.

TRAVEL REMINDERS:

- Every transaction has a Departure Date.

- Every transaction may have a Return Date.

- On the Departure Date, the admin should see a notification/reminder showing the client and relevant booking information.

- On the Return Date, the admin should receive a separate reminder.

- Departure and return reminders must be treated as separate events.

- The admin should be able to mark a reminder as sent.

- The system should show today's departures and today's returns on the dashboard.

- Also provide visibility into upcoming departures/returns.

- Do not implement WhatsApp API yet. We will initially provide a reminder action that can later support WhatsApp.

REPORTING:

The system must eventually provide reports for:

- Daily

- Weekly

- Monthly

- Yearly

- Custom date range

Reports should include:

- Number of clients attended to

- Number of transactions

- Total Client Fare

- Total Payable

- Total Amount Received

- Total Outstanding

- Recognized Commission

- Pending Commission

DASHBOARD:

Show key metrics and today's travel reminders.

USER ROLES:

Start with Admin and Staff roles.

Admin has full access.

Staff can register clients, create transactions and record payments, subject to permissions we will define later.

IMPORTANT ARCHITECTURAL REQUIREMENT:

Do not store financial totals redundantly if they can be calculated reliably from transaction/payment data.

Payments should be stored separately from transactions so one transaction can have multiple payments.

Do not add accounting, airline API integration, WhatsApp API, payroll, inventory, or other unrelated functionality.

For now, only return:

1. Recommended architecture

2. Database schema

3. Table relationships

4. Authentication/role structure

5. Calculation logic

6. Reminder architecture

7. Implementation phases

8. Any important questions or ambiguities that need to be resolved before implementation

Do not write application code yet.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://zarin-travel-mate.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3636183f-7283-46ff-ac6a-9bc4893e9e3a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
