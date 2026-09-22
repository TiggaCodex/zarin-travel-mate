import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { ComingNext } from "@/components/coming-next";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({
    meta: [
      { title: "Flight Register | Zarin Travels & Tours" },
      {
        name: "description",
        content: "Digital flight and client register: bookings, fares, payments and commission.",
      },
      { property: "og:title", content: "Flight Register | Zarin Travels & Tours" },
      {
        property: "og:description",
        content: "Digital flight and client register for Zarin Travels & Tours.",
      },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  return (
    <AppShell
      title="Flight register"
      description="Every booking, its fare, payments and commission status."
    >
      <ComingNext
        phase="the next step"
        items={[
          "Record a booking with serial number, airline, class and travel dates",
          "Search and filter the register",
          "Booking detail with payments and commission",
          "Admin can cancel a booking with a reason (never deleted)",
        ]}
      />
    </AppShell>
  );
}
