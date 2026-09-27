import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatDate, formatNaira } from "@/lib/format";
import { PRESETS, rangeFor, type BusinessReport, type DateRange, type RangePreset } from "@/lib/reports";

export function RangePicker({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <ToggleGroup
        type="single"
        variant="outline"
        value={value.preset}
        onValueChange={(v) => {
          if (!v) return;
          const p = v as RangePreset;
          onChange(p === "custom" ? { ...value, preset: "custom" } : rangeFor(p));
        }}
        className="flex-wrap justify-start"
      >
        {PRESETS.map((p) => (
          <ToggleGroupItem key={p.value} value={p.value} className="px-3 text-sm">
            {p.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {value.preset === "custom" ? (
        <div className="flex flex-wrap gap-2">
          <div className="grid gap-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={value.from}
              max={value.to}
              onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={value.to}
              min={value.from}
              onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })}
            />
          </div>
        </div>
      ) : (
        <p className="pb-2 text-sm text-muted-foreground">
          {value.from === value.to ? formatDate(value.from) : `${formatDate(value.from)} – ${formatDate(value.to)}`}
        </p>
      )}
    </div>
  );
}

export function KpiGrid({ report, loading }: { report: BusinessReport | undefined; loading: boolean }) {
  if (loading || !report) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }
  const s = report.summary;
  const items: { label: string; value: string; hint?: string }[] = [
    { label: "Clients Attended", value: String(s.clients), hint: "Unique clients" },
    { label: "Total Bookings", value: String(s.bookings), hint: "Excludes voided" },
    { label: "Client Fare", value: formatNaira(s.client_fare) },
    { label: "Payable", value: formatNaira(s.payable) },
    { label: "Amount Received", value: formatNaira(s.received) },
    { label: "Outstanding", value: formatNaira(s.outstanding) },
    { label: "Commission Earned", value: formatNaira(s.earned), hint: "Fully paid bookings" },
    { label: "Pending Commission", value: formatNaira(s.pending), hint: "Awaiting full payment" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((k) => (
        <Card key={k.label} className="gap-1 py-4">
          <CardContent className="px-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className="mt-1 font-display text-xl sm:text-2xl">{k.value}</p>
            {k.hint ? <p className="text-xs text-muted-foreground">{k.hint}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ScopeBreakdown({ report }: { report: BusinessReport | undefined }) {
  const rows = (["local", "international"] as const).map(
    (scope) =>
      report?.by_scope.find((r) => r.scope === scope) ?? {
        scope,
        bookings: 0,
        client_fare: 0,
        payable: 0,
        received: 0,
        outstanding: 0,
        earned: 0,
        pending: 0,
      },
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Local vs International</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scope</TableHead>
              <TableHead className="text-right">Bookings</TableHead>
              <TableHead className="text-right">Client Fare</TableHead>
              <TableHead className="text-right">Payable</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-right">Earned</TableHead>
              <TableHead className="text-right">Pending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.scope}>
                <TableCell className="font-medium">{r.scope === "local" ? "Local" : "International"}</TableCell>
                <TableCell className="text-right">{r.bookings}</TableCell>
                <TableCell className="text-right">{formatNaira(r.client_fare)}</TableCell>
                <TableCell className="text-right">{formatNaira(r.payable)}</TableCell>
                <TableCell className="text-right">{formatNaira(r.received)}</TableCell>
                <TableCell className="text-right">{formatNaira(r.outstanding)}</TableCell>
                <TableCell className="text-right">{formatNaira(r.earned)}</TableCell>
                <TableCell className="text-right">{formatNaira(r.pending)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (n: number) =>
  n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}m` : n >= 1000 ? `₦${Math.round(n / 1000)}k` : `₦${n}`;

export function chartSeries(report: BusinessReport, range: DateRange) {
  const useMonthly = range.preset === "year" || report.daily.length > 62;
  return useMonthly
    ? report.monthly.map((m) => ({ ...m, label: `${MONTHS[Number(m.month.slice(5, 7)) - 1]} ${m.month.slice(2, 4)}` }))
    : report.daily.map((d) => ({ ...d, label: formatDate(d.day).slice(0, 6) }));
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-56 px-2">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ReportCharts({ report, range }: { report: BusinessReport; range: DateRange }) {
  const data = chartSeries(report, range);
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No bookings in this period to chart.</p>;
  }
  const axis = { fontSize: 11, stroke: "var(--muted-foreground)" };
  const tip = { formatter: (v: number) => formatNaira(v) };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChartCard title="Bookings over time">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={axis} />
          <YAxis allowDecimals={false} tick={axis} width={30} />
          <Tooltip />
          <Bar dataKey="bookings" name="Bookings" fill="var(--chart-1)" radius={3} />
        </BarChart>
      </ChartCard>
      <ChartCard title="Client Fare vs Amount Received">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={axis} />
          <YAxis tickFormatter={short} tick={axis} width={52} />
          <Tooltip {...tip} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line dataKey="client_fare" name="Client Fare" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
          <Line dataKey="received" name="Received" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
        </LineChart>
      </ChartCard>
      <ChartCard title="Commission Earned">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={axis} />
          <YAxis tickFormatter={short} tick={axis} width={52} />
          <Tooltip {...tip} />
          <Bar dataKey="earned" name="Earned" fill="var(--chart-2)" radius={3} />
        </BarChart>
      </ChartCard>
      <ChartCard title="Local vs International bookings">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={axis} />
          <YAxis allowDecimals={false} tick={axis} width={30} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="local" name="Local" stackId="s" fill="var(--chart-3)" />
          <Bar dataKey="international" name="International" stackId="s" fill="var(--chart-1)" />
        </BarChart>
      </ChartCard>
    </div>
  );
}
