import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Ban, Pencil, Wallet } from "lucide-react";
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
import {
  paymentMethodLabel,
  PaymentStatusBadge,
  RecordPaymentDialog,
} from "@/components/payment-bits";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  KindLabel,
  ReminderActions,
  ReminderStatusBadge,
  SendReminderDialog,
} from "@/components/reminder-bits";
import { formatLongDate } from "@/lib/format";
import { useTransactionReminders, type ReminderRow } from "@/lib/reminders";
import {
  usePayments,
  useProfileNames,
  useTransaction,
  useVoidTransaction,
} from "@/lib/zarin-data";

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
  const [payOpen, setPayOpen] = useState(false);
  const [sending, setSending] = useState<ReminderRow | null>(null);
  const { data: reminders } = useTransactionReminders(transactionId);
  const { data: payments, isLoading: paymentsLoading } = usePayments(transactionId);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const { data: names } = useProfileNames([
    transaction?.created_by,
    transaction?.cancelled_by,
    ...(payments ?? []).map((p) => p.recorded_by),
  ]);

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

  const fin = transaction.financials;
  const canPay =
    transaction.status === "active" && Boolean(fin) && (fin?.outstanding ?? 0) > 0;

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
          <CardTitle className="text-base">Travel reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!reminders || reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reminders for this booking.</p>
          ) : (
            reminders.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <KindLabel kind={r.kind} />
                  <p className="text-sm font-medium">{formatLongDate(r.due_date)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <ReminderStatusBadge status={r.status} />
                  <ReminderActions reminder={r} onSend={setSending} />
                </div>
              </div>
            ))
          )}
          {transaction.status === "cancelled" ? (
            <p className="text-xs text-muted-foreground">
              Kept on record only — voided bookings do not appear in reminder lists.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Financial summary</CardTitle>
          {canPay ? (
            <Button size="sm" onClick={() => setPayOpen(true)}>
              <Wallet className="size-4" /> Record payment
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <Field label="Client fare" value={formatNaira(transaction.client_fare)} />
          <Field label="Payable" value={formatNaira(transaction.payable)} />
          <Field label="Potential commission" value={formatNaira(fin?.potential_commission)} />
          <Field label="Payment status" value={<PaymentStatusBadge status={fin?.payment_status} />} />
          <Field label="Amount paid" value={formatNaira(fin?.amount_paid)} />
          <Field
            label="Outstanding"
            value={
              <span className={(fin?.outstanding ?? 0) > 0 ? "text-destructive" : undefined}>
                {formatNaira(fin?.outstanding)}
              </span>
            }
          />
          <Field label="Recognized commission" value={formatNaira(fin?.recognized_commission)} />
          <Field label="Pending commission" value={formatNaira(fin?.pending_commission)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {paymentsLoading ? (
            <div className="p-6">
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !payments || payments.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Recorded by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.paid_on)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNaira(p.amount)}</TableCell>
                      <TableCell>{paymentMethodLabel(p.method)}</TableCell>
                      <TableCell>{p.reference || "—"}</TableCell>
                      <TableCell>{p.note || "—"}</TableCell>
                      <TableCell>{names?.[p.recorded_by ?? ""] ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-semibold">Total paid</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatNaira(fin?.amount_paid)}
                    </TableCell>
                    <TableCell colSpan={4} />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Created by" value={names?.[transaction.created_by ?? ""] ?? "—"} />
          <Field label="Submitted at" value={formatDateTime(transaction.created_at)} />
          <Field label="Last updated" value={formatDateTime(transaction.updated_at)} />
        </CardContent>
      </Card>

      <SendReminderDialog reminder={sending} onOpenChange={(o) => !o && setSending(null)} />

      <RecordPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        transactionId={transactionId}
        outstanding={fin?.outstanding ?? 0}
      />

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
