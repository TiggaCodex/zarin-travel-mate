import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CreateStaffDialog, RoleBadge, StatusBadge } from "@/components/staff-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentAccount } from "@/hooks/useAuth";
import { formatDate, formatDateTime } from "@/lib/format";
import { useStaffList } from "@/lib/staff";

export const Route = createFileRoute("/_authenticated/settings/users")({
  head: () => ({
    meta: [
      { title: "Staff Accounts | Zarin Travels & Tours" },
      { name: "description", content: "Create staff accounts, set who is an administrator and deactivate leavers." },
      { property: "og:title", content: "Staff Accounts | Zarin Travels & Tours" },
      { property: "og:description", content: "Create and manage staff accounts and roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPage,
});

export function AdminOnly() {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        This area is for administrators only.
      </CardContent>
    </Card>
  );
}

function UsersPage() {
  const { isAdmin, loading } = useCurrentAccount();
  const staff = useStaffList(isAdmin);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <AppShell
      title="Staff accounts"
      description="Create logins, set roles and deactivate people who have left."
      actions={
        isAdmin ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Create staff
          </Button>
        ) : null
      }
    >
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : !isAdmin ? (
        <AdminOnly />
      ) : staff.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : staff.error ? (
        <p className="text-sm text-destructive">{(staff.error as Error).message}</p>
      ) : (
        <>
          {/* Phone: cards */}
          <div className="grid gap-3 md:hidden">
            {staff.data!.map((m) => (
              <Link key={m.id} to="/settings/users/$userId" params={{ userId: m.id }} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.full_name || "—"}</p>
                    <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                    {m.phone ? <p className="text-sm text-muted-foreground">{m.phone}</p> : null}
                  </div>
                  <StatusBadge active={m.is_active} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <RoleBadge role={m.role} />
                  <span>Last login: {m.last_sign_in_at ? formatDateTime(m.last_sign_in_at) : "Never"}</span>
                </div>
              </Link>
            ))}
          </div>
          {/* Desktop: table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.data!.map((m) => (
                    <TableRow key={m.id} className="cursor-pointer" onClick={() => navigate({ to: "/settings/users/$userId", params: { userId: m.id } })}>
                      <TableCell className="font-medium">{m.full_name || "—"}</TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell>{m.phone || "—"}</TableCell>
                      <TableCell><RoleBadge role={m.role} /></TableCell>
                      <TableCell><StatusBadge active={m.is_active} /></TableCell>
                      <TableCell>{formatDate(m.created_at)}</TableCell>
                      <TableCell>{m.last_sign_in_at ? formatDateTime(m.last_sign_in_at) : "Never"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline">Manage</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
      <CreateStaffDialog open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}
