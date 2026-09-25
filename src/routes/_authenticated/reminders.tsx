import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { AppShell } from "@/components/app-shell";
import { ReminderCard, SendReminderDialog } from "@/components/reminder-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLongDate } from "@/lib/format";
import { useReminderBoard, type ReminderRow } from "@/lib/reminders";

export const Route = createFileRoute("/_authenticated/reminders")({
  validateSearch: z.object({ focus: z.enum(["departures", "returns"]).optional() }),
  head: () => ({
    meta: [
      { title: "Travel Reminders | Zarin Travels & Tours" },
      {
        name: "description",
        content: "Today's departures and returns, plus upcoming and overdue travel reminders.",
      },
      { property: "og:title", content: "Travel Reminders | Zarin Travels & Tours" },
      { property: "og:description", content: "Today's departures and returns for clients." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RemindersPage,
});

function Section({
  id,
  title,
  rows,
  empty,
  onSend,
  showDate,
}: {
  id?: string;
  title: string;
  rows: ReminderRow[];
  empty: string;
  onSend: (r: ReminderRow) => void;
  showDate?: boolean;
}) {
  return (
    <Card id={id}>
      <CardHeader>
        <CardTitle className="text-base">
          {title} <span className="text-muted-foreground">({rows.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((r) => (
              <ReminderCard key={r.id} reminder={r} onSend={onSend} showDate={showDate ?? false} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RemindersPage() {
  const { data, isLoading, isError } = useReminderBoard(7);
  const [sending, setSending] = useState<ReminderRow | null>(null);
  const { focus } = Route.useSearch();

  if (isLoading) {
    return (
      <AppShell title="Travel reminders">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </AppShell>
    );
  }
  if (isError || !data) {
    return (
      <AppShell title="Travel reminders">
        <p className="text-sm text-destructive">Could not load reminders. Please refresh.</p>
      </AppShell>
    );
  }

  const groups = new Map<string, ReminderRow[]>();
  for (const r of data.upcoming) groups.set(r.due_date, [...(groups.get(r.due_date) ?? []), r]);

  const departures = (
    <Section
      id="departures"
      title="Departures today"
      rows={data.departuresToday}
      empty="No departures today."
      onSend={setSending}
    />
  );
  const returns = (
    <Section
      id="returns"
      title="Returns today"
      rows={data.returnsToday}
      empty="No returns today."
      onSend={setSending}
    />
  );

  return (
    <AppShell
      title="Travel reminders"
      description={`Today is ${formatLongDate(data.today)} (Lagos time).`}
    >
      <h2 className="font-display text-lg">Today</h2>
      {focus === "returns" ? (
        <>
          {returns}
          {departures}
        </>
      ) : (
        <>
          {departures}
          {returns}
        </>
      )}

      <h2 className="font-display text-lg">Upcoming — next 7 days</h2>
      {groups.size === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No travel in the next 7 days.
          </CardContent>
        </Card>
      ) : (
        Array.from(groups.entries()).map(([date, rows]) => {
          const dep = rows.filter((r) => r.kind === "departure").length;
          const ret = rows.length - dep;
          return (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="text-base">
                  {formatLongDate(date)}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {dep} departure{dep === 1 ? "" : "s"} · {ret} return{ret === 1 ? "" : "s"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {rows.map((r) => (
                  <ReminderCard key={r.id} reminder={r} onSend={setSending} showDate={false} />
                ))}
              </CardContent>
            </Card>
          );
        })
      )}

      <h2 className="font-display text-lg">Overdue</h2>
      <Section
        title="Overdue reminders"
        rows={data.overdue}
        empty="No missed reminders."
        onSend={setSending}
        showDate
      />

      <SendReminderDialog reminder={sending} onOpenChange={(o) => !o && setSending(null)} />
    </AppShell>
  );
}
