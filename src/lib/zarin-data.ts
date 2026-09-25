import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";

export type Airline = Tables<"airlines">;
export type Client = Tables<"clients">;
export type PaymentStatus = "pending" | "partially_paid" | "paid";
export type Financials = {
  amount_paid: number;
  outstanding: number;
  potential_commission: number;
  recognized_commission: number;
  pending_commission: number;
  payment_status: PaymentStatus;
};
export type TransactionRow = Tables<"transactions"> & {
  clients: Pick<Client, "id" | "full_name" | "phone"> | null;
  airlines: Pick<Airline, "id" | "name" | "scope"> | null;
  financials: Financials | null;
};
export type Payment = Tables<"payments">;

/** Financial figures come from the database view, where the recognition rule is enforced. */
async function attachFinancials(rows: TransactionRow[]) {
  if (rows.length === 0) return rows;
  const { data, error } = await supabase
    .from("transaction_financials")
    .select(
      "transaction_id, amount_paid, outstanding, potential_commission, recognized_commission, pending_commission, payment_status",
    )
    .in(
      "transaction_id",
      rows.map((r) => r.id),
    );
  if (error) throw error;
  const map = new Map<string, Financials>();
  for (const f of data ?? []) {
    if (f.transaction_id) map.set(f.transaction_id, f as unknown as Financials);
  }
  return rows.map((r) => ({ ...r, financials: map.get(r.id) ?? null }));
}

export type RegisterFilters = {
  search?: string | undefined;
  airlineId?: string | undefined;
  clientId?: string | undefined;
  status?: Enums<"transaction_status"> | "all" | undefined;
  from?: string | undefined;
  to?: string | undefined;
};

const TRANSACTION_SELECT =
  "*, clients ( id, full_name, phone ), airlines ( id, name, scope )" as const;

export function potentialCommission(clientFare: number, payable: number) {
  return clientFare - payable;
}

/* ------------------------------- airlines -------------------------------- */

export function useAirlines() {
  return useQuery({
    queryKey: ["airlines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("airlines")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Airline[];
    },
  });
}

/* -------------------------------- clients -------------------------------- */

export function useClients(search?: string) {
  const term = search?.trim() ?? "";
  return useQuery({
    queryKey: ["clients", term],
    queryFn: async () => {
      let query = supabase.from("clients").select("*").order("full_name", { ascending: true });
      if (term) {
        const safe = term.replace(/[%,()]/g, " ");
        query = query.or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as Client | null;
    },
  });
}

export type ClientInput = {
  full_name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
};

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClientInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...input, created_by: auth.user?.id ?? null })
        .select("*")
        .single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ClientInput & { id: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(input)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: (client) => {
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
      void queryClient.invalidateQueries({ queryKey: ["client", client.id] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

/* ------------------------------ transactions ------------------------------ */

export function useTransactions(filters: RegisterFilters = {}) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select(TRANSACTION_SELECT)
        .order("register_date", { ascending: false })
        .order("serial_number", { ascending: false });

      if (filters.airlineId) query = query.eq("airline_id", filters.airlineId);
      if (filters.clientId) query = query.eq("client_id", filters.clientId);
      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.from) query = query.gte("register_date", filters.from);
      if (filters.to) query = query.lte("register_date", filters.to);

      const { data, error } = await query;
      if (error) throw error;

      const rows = await attachFinancials((data ?? []) as unknown as TransactionRow[]);
      const term = filters.search?.trim().toLowerCase();
      if (!term) return rows;

      return rows.filter((row) =>
        [
          row.clients?.full_name,
          row.clients?.phone,
          row.airlines?.name,
          row.pnr,
          row.pickup_dropoff,
          row.remark,
          String(row.serial_number).padStart(4, "0"),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term)),
      );
    },
  });
}

export function useTransaction(transactionId: string) {
  return useQuery({
    queryKey: ["transaction", transactionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(TRANSACTION_SELECT)
        .eq("id", transactionId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [row] = await attachFinancials([data as unknown as TransactionRow]);
      return row ?? null;
    },
  });
}

export function useProfileNames(ids: (string | null | undefined)[]) {
  const unique = Array.from(new Set(ids.filter(Boolean) as string[])).sort();
  return useQuery({
    queryKey: ["profile-names", unique],
    enabled: unique.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", unique);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.id] = row.full_name;
      return map;
    },
  });
}

export type TransactionInput = {
  client_id: string;
  airline_id: string;
  travel_class: Enums<"travel_class">;
  register_date: string;
  departure_date: string;
  return_date: string | null;
  client_fare: number;
  payable: number;
  pnr: string | null;
  pickup_dropoff: string | null;
  remark: string | null;
};

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("transactions")
        .insert({ ...input, created_by: auth.user?.id ?? null })
        .select("id, serial_number")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: TransactionInput & { id: string }) => {
      const { data, error } = await supabase
        .from("transactions")
        .update(input)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["transaction", row.id] });
    },
  });
}

export function useVoidTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("transactions")
        .update({
          status: "cancelled",
          cancel_reason: reason,
          cancelled_by: auth.user?.id ?? null,
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["transaction", id] });
    },
  });
}

/* -------------------------------- payments -------------------------------- */

export function usePayments(transactionId: string) {
  return useQuery({
    queryKey: ["payments", transactionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("transaction_id", transactionId)
        .order("paid_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
  });
}

export type PaymentInput = {
  transaction_id: string;
  amount: number;
  paid_on: string;
  method: Enums<"payment_method">;
  reference: string | null;
  note: string | null;
};

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PaymentInput) => {
      const { data: auth } = await supabase.auth.getUser();
      // recorded_by is also forced to the signed-in user by the database.
      const { error } = await supabase
        .from("payments")
        .insert({ ...input, recorded_by: auth.user?.id ?? null });
      if (error) throw error;
      return input.transaction_id;
    },
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: ["payments", id] });
      void queryClient.invalidateQueries({ queryKey: ["transaction", id] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
