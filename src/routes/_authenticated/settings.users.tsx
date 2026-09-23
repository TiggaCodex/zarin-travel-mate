import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { ComingNext } from "@/components/coming-next";

export const Route = createFileRoute("/_authenticated/settings/users")({
  head: () => ({
    meta: [
      { title: "Staff Accounts | Zarin Travels & Tours" },
      {
        name: "description",
        content: "Create staff accounts, set who is an administrator and deactivate leavers.",
      },
      { property: "og:title", content: "Staff Accounts | Zarin Travels & Tours" },
      { property: "og:description", content: "Create and manage staff accounts and roles." },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  return (
    <AppShell title="Staff accounts" description="Administrators create and manage staff logins.">
      <ComingNext
        phase="a later step"
        items={[
          "Create a staff account and send the login details",
          "Promote a staff member to administrator",
          "Deactivate someone who has left",
        ]}
      />
    </AppShell>
  );
}
