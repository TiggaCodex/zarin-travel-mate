import { createFileRoute, Link } from "@tanstack/react-router";
import { PlaneLanding, PlaneTakeoff, Plus } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { KindLabel } from "@/components/reminder-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentAccount } from "@/hooks/useAuth";
import { formatDate, formatDateTime, formatLongDate, formatNaira } from "@/lib/format";
import { useMyActivity, useMyToday } from "@/lib/staff";
import { useReminderBoard } from "@/lib/reminders";
import { KpiGrid, RangePicker, ReportCharts } from "@/components/report-bits";
import { rangeFor, useBusinessReport, type DateRange } from "@/lib/reports";
import { useState } from "react";

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

function BusinessSection() {
  const [range, setRange] = useState<DateRange>(() => rangeFor("today"));
  const report = useBusinessReport(range);
  return (
    <div className="space-y-4">
      <RangePicker value={range} onChange={setRange} />
      <KpiGrid report={report.data} loading={report.isLoading} />
      {report.data ? <ReportCharts report={report.data} range={range} /> : null}
    </div>
  );
}

function StaffSection({ userId }: { userId: string | undefined }) {
  const today = useMyToday(userId);
  const activity = useMyActivity(userId, 10);
  const stats = [
    { label: "Clients attended today", value: today.data?.clientsAttended },
    { label: "Bookings created today", value: today.data?.bookings },
    { label: "Payments recorded today", value: today.data?.paymentsRecorded },
    { label: "Amount collected today", value: today.data ? formatNaira(today.data.amountCollected) : undefined },
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button asChild><Link to="/transactions/new"><Plus className="size-4" /> New booking</Link></Button>
        <Button asChild variant="outline"><Link to="/clients">Clients</Link></Button>
        <Button asChild variant="outline"><Link to="/transactions">Register</Link></Button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              {today.isLoading ? <Skeleton className="mt-2 h-7 w-16" /> : <p className="font-display text-2xl">{s.value ?? 0}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">My recent activity</CardTitle></CardHeader>
        <CardContent>
          {activity.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !activity.data?.length ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="divide-y">
              {activity.data.map((a) => (
                <li key={a.key} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <p className="text-sm font-medium">
                      {a.transactionId ? (
                        <Link to="/transactions/$transactionId" params={{ transactionId: a.transactionId }} className="hover:underline">{a.label}</Link>
                      ) : a.label}
                      {a.amount ? ` · ${formatNaira(a.amount)}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardPage() {
  const { profile, user, isAdmin, loading } = useCurrentAccount();
  const name = profile?.full_name || user?.email || "there";
  const { data, isLoading } = useReminderBoard(7);

  return (
    <AppShell
      title={`Welcome, ${name}`}
      description={data ? `Today is ${formatLongDate(data.today)}.` : "Loading today…"}
    >
      {loading ? null : isAdmin ? <BusinessSection /> : <StaffSection userId={user?.id} />}
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
