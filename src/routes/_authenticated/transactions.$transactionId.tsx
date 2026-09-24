import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Ban, Pencil } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentAccount } from "@/hooks/useAuth";
import {
  formatDate,
  formatDateTime,
  formatNaira,
  formatSerial,
  scopeLabel,
  travelClassLabel,
} from "@/lib/format";
import { useProfileNames, useTransaction, useVoidTransaction } from "@/lib/zarin-data";

export const Route = createFileRoute("/_authenticated/transactions/$transactionId")({
  head: () => ({
    meta: [
      { title: "Booking Detail | Zarin Travels & Tours" },
      {
        name: "description",
        content: "Full booking record: client, airline, travel dates, fare and commission.",
      },
      { property: "og:title", content: "Booking Detail | Zarin Travels & Tours" },
      { property: "og:description", content: "Full booking record from the flight register." },
    ],
  }),
  component: TransactionDetailPage,
});

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function TransactionDetailPage() {
  const { transactionId } = Route.useParams();
  const { data: transaction, isLoading } = useTransaction(transactionId);
  const { isAdmin, user } = useCurrentAccount();
  const voidBooking = useVoidTransaction();
  const [voidOpen, setVoidOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const { data: names } = useProfileNames([transaction?.created_by, transaction?.cancelled_by]);

  const canEdit =
    Boolean(transaction) &&
    transaction!.status === "active" &&
    (isAdmin || transaction!.created_by === user?.id);

  async function handleVoid() {
    if (!reason.trim()) {
      setReasonError("A reason is required before voiding a booking.");
      return;
    }
    try {
      await voidBooking.mutateAsync({ id: transactionId, reason: reason.trim() });
      toast.success("Booking voided and kept for audit");
      setVoidOpen(false);
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not void the booking.");
    }
  }

  if (isLoading) {
    return (
      <AppShell title="Booking">
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  if (!transaction) {
    return (
      <AppShell title="Booking not found" description="This booking no longer exists.">
        <Button asChild variant="outline">
          <Link to="/transactions">
            <ArrowLeft className="size-4" /> Back to register
          </Link>
        </Button>
      </AppShell>
    );
  }

  const commission = transaction.client_fare - transaction.payable;

  return (
    <AppShell
      title={`Booking ${formatSerial(transaction.serial_number)}`}
      description={`Registered ${formatDate(transaction.register_date)}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/transactions">
              <ArrowLeft className="size-4" /> Register
            </Link>
          </Button>
          {canEdit ? (
            <Button asChild>
              <Link to="/transactions/$transactionId/edit" params={{ transactionId }}>
                <Pencil className="size-4" /> Edit
              </Link>
            </Button>
          ) : null}
          {isAdmin && transaction.status === "active" ? (
            <Button variant="destructive" onClick={() => setVoidOpen(true)}>
              <Ban className="size-4" /> Void
            </Button>
          ) : null}
        </div>
      }
    >
      {transaction.status === "cancelled" ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="space-y-1 pt-6">
            <p className="text-sm font-semibold text-destructive">This booking was voided</p>
            <p className="text-sm text-foreground">Reason: {transaction.cancel_reason || "—"}</p>
            <p className="text-xs text-muted-foreground">
              Voided by {names?.[transaction.cancelled_by ?? ""] ?? "a administrator"} on{" "}
              {formatDateTime(transaction.cancelled_at)}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Name"
            value={
              transaction.clients ? (
                <Link
                  to="/clients/$clientId"
                  params={{ clientId: transaction.clients.id }}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {transaction.clients.full_name}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <Field label="Phone" value={transaction.clients?.phone ?? "—"} />
          <Field label="Serial number" value={formatSerial(transaction.serial_number)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Travel</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Airline" value={transaction.airlines?.name ?? "—"} />
          <Field
            label="Classification"
            value={<Badge variant="secondary">{scopeLabel(transaction.airlines?.scope)}</Badge>}
          />
          <Field label="Class" value={travelClassLabel(transaction.travel_class)} />
          <Field label="Departure date" value={formatDate(transaction.departure_date)} />
          <Field label="Return date" value={formatDate(transaction.return_date)} />
          <Field label="PNR" value={transaction.pnr || "—"} />
          <Field label="Pickup / drop-off" value={transaction.pickup_dropoff || "—"} />
          <Field label="Remark" value={transaction.remark || "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Financial</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Client fare" value={formatNaira(transaction.client_fare)} />
          <Field label="Payable" value={formatNaira(transaction.payable)} />
          <Field label="Potential commission" value={formatNaira(commission)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Created by" value={names?.[transaction.created_by ?? ""] ?? "—"} />
          <Field label="Created at" value={formatDateTime(transaction.created_at)} />
          <Field label="Last updated" value={formatDateTime(transaction.updated_at)} />
        </CardContent>
      </Card>

      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void this booking?</DialogTitle>
            <DialogDescription>
              The booking is never deleted. It stays on record and is left out of active totals.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason</Label>
            <Textarea
              id="void-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {reasonError ? <p className="text-sm text-destructive">{reasonError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidOpen(false)}>
              Keep booking
            </Button>
            <Button variant="destructive" onClick={handleVoid} disabled={voidBooking.isPending}>
              {voidBooking.isPending ? "Voiding…" : "Void booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
