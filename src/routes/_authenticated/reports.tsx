import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { ComingNext } from "@/components/coming-next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentAccount } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports | Zarin Travels & Tours" },
      {
        name: "description",
        content:
          "Daily, weekly, monthly, yearly and custom range reports on fares, payments and commission.",
      },
      { property: "og:title", content: "Reports | Zarin Travels & Tours" },
      {
        property: "og:description",
        content: "Reports on fares, payments received, outstanding balances and commission.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { isAdmin, loading } = useCurrentAccount();

  return (
    <AppShell title="Reports" description="Financial summaries for any period.">
      {!loading && !isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Administrators only</CardTitle>
            <CardDescription>
              Ask an administrator if you need figures from this section.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ) : (
        <ComingNext
          phase="a later step"
          items={[
            "Daily, weekly, monthly, yearly and custom date range",
            "Clients attended to and number of bookings",
            "Total client fare, payable, received and outstanding",
            "Potential, recognised and pending commission",
          ]}
        />
      )}
    </AppShell>
  );
}
