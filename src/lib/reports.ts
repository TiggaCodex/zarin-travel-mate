import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { addDaysISO, todayISO } from "@/lib/format";
import type { PaymentStatus } from "@/lib/zarin-data";

export type RangePreset = "today" | "week" | "month" | "year" | "custom";
export type DateRange = { preset: RangePreset; from: string; to: string };

export const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

/** All ranges are Lagos calendar dates, matching transactions.register_date. */
export function rangeFor(preset: Exclude<RangePreset, "custom">): DateRange {
  const today = todayISO();
  if (preset === "today") return { preset, from: today, to: today };
  if (preset === "week") {
    const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
    const monday = addDaysISO(today, -((dow + 6) % 7));
    return { preset, from: monday, to: addDaysISO(monday, 6) };
  }
  if (preset === "month") {
    const from = `${today.slice(0, 7)}-01`;
    const next = new Date(`${from}T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    return { preset, from, to: addDaysISO(next.toISOString().slice(0, 10), -1) };
  }
  return { preset, from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
}

export type Totals = {
  bookings: number;
  client_fare: number;
  payable: number;
  received: number;
  outstanding: number;
  earned: number;
  pending: number;
};
export type Series = {
  bookings: number;
  local: number;
  international: number;
  client_fare: number;
  received: number;
  outstanding: number;
  earned: number;
};
export type BusinessReport = {
  summary: Totals & { clients: number };
  by_scope: (Totals & { scope: "local" | "international" })[];
  daily: (Series & { day: string })[];
  monthly: (Series & { month: string })[];
};

export function useBusinessReport(range: DateRange, enabled = true) {
  return useQuery({
    queryKey: ["report", range.from, range.to],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("business_report", {
        _from: range.from,
        _to: range.to,
      });
      if (error) throw error;
      return data as unknown as BusinessReport;
    },
  });
}

export type ReportRow = {
  transaction_id: string;
  serial_number: number;
  register_date: string;
  client_name: string;
  airline_name: string;
  scope: "local" | "international";
  client_fare: number;
  payable: number;
  amount_paid: number;
  outstanding: number;
  payment_status: PaymentStatus;
  recognized_commission: number;
  pending_commission: number;
};

export function useReportRows(range: DateRange, enabled = true) {
  return useQuery({
    queryKey: ["report-rows", range.from, range.to],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transaction_financials")
        .select("*, clients ( full_name ), airlines ( name )")
        .eq("status", "active")
        .gte("register_date", range.from)
        .lte("register_date", range.to)
        .order("register_date", { ascending: false })
        .order("serial_number", { ascending: false })
        .limit(5000);
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((r: any) => ({
        transaction_id: r.transaction_id,
        serial_number: r.serial_number,
        register_date: r.register_date,
        client_name: r.clients?.full_name ?? "—",
        airline_name: r.airlines?.name ?? "—",
        scope: r.commission_scope,
        client_fare: r.client_fare,
        payable: r.payable,
        amount_paid: r.amount_paid,
        outstanding: r.outstanding,
        payment_status: r.payment_status,
        recognized_commission: r.recognized_commission,
        pending_commission: r.pending_commission,
      })) as ReportRow[];
    },
  });
}

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pending",
  partially_paid: "Partially Paid",
  paid: "Paid",
};

export function downloadReportCsv(rows: ReportRow[], range: DateRange) {
  const header = [
    "Serial Number",
    "Register Date",
    "Client",
    "Airline",
    "Scope",
    "Client Fare",
    "Payable",
    "Amount Paid",
    "Outstanding",
    "Payment Status",
    "Recognized Commission",
    "Pending Commission",
  ];
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [
      String(r.serial_number).padStart(4, "0"),
      r.register_date,
      r.client_name,
      r.airline_name,
      r.scope === "local" ? "Local" : "International",
      r.client_fare,
      r.payable,
      r.amount_paid,
      r.outstanding,
      STATUS_LABEL[r.payment_status],
      r.recognized_commission,
      r.pending_commission,
    ]
      .map(esc)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zarin-report-${range.from}-to-${range.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
