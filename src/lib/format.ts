import type { Enums } from "@/integrations/supabase/types";

export type TravelClass = Enums<"travel_class">;
export type AirlineScope = Enums<"airline_scope">;

export const TRAVEL_CLASSES: { value: TravelClass; label: string }[] = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

export function travelClassLabel(value: TravelClass | null | undefined) {
  return TRAVEL_CLASSES.find((c) => c.value === value)?.label ?? "—";
}

export function scopeLabel(scope: AirlineScope | null | undefined) {
  if (scope === "local") return "Local";
  if (scope === "international") return "International";
  return "—";
}

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatNaira(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "—";
  return naira.format(amount);
}

export function formatSerial(serial: number | null | undefined) {
  if (serial === null || serial === undefined) return "—";
  return String(serial).padStart(4, "0");
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}
