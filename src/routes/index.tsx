import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, Plane } from "lucide-react";

import { useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zarin Travels & Tours — Client & Flight Register" },
      {
        name: "description",
        content:
          "Secure management system for Zarin Travels & Tours: client bookings, fares, payments, commission and travel reminders.",
      },
      { property: "og:title", content: "Zarin Travels & Tours — Client & Flight Register" },
      {
        property: "og:description",
        content:
          "Secure management system for client bookings, payments, commission and travel reminders.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { session, loading } = useSession();

  useEffect(() => {
    if (loading) return;
    navigate({ to: session ? "/dashboard" : "/auth", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-sidebar px-4 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Plane className="size-6" />
      </span>
      <div>
        <h1 className="font-display text-xl font-semibold tracking-wide text-foreground">
          ZARIN TRAVELS &amp; TOURS
        </h1>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Client &amp; Flight Register
        </p>
      </div>
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}
