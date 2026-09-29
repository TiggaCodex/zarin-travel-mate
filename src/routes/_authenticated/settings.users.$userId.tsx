import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { errorText, RoleBadge, StatusBadge } from "@/components/staff-bits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentAccount } from "@/hooks/useAuth";
import { formatDate, formatDateTime } from "@/lib/format";
import { useResendInvite, useSetStaffActive, useSetStaffRole, useStaffMember } from "@/lib/staff";

export const Route = createFileRoute("/_authenticated/settings/users/$userId")({
  head: () => ({
    meta: [
      { title: "Staff Profile | Zarin Travels & Tours" },
      { name: "description", content: "Staff account details, role, status and activity summary." },
      { property: "og:title", content: "Staff Profile | Zarin Travels & Tours" },
      { property: "og:description", content: "Staff account details and activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StaffProfilePage,
});

function Confirm({
  trigger,
  title,
  body,
  action,
  onConfirm,
  destructive,
}: {
  trigger: React.ReactNode;
  title: string;
  body: string;
  action: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            onClick={onConfirm}
          >
            {action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StaffProfilePage() {
  const { userId } = Route.useParams();
  const { isAdmin, loading, user } = useCurrentAccount();
  const q = useStaffMember(userId, isAdmin);
  const setActive = useSetStaffActive();
  const setRole = useSetStaffRole();
  const resend = useResendInvite();

  async function run(p: Promise<unknown>, ok: string) {
    try {
      await p;
      toast.success(ok);
      void q.refetch();
    } catch (e) {
      toast.error(errorText(e));
    }
  }

  const m = q.data?.member;
  const a = q.data?.activity;
  const self = m?.id === user?.id;

  return (
    <AppShell
      title={m?.full_name || "Staff profile"}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/settings/users"><ArrowLeft className="size-4" /> All staff</Link>
        </Button>
      }
    >
      {loading || (isAdmin && q.isLoading) ? (
        <Skeleton className="h-60 w-full" />
      ) : !isAdmin ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">This area is for administrators only.</CardContent></Card>
      ) : q.error || !m || !a ? (
        <p className="text-sm text-destructive">{q.error ? (q.error as Error).message : "Account not found."}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <Item label="Full name" value={m.full_name || "—"} />
                <Item label="Email" value={m.email ?? "—"} />
                <Item label="Phone" value={m.phone || "—"} />
                <div><dt className="text-muted-foreground">Role</dt><dd className="mt-1"><RoleBadge role={m.role} /></dd></div>
                <div><dt className="text-muted-foreground">Status</dt><dd className="mt-1"><StatusBadge active={m.is_active} /></dd></div>
                <Item label="Account created" value={formatDate(m.created_at)} />
                <Item label="Last login" value={m.last_sign_in_at ? formatDateTime(m.last_sign_in_at) : "Never signed in"} />
              </dl>
              <div className="mt-6 flex flex-wrap gap-2 border-t pt-4">
                {m.role === "staff" ? (
                  <Confirm
                    trigger={<Button variant="outline" disabled={setRole.isPending}>Make administrator</Button>}
                    title="Make this person an administrator?"
                    body="Administrators can see all reports and manage staff, airlines and bookings."
                    action="Make administrator"
                    onConfirm={() => run(setRole.mutateAsync({ id: m.id, role: "admin" }), "Role changed to Administrator")}
                  />
                ) : (
                  <Confirm
                    trigger={<Button variant="outline" disabled={setRole.isPending}>Change to staff</Button>}
                    title="Change this administrator to staff?"
                    body={self ? "You will lose access to reports and staff management straight away." : "They will lose access to reports and staff management."}
                    action="Change to staff"
                    onConfirm={() => run(setRole.mutateAsync({ id: m.id, role: "staff" }), "Role changed to Staff")}
                  />
                )}
                {m.is_active ? (
                  <Confirm
                    destructive
                    trigger={<Button variant="destructive" disabled={setActive.isPending || self}>Deactivate</Button>}
                    title="Deactivate this account?"
                    body="They will no longer be able to sign in. Their bookings, payments and reminders stay on record under their name."
                    action="Deactivate"
                    onConfirm={() => run(setActive.mutateAsync({ id: m.id, active: false }), "Account deactivated")}
                  />
                ) : (
                  <Button disabled={setActive.isPending} onClick={() => run(setActive.mutateAsync({ id: m.id, active: true }), "Account reactivated")}>
                    Reactivate
                  </Button>
                )}
                {m.email && !m.last_sign_in_at ? (
                  <Button variant="ghost" disabled={resend.isPending} onClick={() => run(resend.mutateAsync(m.email!), "Set-password email sent")}>
                    Resend set-password email
                  </Button>
                ) : null}
              </div>
              {self ? <p className="mt-2 text-xs text-muted-foreground">You cannot deactivate your own account.</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Activity</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Stat label="Bookings created" value={a.bookings} />
              <Stat label="Payments recorded" value={a.payments} />
              <Stat label="Reminders marked as sent" value={a.remindersSent} />
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-medium">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-display text-2xl">{value}</span>
    </div>
  );
}
