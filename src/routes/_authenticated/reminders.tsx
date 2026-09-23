import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { ComingNext } from "@/components/coming-next";

export const Route = createFileRoute("/_authenticated/reminders")({
  head: () => ({
    meta: [
      { title: "Travel Reminders | Zarin Travels & Tours" },
      {
        name: "description",
        content: "Today's departures and returns, plus upcoming travel reminders for clients.",
      },
      { property: "og:title", content: "Travel Reminders | Zarin Travels & Tours" },
      { property: "og:description", content: "Today's departures and returns for clients." },
    ],
  }),
  component: RemindersPage,
});

function RemindersPage() {
  return (
    <AppShell
      title="Travel reminders"
      description="Departure and return reminders are tracked as separate events."
    >
      <ComingNext
        phase="a later step"
        items={[
          "Today's departures and today's returns",
          "Upcoming and overdue reminders",
          "Mark a reminder as sent",
          "Prepare a reminder message to copy or share",
        ]}
      />
    </AppShell>
  );
}
