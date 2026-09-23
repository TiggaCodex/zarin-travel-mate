import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { ComingNext } from "@/components/coming-next";

export const Route = createFileRoute("/_authenticated/settings/airlines")({
  head: () => ({
    meta: [
      { title: "Airlines | Zarin Travels & Tours" },
      {
        name: "description",
        content: "Manage the airline list and whether each airline is local or international.",
      },
      { property: "og:title", content: "Airlines | Zarin Travels & Tours" },
      { property: "og:description", content: "Manage the airline list used across the register." },
    ],
  }),
  component: AirlinesPage,
});

function AirlinesPage() {
  return (
    <AppShell
      title="Airlines"
      description="Each airline is marked local or international; bookings pick this up automatically."
    >
      <ComingNext
        phase="a later step"
        items={[
          "Add and edit airlines",
          "Mark an airline local or international",
          "Activate or deactivate an airline",
        ]}
      />
    </AppShell>
  );
}
