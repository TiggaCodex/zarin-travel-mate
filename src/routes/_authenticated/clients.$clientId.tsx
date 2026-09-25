import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Pencil, Plus } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ClientDialog } from "@/components/client-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatNaira, formatSerial, travelClassLabel } from "@/lib/format";
import { PaymentStatusBadge } from "@/components/payment-bits";
import { KindLabel, ReminderStatusBadge } from "@/components/reminder-bits";
import { useClientReminders } from "@/lib/reminders";
import { useClient, useTransactions } from "@/lib/zarin-data";

export const Route = createFileRoute("/_authenticated/clients/$clientId")({
  head: () => ({
    meta: [
      { title: "Client Profile | Zarin Travels & Tours" },
      {
        name: "description",
        content: "Client contact details and their full booking history with Zarin Travels & Tours.",
      },
      { property: "og:title", content: "Client Profile | Zarin Travels & Tours" },
      { property: "og:description", content: "Client contact details and booking history." },
    ],
  }),
  component: ClientProfilePage,
});

function ClientProfilePage() {
  const { clientId } = Route.useParams();
  const { data: client, isLoading } = useClient(clientId);
  const { data: bookings, isLoading: bookingsLoading } = useTransactions({
    clientId,
    status: "all",
  });
  const [editOpen, setEditOpen] = useState(false);
  const { data: travel } = useClientReminders(clientId);

  if (isLoading) {
    return (
      <AppShell title="Client">
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell title="Client not found">
        <Button asChild variant="outline">
          <Link to="/clients">
            <ArrowLeft className="size-4" /> Back to clients
          </Link>
        </Button>
      </AppShell>
    );
  }

  const rows = bookings ?? [];
  const latest = rows[0];

  return (
    <AppShell
      title={client.full_name}
      description={client.phone}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/clients">
              <ArrowLeft className="size-4" /> Clients
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
          <Button asChild>
            <Link to="/transactions/new">
              <Plus className="size-4" /> New booking
            </Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl">{bookingsLoading ? "—" : rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Latest booking</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl">
              {latest ? formatDate(latest.register_date) : "None yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{client.phone}</p>
            <p className="text-muted-foreground">{client.email || "No email"}</p>
          </CardContent>
        </Card>
      </div>

      {client.notes ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{client.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      {travel && travel.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Upcoming travel</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {travel.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <KindLabel kind={r.kind} />
                    <p className="text-sm">
                      {formatDate(r.due_date)} · {r.transactions?.airlines?.name} ·{" "}
                      <Link
                        to="/transactions/$transactionId"
                        params={{ transactionId: r.transaction_id }}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Booking {formatSerial(r.transactions?.serial_number)}
                      </Link>
                    </p>
                  </div>
                  <ReminderStatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bookings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bookingsLoading ? (
            <div className="space-y-3 p-6">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <p className="font-medium">No bookings for this client yet</p>
              <Button asChild size="sm">
                <Link to="/transactions/new">
                  <Plus className="size-4" /> New booking
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>S/N</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Airline</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead className="text-right">Client fare</TableHead>
                    <TableHead className="text-right">Amount paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Recognized commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        <Link
                          to="/transactions/$transactionId"
                          params={{ transactionId: row.id }}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {formatSerial(row.serial_number)}
                        </Link>
                        {row.status === "cancelled" ? (
                          <Badge variant="destructive" className="ml-2">
                            Void
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>{formatDate(row.register_date)}</TableCell>
                      <TableCell>{row.airlines?.name ?? "—"}</TableCell>
                      <TableCell>{travelClassLabel(row.travel_class)}</TableCell>
                      <TableCell>{formatDate(row.departure_date)}</TableCell>
                      <TableCell className="text-right">{formatNaira(row.client_fare)}</TableCell>
                      <TableCell className="text-right">
                        {formatNaira(row.financials?.amount_paid)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNaira(row.financials?.outstanding)}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={row.financials?.payment_status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNaira(row.financials?.recognized_commission)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ClientDialog open={editOpen} onOpenChange={setEditOpen} client={client} />
    </AppShell>
  );
}
