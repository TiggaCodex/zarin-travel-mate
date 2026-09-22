import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  NotebookTabs,
  BellRing,
  BarChart3,
  Plane,
  UserCog,
  Menu,
  LogOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentAccount } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Register", icon: NotebookTabs },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/reminders", label: "Reminders", icon: BellRing },
  { to: "/reports", label: "Reports", icon: BarChart3, adminOnly: true },
  { to: "/settings/airlines", label: "Airlines", icon: Plane, adminOnly: true },
  { to: "/settings/users", label: "Staff", icon: UserCog, adminOnly: true },
];

function NavList({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-primary data-[status=active]:text-sidebar-primary-foreground"
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Plane className="size-5" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-sm font-semibold tracking-wide">
          ZARIN TRAVELS
        </span>
        <span className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          &amp; Tours
        </span>
      </span>
    </div>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { isAdmin, profile, user } = useCurrentAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="flex flex-col gap-6">
          <Brand />
          <NavList isAdmin={isAdmin} />
        </div>
        <div className="space-y-3 border-t border-sidebar-border pt-4">
          <div className="px-1 text-xs">
            <p className="truncate font-medium text-sidebar-foreground">
              {profile?.full_name || user?.email}
            </p>
            <p className="text-muted-foreground">{isAdmin ? "Administrator" : "Staff"}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-4">
              <div className="flex h-full flex-col justify-between">
                <div className="flex flex-col gap-6 pt-6">
                  <Brand />
                  <NavList isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
                </div>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="size-4" /> Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Brand />
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                  {title}
                </h1>
                {description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                ) : null}
              </div>
              {actions}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
