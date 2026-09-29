import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { addDaysISO, todayISO } from "@/lib/format";
import {
  createStaff,
  getStaffMember,
  listStaff,
  resendInvite,
  setStaffActive,
  setStaffRole,
} from "@/lib/staff.functions";

export function useStaffList(enabled: boolean) {
  const fn = useServerFn(listStaff);
  return useQuery({ queryKey: ["staff"], enabled, queryFn: () => fn() });
}

export function useStaffMember(id: string, enabled: boolean) {
  const fn = useServerFn(getStaffMember);
  return useQuery({ queryKey: ["staff", id], enabled, queryFn: () => fn({ data: { id } }) });
}

function useStaffMutation<T>(call: (v: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["staff"] });
      void qc.invalidateQueries({ queryKey: ["current-account"] });
    },
  });
}

const setPasswordUrl = () => `${window.location.origin}/set-password`;

export function useCreateStaff() {
  const fn = useServerFn(createStaff);
  return useStaffMutation(
    (v: { full_name: string; email: string; phone: string | null; role: "admin" | "staff"; is_active: boolean }) =>
      fn({ data: { ...v, redirect_to: setPasswordUrl() } }),
  );
}
export function useSetStaffActive() {
  const fn = useServerFn(setStaffActive);
  return useStaffMutation((v: { id: string; active: boolean }) => fn({ data: v }));
}
export function useSetStaffRole() {
  const fn = useServerFn(setStaffRole);
  return useStaffMutation((v: { id: string; role: "admin" | "staff" }) => fn({ data: v }));
}
export function useResendInvite() {
  const fn = useServerFn(resendInvite);
  return useMutation({ mutationFn: (email: string) => fn({ data: { email, redirect_to: setPasswordUrl() } }) });
}

/* ------------------------------ staff dashboard ----------------------------- */

/** Lagos (UTC+1, no DST) day boundaries as timestamps, for created_at / sent_at filters. */
function lagosDayBounds(day: string) {
  return { from: `${day}T00:00:00+01:00`, to: `${addDaysISO(day, 1)}T00:00:00+01:00` };
}

export type ActivityItem = {
  key: string;
  kind: "booking" | "payment" | "reminder";
  label: string;
  detail: string;
  at: string;
  transactionId: string | null;
  amount?: number;
};

export function useMyToday(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-today", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const today = todayISO();
      const { from, to } = lagosDayBounds(today);
      const [bookings, payments] = await Promise.all([
        supabase
          .from("transactions")
          .select("id, client_id")
          .eq("created_by", userId!)
          .eq("status", "active")
          .eq("register_date", today),
        supabase
          .from("payments")
          .select("id, amount, transactions ( client_id )")
          .eq("recorded_by", userId!)
          .gte("created_at", from)
          .lt("created_at", to),
      ]);
      if (bookings.error) throw bookings.error;
      if (payments.error) throw payments.error;
      const clients = new Set<string>();
      for (const b of bookings.data ?? []) clients.add(b.client_id);
      for (const p of (payments.data ?? []) as any[]) if (p.transactions?.client_id) clients.add(p.transactions.client_id);
      return {
        clientsAttended: clients.size,
        bookings: bookings.data?.length ?? 0,
        paymentsRecorded: payments.data?.length ?? 0,
        amountCollected: (payments.data ?? []).reduce((s, p: any) => s + (p.amount ?? 0), 0),
      };
    },
  });
}

export function useMyActivity(userId: string | undefined, limit = 12) {
  return useQuery({
    queryKey: ["my-activity", userId, limit],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ActivityItem[]> => {
      const [b, p, r] = await Promise.all([
        supabase
          .from("transactions")
          .select("id, serial_number, created_at, clients ( full_name )")
          .eq("created_by", userId!)
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("payments")
          .select("id, amount, created_at, transaction_id, transactions ( serial_number, clients ( full_name ) )")
          .eq("recorded_by", userId!)
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("reminders")
          .select("id, kind, sent_at, transaction_id, transactions ( serial_number, clients ( full_name ) )")
          .eq("sent_by", userId!)
          .eq("status", "sent")
          .order("sent_at", { ascending: false })
          .limit(limit),
      ]);
      if (b.error) throw b.error;
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      const serial = (n: number | undefined) => (n ? `#${String(n).padStart(4, "0")}` : "");
      const items: ActivityItem[] = [
        ...(b.data ?? []).map((x: any) => ({
          key: `b-${x.id}`,
          kind: "booking" as const,
          label: "Booking created",
          detail: `${x.clients?.full_name ?? "—"} · ${serial(x.serial_number)}`,
          at: x.created_at,
          transactionId: x.id,
        })),
        ...(p.data ?? []).map((x: any) => ({
          key: `p-${x.id}`,
          kind: "payment" as const,
          label: "Payment recorded",
          detail: `${x.transactions?.clients?.full_name ?? "—"} · ${serial(x.transactions?.serial_number)}`,
          at: x.created_at,
          transactionId: x.transaction_id,
          amount: x.amount,
        })),
        ...(r.data ?? []).map((x: any) => ({
          key: `r-${x.id}`,
          kind: "reminder" as const,
          label: `${x.kind === "return" ? "Return" : "Departure"} reminder marked as sent`,
          detail: `${x.transactions?.clients?.full_name ?? "—"} · ${serial(x.transactions?.serial_number)}`,
          at: x.sent_at,
          transactionId: x.transaction_id,
        })),
      ];
      return items.filter((i) => i.at).sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
    },
  });
}
