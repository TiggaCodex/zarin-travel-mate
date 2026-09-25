import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { addDaysISO, formatLongDate, todayISO } from "@/lib/format";

export type ReminderKind = Enums<"reminder_kind">;
export type ReminderStatus = Enums<"reminder_status">;

export type ReminderRow = Tables<"reminders"> & {
  transactions: {
    id: string;
    serial_number: number;
    pnr: string | null;
    status: Enums<"transaction_status">;
    client_id: string;
    clients: { id: string; full_name: string; phone: string } | null;
    airlines: { name: string } | null;
  } | null;
};

// !inner + status filter = voided bookings never appear in active lists.
const SELECT =
  "*, transactions!inner ( id, serial_number, pnr, status, client_id, clients ( id, full_name, phone ), airlines ( name ) )";

export type ReminderBoard = {
  today: string;
  departuresToday: ReminderRow[];
  returnsToday: ReminderRow[];
  upcoming: ReminderRow[];
  overdue: ReminderRow[];
};

export function useReminderBoard(days = 7) {
  return useQuery({
    queryKey: ["reminders", "board", days],
    queryFn: async (): Promise<ReminderBoard> => {
      const today = todayISO();
      const end = addDaysISO(today, days);
      const [window, overdue] = await Promise.all([
        supabase
          .from("reminders")
          .select(SELECT)
          .eq("transactions.status", "active")
          .gte("due_date", today)
          .lte("due_date", end)
          .order("due_date", { ascending: true }),
        supabase
          .from("reminders")
          .select(SELECT)
          .eq("transactions.status", "active")
          .eq("status", "pending")
          .lt("due_date", today)
          .order("due_date", { ascending: true }),
      ]);
      if (window.error) throw window.error;
      if (overdue.error) throw overdue.error;
      const rows = (window.data ?? []) as unknown as ReminderRow[];
      return {
        today,
        departuresToday: rows.filter((r) => r.due_date === today && r.kind === "departure"),
        returnsToday: rows.filter((r) => r.due_date === today && r.kind === "return"),
        upcoming: rows.filter((r) => r.due_date > today),
        overdue: (overdue.data ?? []) as unknown as ReminderRow[],
      };
    },
  });
}

export function useTransactionReminders(transactionId: string) {
  return useQuery({
    queryKey: ["reminders", "transaction", transactionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminders")
        .select(SELECT)
        .eq("transaction_id", transactionId)
        .order("kind", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ReminderRow[];
    },
  });
}

export function useClientReminders(clientId: string) {
  return useQuery({
    queryKey: ["reminders", "client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminders")
        .select(SELECT)
        .eq("transactions.client_id", clientId)
        .eq("transactions.status", "active")
        .gte("due_date", todayISO())
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ReminderRow[];
    },
  });
}

export function useSetReminderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReminderStatus }) => {
      // sent_at / sent_by are set by the database from the signed-in user.
      const { error } = await supabase
        .from("reminders")
        .update({ status, channel: status === "sent" ? "manual" : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
  });
}

export function reminderMessage(r: ReminderRow) {
  const name = r.transactions?.clients?.full_name ?? "Customer";
  const airline = r.transactions?.airlines?.name ?? "your airline";
  const pnr = r.transactions?.pnr;
  const flight = r.kind === "return" ? "your return flight" : "your flight";
  return (
    `Dear ${name}, this is a reminder from Zarin Travels & Tours that ${flight} with ${airline} ` +
    `is scheduled for ${formatLongDate(r.due_date)}.` +
    (pnr ? ` Your PNR is ${pnr}.` : "") +
    " We wish you a safe journey."
  );
}
