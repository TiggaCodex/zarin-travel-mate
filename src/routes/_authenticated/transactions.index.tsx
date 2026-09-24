import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDate,
  formatNaira,
  formatSerial,
  scopeLabel,
  travelClassLabel,
} from "@/lib/format";
import { useAirlines, useClients, useTransactions, type RegisterFilters } from "@/lib/zarin-data";

export const Route = createFileRoute("/_authenticated/transactions/")({
  head: () => ({
    meta: [
      { title: "Flight Register | Zarin Travels & Tours" },
      {
        name: "description",
        content: "Digital flight register: serial numbers, clients, airlines, fares and commission.",
      },
      { property: "og:title", content: "Flight Register | Zarin Travels & Tours" },
      {
        property: "og:description",
        content: "Digital flight and client register for Zarin Travels & Tours.",
      },
    ],
  }),
  component: RegisterPage,
});

const ALL = "all";

function RegisterPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<RegisterFilters>({ status: "active" });
  const { data: airlines } = useAirlines();
  const { data: clients } = useClients();
  const { data: rows, isLoading, isError } = useTransactions(filters);

  function patch(next: Partial<RegisterFilters>) {
    setFilters((prev) => ({ ...prev, ...next }));
  }

  return (
    <AppShell
      title="Flight register"
      description="Every booking recorded, newest register date first."
      actions={
        <Button asChild>
          <Link to="/transactions/new">
            <Plus className="size-4" /> New booking
          </Link>
        </Button>
      }
    >
      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-1.5 md:col-span-3 lg:col-span-2">
            <Label htmlFor="register-search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="register-search"
                className="pl-9"
                placeholder="Client, phone, airline, PNR, serial…"
                value={filters.search ?? ""}
                onChange={(e) => patch({ search: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="from">From date</Label>
            <Input
              id="from"
              type="date"
              value={filters.from ?? ""}
              onChange={(e) => patch({ from: e.target.value || undefined })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="to">To date</Label>
            <Input
              id="to"
              type="date"
              value={filters.to ?? ""}
              onChange={(e) => patch({ to: e.target.value || undefined })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Airline</Label>
            <Select
              value={filters.airlineId ?? ALL}
              onValueChange={(value) => patch({ airlineId: value === ALL ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All airlines</SelectItem>
                {(airlines ?? []).map((airline) => (
                  <SelectItem key={airline.id} value={airline.id}>
                    {airline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select
              value={filters.clientId ?? ALL}
              onValueChange={(value) => patch({ clientId: value === ALL ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All clients</SelectItem>
                {(clients ?? []).map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={filters.status ?? "active"}
              onValueChange={(value) => patch({ status: value as RegisterFilters["status"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="cancelled">Voided only</SelectItem>
                <SelectItem value={ALL}>All bookings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="p-6 text-sm text-destructive">
              The register could not be loaded. Please refresh and try again.
            </p>
          ) : (rows ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <p className="font-medium">No bookings match this view</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Adjust the search and filters, or record the first booking for this period.
              </p>
              <Button asChild size="sm">
                <Link to="/transactions/new">
                  <Plus className="size-4" /> New booking
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">S/N</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Name of client</TableHead>
                    <TableHead>Airline</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Return</TableHead>
                    <TableHead className="text-right">Client fare</TableHead>
                    <TableHead className="text-right">Payable</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>PNR</TableHead>
                    <TableHead>Pickup / drop-off</TableHead>
                    <TableHead>Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows ?? []).map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate({
                          to: "/transactions/$transactionId",
                          params: { transactionId: row.id },
                        })
                      }
                    >
                      <TableCell className="font-medium">
                        {formatSerial(row.serial_number)}
                        {row.status === "cancelled" ? (
                          <Badge variant="destructive" className="ml-2">
                            Void
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>{formatDate(row.register_date)}</TableCell>
                      <TableCell className="font-medium">
                        {row.clients?.full_name ?? "—"}
                      </TableCell>
                      <TableCell>{row.airlines?.name ?? "—"}</TableCell>
                      <TableCell>{travelClassLabel(row.travel_class)}</TableCell>
                      <TableCell>{formatDate(row.departure_date)}</TableCell>
                      <TableCell>{formatDate(row.return_date)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNaira(row.client_fare)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNaira(row.payable)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNaira(row.client_fare - row.payable)}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {scopeLabel(row.airlines?.scope)}
                        </span>
                      </TableCell>
                      <TableCell className="uppercase">{row.pnr || "—"}</TableCell>
                      <TableCell>{row.pickup_dropoff || "—"}</TableCell>
                      <TableCell className="max-w-[16rem] truncate">{row.remark || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
