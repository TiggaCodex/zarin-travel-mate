import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Copy, PlaneLanding, PlaneTakeoff, Send, Share2, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useCurrentAccount } from "@/hooks/useAuth";
import { formatDate, formatDateTime, formatSerial } from "@/lib/format";
import {
  reminderMessage,
  useSetReminderStatus,
  type ReminderRow,
  type ReminderStatus,
} from "@/lib/reminders";
import { useProfileNames } from "@/lib/zarin-data";

const STATUS: Record<ReminderStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "border-border bg-muted text-muted-foreground" },
  sent: { label: "Sent", className: "border-transparent bg-primary text-primary-foreground" },
  dismissed: { label: "Dismissed", className: "border-border text-muted-foreground line-through" },
};

export function ReminderStatusBadge({ status }: { status: ReminderStatus }) {
  const s = STATUS[status];
  return (
    <Badge variant="outline" className={s.className}>
      {s.label}
    </Badge>
  );
}

export function KindLabel({ kind }: { kind: ReminderRow["kind"] }) {
  const Icon = kind === "return" ? PlaneLanding : PlaneTakeoff;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="size-3.5" /> {kind === "return" ? "Return" : "Departure"}
    </span>
  );
}

export function SendReminderDialog({
  reminder,
  onOpenChange,
}: {
  reminder: ReminderRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const setStatus = useSetReminderStatus();
  const [text, setText] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);
  if (reminder && reminder.id !== lastId) {
    setLastId(reminder.id);
    setText(reminderMessage(reminder));
  }

  const phone = reminder?.transactions?.clients?.phone?.replace(/\D/g, "") ?? "";
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied");
    } catch {
      toast.error("Could not copy — select the text and copy it manually.");
    }
  }

  async function markSent() {
    if (!reminder) return;
    try {
      await setStatus.mutateAsync({ id: reminder.id, status: "sent" });
      toast.success("Reminder marked as sent");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the reminder.");
    }
  }

  return (
    <Dialog open={Boolean(reminder)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prepare reminder message</DialogTitle>
          <DialogDescription>
            Copy or share this message with the client. Nothing is sent automatically — mark it as
            sent once you have delivered it.
          </DialogDescription>
        </DialogHeader>
        <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            <Copy className="size-4" /> Copy
          </Button>
          {phone ? (
            <Button asChild variant="outline" size="sm">
              <a
                href={`https://wa.me/${phone.startsWith("0") ? `234${phone.slice(1)}` : phone}?text=${encodeURIComponent(text)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Send className="size-4" /> Open in WhatsApp
              </a>
            </Button>
          ) : null}
          {canShare ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void navigator.share({ text }).catch(() => undefined)}
            >
              <Share2 className="size-4" /> Share
            </Button>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {reminder?.status !== "sent" ? (
            <Button onClick={markSent} disabled={setStatus.isPending}>
              <Check className="size-4" /> Mark as sent
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReminderActions({
  reminder,
  onSend,
}: {
  reminder: ReminderRow;
  onSend: (r: ReminderRow) => void;
}) {
  const { isAdmin } = useCurrentAccount();
  const setStatus = useSetReminderStatus();
  const active = reminder.transactions?.status === "active";
  if (!active) return null;

  async function update(status: ReminderStatus, msg: string) {
    try {
      await setStatus.mutateAsync({ id: reminder.id, status });
      toast.success(msg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the reminder.");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => onSend(reminder)}>
        <Send className="size-4" /> Send reminder
      </Button>
      {reminder.status === "pending" ? (
        <Button
          size="sm"
          disabled={setStatus.isPending}
          onClick={() => update("sent", "Reminder marked as sent")}
        >
          <Check className="size-4" /> Mark as sent
        </Button>
      ) : null}
      {isAdmin && reminder.status === "pending" ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={setStatus.isPending}
          onClick={() => update("dismissed", "Reminder dismissed")}
        >
          <X className="size-4" /> Dismiss
        </Button>
      ) : null}
      {isAdmin && reminder.status !== "pending" ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={setStatus.isPending}
          onClick={() => update("pending", "Reminder reopened")}
        >
          Reopen
        </Button>
      ) : null}
    </div>
  );
}

export function ReminderCard({
  reminder,
  onSend,
  showDate = true,
}: {
  reminder: ReminderRow;
  onSend: (r: ReminderRow) => void;
  showDate?: boolean;
}) {
  const t = reminder.transactions;
  const { data: names } = useProfileNames([reminder.sent_by]);
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <KindLabel kind={reminder.kind} />
          <p className="font-semibold text-foreground">
            {t?.clients ? (
              <Link
                to="/clients/$clientId"
                params={{ clientId: t.clients.id }}
                className="underline-offset-4 hover:underline"
              >
                {t.clients.full_name}
              </Link>
            ) : (
              "—"
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {t?.airlines?.name ?? "—"} · PNR: {t?.pnr || "—"}
            {showDate ? ` · ${formatDate(reminder.due_date)}` : null}
          </p>
          {t ? (
            <Link
              to="/transactions/$transactionId"
              params={{ transactionId: t.id }}
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              Booking {formatSerial(t.serial_number)}
            </Link>
          ) : null}
        </div>
        <ReminderStatusBadge status={reminder.status} />
      </div>
      {reminder.status === "sent" ? (
        <p className="text-xs text-muted-foreground">
          Sent by {names?.[reminder.sent_by ?? ""] ?? "staff"} on {formatDateTime(reminder.sent_at)}
        </p>
      ) : null}
      <ReminderActions reminder={reminder} onSend={onSend} />
    </div>
  );
}
