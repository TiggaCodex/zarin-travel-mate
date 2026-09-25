import { createFileRoute, Link } from "@tanstack/react-router";
import { PlaneLanding, PlaneTakeoff } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { KindLabel } from "@/components/reminder-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentAccount } from "@/hooks/useAuth";
import { formatDate, formatLongDate } from "@/lib/format";
import { useReminderBoard } from "@/lib/reminders";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Zarin Travels & Tours" },
      {
        name: "description",
        content: "Daily overview of bookings and travel reminders for Zarin Travels & Tours.",
      },
      { property: "og:title", content: "Dashboard | Zarin Travels & Tours" },
      { property: "og:description", content: "Daily overview of today's travel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, user } = useCurrentAccount();
  const name = profile?.full_name || user?.email || "there";
  const { data, isLoading } = useReminderBoard(7);

  return (
    <AppShell
      title={`Welcome, ${name}`}
      description={data ? `Today is ${formatLongDate(data.today)}.` : undefined}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Travel today</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <PlaneTakeoff className="size-6 text-primary" />
                  <div>
                    <p className="font-display text-3xl">{data.departuresToday.length}</p>
                    <p className="text-sm text-muted-foreground">Departures</p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/reminders" search={{ focus: "departures" }}>
                    View departures
                  </Link>
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <PlaneLanding className="size-6 text-primary" />
                  <div>
                    <p className="font-display text-3xl">{data.returnsToday.length}</p>
                    <p className="text-sm text-muted-foreground">Returns</p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/reminders" search={{ focus: "returns" }}>
                    View returns
                  </Link>
                </Button>
              </div>
            </div>
          )}
          {data && data.overdue.length > 0 ? (
            <p className="mt-4 text-sm font-medium text-destructive">
              {data.overdue.length} overdue reminder{data.overdue.length === 1 ? "" : "s"} still
              pending. <Link to="/reminders" className="underline">Review</Link>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming travel — next 7 days</CardTitle>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-16 w-full" />
          ) : data.upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No travel in the next 7 days.</p>
          ) : (
            <ul className="divide-y">
              {data.upcoming.slice(0, 8).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <KindLabel kind={r.kind} />
                    <p className="text-sm font-medium">
                      {r.transactions?.clients?.full_name ?? "—"} · {r.transactions?.airlines?.name}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">{formatDate(r.due_date)}</span>
                </li>
              ))}
            </ul>
          )}
          {data && data.upcoming.length > 8 ? (
            <Button asChild variant="link" className="px-0">
              <Link to="/reminders">See all upcoming</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}
