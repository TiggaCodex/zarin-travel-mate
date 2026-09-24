import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { TransactionForm } from "@/components/transaction-form";

export const Route = createFileRoute("/_authenticated/transactions/new")({
  head: () => ({
    meta: [
      { title: "New Booking | Zarin Travels & Tours" },
      {
        name: "description",
        content: "Record a new client booking with airline, class, travel dates and fares.",
      },
      { property: "og:title", content: "New Booking | Zarin Travels & Tours" },
      { property: "og:description", content: "Record a new client booking in the register." },
    ],
  }),
  component: NewTransactionPage,
});

function NewTransactionPage() {
  return (
    <AppShell
      title="New booking"
      description="The serial number and register date are added automatically."
    >
      <TransactionForm />
    </AppShell>
  );
}
