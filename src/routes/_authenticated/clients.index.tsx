import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ClientDialog } from "@/components/client-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { useClients, type Client } from "@/lib/zarin-data";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({
    meta: [
      { title: "Clients | Zarin Travels & Tours" },
      {
        name: "description",
        content: "Client database for Zarin Travels & Tours with contact details and bookings.",
      },
      { property: "og:title", content: "Clients | Zarin Travels & Tours" },
      { property: "og:description", content: "Client database with contact details and bookings." },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const { data: clients, isLoading, isError } = useClients(search);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setDialogOpen(true);
  }

  return (
    <AppShell
      title="Clients"
      description="Reusable client records — search by name or phone number."
      actions={
        <Button onClick={openNew}>
          <Plus className="size-4" /> New client
        </Button>
      }
    >
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name or phone number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search clients"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="p-6 text-sm text-destructive">
              The client list could not be loaded. Please refresh and try again.
            </p>
          ) : (clients ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <p className="font-medium">
                {search ? "No client matches that search" : "No clients yet"}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {search
                  ? "Try part of the name or phone number."
                  : "Add your first client and they will be available for every booking."}
              </p>
              <Button size="sm" onClick={openNew}>
                <Plus className="size-4" /> New client
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(clients ?? []).map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        <Link
                          to="/clients/$clientId"
                          params={{ clientId: client.id }}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {client.full_name}
                        </Link>
                      </TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{client.email || "—"}</TableCell>
                      <TableCell>{formatDate(client.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(client)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ClientDialog open={dialogOpen} onOpenChange={setDialogOpen} client={editing} />
    </AppShell>
  );
}
