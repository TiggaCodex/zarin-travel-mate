import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentAccount } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Zarin Travels & Tours" },
      {
        name: "description",
        content: "Daily overview of bookings, payments and travel reminders for Zarin Travels & Tours.",
      },
      { property: "og:title", content: "Dashboard | Zarin Travels & Tours" },
      {
        property: "og:description",
        content: "Daily overview of bookings, payments and travel reminders.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, user, isAdmin } = useCurrentAccount();
  const name = profile?.full_name || user?.email || "there";

  return (
    <AppShell
      title={`Welcome, ${name}`}
      description={
        isAdmin
          ? "You have full administrator access to the register, reports and settings."
          : "You can register clients, record bookings and take payments."
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Foundation ready</CardTitle>
          <CardDescription>
            Accounts, roles and the secure register database are set up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Coming next, in order:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Clients and the booking register</li>
            <li>Payments, outstanding balances and commission</li>
            <li>Departure and return reminders</li>
            <li>Dashboard figures and reports</li>
            <li>Airline and staff management</li>
          </ol>
        </CardContent>
      </Card>
    </AppShell>
  );
}
