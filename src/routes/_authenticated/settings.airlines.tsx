import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plane, Plus, Power, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCurrentAccount } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { scopeLabel } from "@/lib/format";
import { useAirlines, type Airline } from "@/lib/zarin-data";
import { AdminOnly } from "./settings.users";

export const Route = createFileRoute("/_authenticated/settings/airlines")({
  head: () => ({
    meta: [
      { title: "Airlines | Zarin Travels & Tours" },
      {
        name: "description",
        content: "Manage the airlines available for bookings and classify them as local or international.",
      },
      { property: "og:title", content: "Airlines | Zarin Travels & Tours" },
      { property: "og:description", content: "Manage the airline list used across the register." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AirlinesPage,
});

type Scope = Airline["scope"];
type Filter = "all" | "local" | "international" | "active" | "inactive";

function friendlyError(message: string) {
  if (/duplicate key|already exists/i.test(message)) return message.includes("already exists") ? message : "An airline with this name already exists.";
  if (/row-level security|permission/i.test(message)) return "Only an administrator can change airlines.";
  return message;
}

function useSaveAirline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; scope: Scope; is_active: boolean }) => {
      const { id, ...values } = input;
      const { error } = id
        ? await supabase.from("airlines").update(values).eq("id", id)
        : await supabase.from("airlines").insert(values);
      if (error) throw new Error(friendlyError(error.message));
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["airlines"] }),
  });
}

function ScopeBadge({ scope }: { scope: Scope }) {
  return (
    <Badge variant={scope === "international" ? "default" : "secondary"}>{scopeLabel(scope)}</Badge>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant="outline" className={active ? "border-primary/40 text-primary" : "text-muted-foreground"}>
      <span className={`mr-1.5 inline-block size-1.5 rounded-full ${active ? "bg-primary" : "bg-muted-foreground"}`} />
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

function AirlinesPage() {
  const { isAdmin, loading } = useCurrentAccount();
  const { data: airlines, isLoading } = useAirlines();
  const save = useSaveAirline();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Airline | null | "new">(null);
  const [confirm, setConfirm] = useState<Airline | null>(null);

  const list = airlines ?? [];
  const stats = {
    total: list.length,
    active: list.filter((a) => a.is_active).length,
    local: list.filter((a) => a.scope === "local").length,
    international: list.filter((a) => a.scope === "international").length,
  };

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return list.filter((a) => {
      if (term && !a.name.toLowerCase().includes(term)) return false;
      if (filter === "local" || filter === "international") return a.scope === filter;
      if (filter === "active") return a.is_active;
      if (filter === "inactive") return !a.is_active;
      return true;
    });
  }, [list, search, filter]);

  async function toggle(airline: Airline, active: boolean) {
    try {
      await save.mutateAsync({ id: airline.id, name: airline.name, scope: airline.scope, is_active: active });
      toast.success(`${airline.name} ${active ? "activated" : "deactivated"}.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const actions = (a: Airline) => (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
        <Pencil className="size-3.5" /> Edit
      </Button>
      <Button
        size="sm"
        variant={a.is_active ? "ghost" : "secondary"}
        onClick={() => (a.is_active ? setConfirm(a) : void toggle(a, true))}
      >
        <Power className="size-3.5" /> {a.is_active ? "Deactivate" : "Activate"}
      </Button>
    </div>
  );

  return (
    <AppShell
      title="Airlines"
      description="Manage the airlines available for bookings and classify them as local or international."
      actions={
        isAdmin ? (
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Add Airline
          </Button>
        ) : null
      }
    >
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : !isAdmin ? (
        <AdminOnly />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Total Airlines", stats.total],
              ["Active Airlines", stats.active],
              ["Local Airlines", stats.local],
              ["International Airlines", stats.international],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1 font-display text-2xl font-semibold">{isLoading ? "–" : value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative md:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search airlines"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search airlines"
              />
            </div>
            <ToggleGroup
              type="single"
              variant="outline"
              value={filter}
              onValueChange={(v) => v && setFilter(v as Filter)}
              className="flex flex-wrap justify-start"
            >
              {(["all", "local", "international", "active", "inactive"] as const).map((f) => (
                <ToggleGroupItem key={f} value={f} className="capitalize px-3">
                  {f}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {isLoading ? (
            <Skeleton className="h-60 w-full" />
          ) : visible.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
                <Plane className="size-6" />
                No airlines match your search or filter.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Airline</TableHead>
                      <TableHead>Classification</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((a) => (
                      <TableRow key={a.id} className={a.is_active ? "" : "opacity-70"}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell><ScopeBadge scope={a.scope} /></TableCell>
                        <TableCell><ActiveBadge active={a.is_active} /></TableCell>
                        <TableCell><div className="flex justify-end">{actions(a)}</div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              <div className="grid gap-3 md:hidden">
                {visible.map((a) => (
                  <Card key={a.id} className={a.is_active ? "" : "opacity-70"}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{a.name}</p>
                        <ActiveBadge active={a.is_active} />
                      </div>
                      <ScopeBadge scope={a.scope} />
                      {actions(a)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {editing ? (
        <AirlineDialog
          airline={editing === "new" ? null : editing}
          existing={list}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            await save.mutateAsync(values);
            toast.success(values.id ? "Airline updated." : "Airline added.");
            setEditing(null);
          }}
        />
      ) : null}

      <AlertDialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {confirm?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivated airlines cannot be selected for new bookings, but existing bookings will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) void toggle(confirm, false);
                setConfirm(null);
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function AirlineDialog({
  airline,
  existing,
  onClose,
  onSave,
}: {
  airline: Airline | null;
  existing: Airline[];
  onClose: () => void;
  onSave: (v: { id?: string; name: string; scope: Scope; is_active: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState(airline?.name ?? "");
  const [scope, setScope] = useState<Scope | "">(airline?.scope ?? "");
  const [active, setActive] = useState(airline?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return setError("Airline name is required.");
    if (clean.length > 100) return setError("Airline name must be 100 characters or fewer.");
    if (!scope) return setError("Choose Local or International.");
    if (existing.some((a) => a.id !== airline?.id && a.name.toLowerCase() === clean.toLowerCase()))
      return setError(`An airline named "${clean}" already exists.`);
    setError(null);
    setBusy(true);
    try {
      await onSave({ ...(airline ? { id: airline.id } : {}), name: clean, scope, is_active: active });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{airline ? "Edit airline" : "Add airline"}</DialogTitle>
            <DialogDescription>Bookings take their Local or International classification from here.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="airline-name">Airline Name</Label>
            <Input id="airline-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Classification</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={scope}
              onValueChange={(v) => v && setScope(v as Scope)}
              className="grid grid-cols-2"
            >
              <ToggleGroupItem value="local">Local</ToggleGroupItem>
              <ToggleGroupItem value="international">International</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="airline-active">Active</Label>
              <p className="text-xs text-muted-foreground">Only active airlines can be chosen for new bookings.</p>
            </div>
            <Switch id="airline-active" checked={active} onCheckedChange={setActive} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>{airline ? "Save changes" : "Add Airline"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
