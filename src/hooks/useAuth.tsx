import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "staff";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function useCurrentAccount() {
  const { user, loading } = useSession();

  const query = useQuery({
    queryKey: ["current-account", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);

      const roleList = (roles ?? []).map((r) => r.role as AppRole);
      return {
        profile,
        roles: roleList,
        isAdmin: roleList.includes("admin"),
      };
    },
  });

  return {
    user,
    loading: loading || query.isLoading,
    profile: query.data?.profile ?? null,
    roles: query.data?.roles ?? [],
    isAdmin: query.data?.isAdmin ?? false,
  };
}
