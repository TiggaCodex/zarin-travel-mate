import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpDown, Download } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { PaymentStatusBadge } from "@/components/payment-bits";
import { KpiGrid, RangePicker, ReportCharts, ScopeBreakdown } from "@/components/report-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentAccount } from "@/hooks/useAuth";
import { formatDate, formatNaira, formatSerial } from "@/lib/format";
import {
  downloadReportCsv,
  rangeFor,
  useBusinessReport,
  useReportRows,
  type DateRange,
  type ReportRow,
} from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports | Zarin Travels & Tours" },
      {
        name: "description",
        content: "Daily, weekly, monthly, yearly and custom range reports on fares, payments and commission.",
      },
      { property: "og:title", content: "Reports | Zarin Travels & Tours" },
      {
        property: "og:description",
        content: "Reports on fares, payments received, outstanding balances and commission.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

type SortKey = keyof Pick<
  ReportRow,
  "serial_number" | "register_date" | "client_name" | "airline_name" | "client_fare" | "amount_paid" | "outstanding" | "recognized_commission" | "pending_commission"
>;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function ReportsPage() {
  const { isAdmin, loading } = useCurrentAccount();
  const navigate = useNavigate();
  const [range, setRange] = useState<DateRange>(() => rangeFor("today"));
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "register_date", dir: -1 });
  const report = useBusinessReport(range, isAdmin);
  const rows = useReportRows(range, isAdmin);

  const sorted = useMemo(() => {
    const list = [...(rows.data ?? [])];
    list.sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return c === 0 ? (b.serial_number - a.serial_number) : c * sort.dir;
    });
    return list;
  }, [rows.data, sort]);

  if (!loading && !isAdmin) {
    return (
      <AppShell title="Reports" description="Financial summaries for any period.">
        <Card>
          <CardHeader>
            <CardTitle>Administrators only</CardTitle>
            <CardDescription>Ask an administrator if you need figures from this section.</CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  const Th = ({ k, label, right }: { k: SortKey; label: string; right?: boolean }) => (
    <TableHead className={right ? "text-right" : ""}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : -1 }))}
      >
        {label}
        <ArrowUpDown className="size-3" />
      </button>
    </TableHead>
  );

  const r = report.data;
  const multiDay = range.from !== range.to;
  const showMonthly = range.preset === "year" || (r?.daily.length ?? 0) > 62;

  return (
    <AppShell title="Reports" description="Figures follow each booking's register date. Voided bookings are left out.">
      <RangePicker value={range} onChange={setRange} />
      {report.error ? <p className="text-sm text-destructive">{(report.error as Error).message}</p> : null}

      <KpiGrid report={r} loading={report.isLoading} />
      <ScopeBreakdown report={r} />
      {r ? <ReportCharts report={r} range={range} /> : null}

      {r && multiDay ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{showMonthly ? "Monthly performance" : "Daily performance"}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {(showMonthly ? r.monthly : r.daily).length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings in this period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{showMonthly ? "Month" : "Date"}</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Client Fare</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(showMonthly
                    ? r.monthly.map((m) => ({ ...m, label: `${MONTHS[Number(m.month.slice(5, 7)) - 1]} ${m.month.slice(0, 4)}` }))
                    : r.daily.map((d) => ({ ...d, label: formatDate(d.day) }))
                  ).map((p) => (
                    <TableRow key={p.label}>
                      <TableCell className="font-medium">{p.label}</TableCell>
                      <TableCell className="text-right">{p.bookings}</TableCell>
                      <TableCell className="text-right">{formatNaira(p.client_fare)}</TableCell>
                      <TableCell className="text-right">{formatNaira(p.received)}</TableCell>
                      <TableCell className="text-right">{formatNaira(p.outstanding)}</TableCell>
                      <TableCell className="text-right">{formatNaira(p.earned)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Bookings in this period</CardTitle>
          <Button
            size="sm"
            variant="outline"
            disabled={!rows.data || rows.data.length === 0}
            onClick={() => downloadReportCsv(sorted, range)}
          >
            <Download className="size-4" /> Download CSV
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings in this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <Th k="serial_number" label="S/N" />
                  <Th k="register_date" label="Register Date" />
                  <Th k="client_name" label="Client" />
                  <Th k="airline_name" label="Airline" />
                  <TableHead>Scope</TableHead>
                  <Th k="client_fare" label="Client Fare" right />
                  <TableHead className="text-right">Payable</TableHead>
                  <Th k="amount_paid" label="Paid" right />
                  <Th k="outstanding" label="Outstanding" right />
                  <TableHead>Status</TableHead>
                  <Th k="recognized_commission" label="Recognized" right />
                  <Th k="pending_commission" label="Pending" right />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((t) => (
                  <TableRow
                    key={t.transaction_id}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: "/transactions/$transactionId", params: { transactionId: t.transaction_id } })}
                  >
                    <TableCell className="font-mono">{formatSerial(t.serial_number)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(t.register_date)}</TableCell>
                    <TableCell className="whitespace-nowrap">{t.client_name}</TableCell>
                    <TableCell className="whitespace-nowrap">{t.airline_name}</TableCell>
                    <TableCell>{t.scope === "local" ? "Local" : "International"}</TableCell>
                    <TableCell className="text-right">{formatNaira(t.client_fare)}</TableCell>
                    <TableCell className="text-right">{formatNaira(t.payable)}</TableCell>
                    <TableCell className="text-right">{formatNaira(t.amount_paid)}</TableCell>
                    <TableCell className="text-right">{formatNaira(t.outstanding)}</TableCell>
                    <TableCell><PaymentStatusBadge status={t.payment_status} /></TableCell>
                    <TableCell className="text-right">{formatNaira(t.recognized_commission)}</TableCell>
                    <TableCell className="text-right">{formatNaira(t.pending_commission)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
