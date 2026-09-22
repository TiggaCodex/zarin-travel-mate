import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plane, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff Sign In | Zarin Travels & Tours" },
      {
        name: "description",
        content:
          "Secure sign in for Zarin Travels & Tours staff and administrators to manage the flight register.",
      },
      { property: "og:title", content: "Staff Sign In | Zarin Travels & Tours" },
      {
        property: "og:description",
        content: "Secure sign in for the Zarin Travels & Tours management system.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, session, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
      } else if (!data.session) {
        setNotice("Account created. Check your email and confirm it, then sign in.");
      }
    }

    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{mode === "signin" ? "Sign in" : "Create account"}</CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Use the email and password given to you by the administrator."
                : "Set up the first administrator account for this office."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === "signup" ? (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              {notice ? (
                <Alert>
                  <AlertDescription>{notice}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <button
              type="button"
              className="mt-4 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setNotice(null);
              }}
            >
              {mode === "signin"
                ? "First time setup? Create the administrator account"
                : "Back to sign in"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
