import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatNaira, todayISO } from "@/lib/format";
import { useRecordPayment, type Financials, type PaymentStatus } from "@/lib/zarin-data";
import type { Enums } from "@/integrations/supabase/types";

export const PAYMENT_METHODS: { value: Enums<"payment_method">; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Bank Transfer" },
  { value: "pos", label: "POS" },
  { value: "other", label: "Other" },
];

export function paymentMethodLabel(value: string | null | undefined) {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? "—";
}

const STATUS: Record<PaymentStatus, { label: string; className: string }> = {
  paid: { label: "Paid", className: "border-transparent bg-primary text-primary-foreground" },
  partially_paid: {
    label: "Partially Paid",
    className: "border-transparent bg-accent text-accent-foreground",
  },
  pending: { label: "Pending", className: "border-border bg-muted text-muted-foreground" },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus | null | undefined }) {
  const s = STATUS[status ?? "pending"];
  return (
    <Badge variant="outline" className={s.className}>
      {s.label}
    </Badge>
  );
}

/** Commission shown in the register: recognized only once fully paid. */
export function CommissionValue({ financials }: { financials: Financials | null }) {
  if (!financials) return <>—</>;
  if (financials.payment_status === "paid") {
    return <span className="font-medium">{formatNaira(financials.recognized_commission)}</span>;
  }
  return (
    <span className="text-muted-foreground" title="Not recognized until fully paid">
      {formatNaira(financials.pending_commission)}{" "}
      <span className="text-xs italic">pending</span>
    </span>
  );
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  transactionId,
  outstanding,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  outstanding: number;
}) {
  const record = useRecordPayment();
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(todayISO());
  const [method, setMethod] = useState<Enums<"payment_method">>("cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setAmount("");
    setPaidOn(todayISO());
    setMethod("cash");
    setReference("");
    setNote("");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!amount || !Number.isInteger(value) || value <= 0) {
      return setError("Enter a payment amount greater than zero.");
    }
    if (!paidOn || Number.isNaN(new Date(paidOn).getTime())) {
      return setError("Enter a valid payment date.");
    }
    if (value > outstanding) {
      return setError(`Payment exceeds the outstanding balance of ${formatNaira(outstanding)}.`);
    }
    setError("");
    try {
      await record.mutateAsync({
        transaction_id: transactionId,
        amount: value,
        paid_on: paidOn,
        method,
        reference: reference.trim() || null,
        note: note.trim() || null,
      });
      toast.success(`Payment of ${formatNaira(value)} recorded`);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record the payment.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              Outstanding balance: <strong>{formatNaira(outstanding)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount (₦)</Label>
              <Input
                id="pay-amount"
                inputMode="numeric"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                placeholder={String(outstanding)}
              />
              <button
                type="button"
                className="text-xs text-primary underline-offset-4 hover:underline"
                onClick={() => setAmount(String(outstanding))}
              >
                Pay full balance
              </button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-date">Payment date</Label>
              <Input id="pay-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as Enums<"payment_method">)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-ref">Reference</Label>
              <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-note">Note</Label>
            <Textarea id="pay-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={record.isPending}>
              {record.isPending ? "Saving…" : "Save payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
