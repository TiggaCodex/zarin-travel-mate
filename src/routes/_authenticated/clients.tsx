import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { ComingNext } from "@/components/coming-next";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({
    meta: [
      { title: "Clients | Zarin Travels & Tours" },
      {
        name: "description",
        content: "Client records and their booking history at Zarin Travels & Tours.",
      },
      { property: "og:title", content: "Clients | Zarin Travels & Tours" },
      { property: "og:description", content: "Client records and their booking history." },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  return (
    <AppShell title="Clients" description="Everyone the office has booked travel for.">
      <ComingNext
        phase="the next step"
        items={[
          "Add and edit client details",
          "Search clients by name or phone number",
          "See every booking belonging to a client",
        ]}
      />
    </AppShell>
  );
}
