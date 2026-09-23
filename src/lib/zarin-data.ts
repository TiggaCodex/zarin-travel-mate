import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";

export type Airline = Tables<"airlines">;
export type Client = Tables<"clients">;
export type TransactionRow = Tables<"transactions"> & {
  clients: Pick<Client, "id" | "full_name" | "phone"> | null;
  airlines: Pick<Airline, "id" | "name" | "scope"> | null;
};

export type RegisterFilters = {
  search?: string;
  airlineId?: string;
  clientId?: string;
  status?: Enums<"transaction_status"> | "all";
  from?: string;
  to?: string;
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

      const rows = (data ?? []) as unknown as TransactionRow[];
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
      return (data as unknown as TransactionRow) ?? null;
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
