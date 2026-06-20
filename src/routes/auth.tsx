import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — TrendRush NG" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [forgotSent, setForgotSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: (redirect as any) || "/", replace: true });
  }, [user, navigate, redirect]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setForgotSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      setError(e?.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(String((result.error as any).message ?? result.error));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
        ← Back
      </Link>
      <h1 className="mt-2 font-display text-3xl font-black">
        {mode === "signup" ? "Create account" : mode === "forgot" ? "Reset password" : "Welcome back"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {mode === "forgot"
          ? "Enter your email and we'll send you a link to reset your password."
          : "Sign in to track your orders. Or skip — you can checkout as a guest."}
      </p>

      {mode !== "forgot" && (
        <>
          <button
            onClick={handleGoogle}
            disabled={busy}
            className="mt-6 flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-3 font-semibold disabled:opacity-50"
          >
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      {forgotSent ? (
        <div className="mt-6 rounded-md border border-neon/30 bg-neon/10 p-4 text-sm text-neon">
          Check your inbox for a password-reset link.
        </div>
      ) : (
        <form onSubmit={handleEmail} className="space-y-3">
          {mode === "signup" && (
            <input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-input bg-input px-3 py-2.5 text-sm"
            />
          )}
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-input px-3 py-2.5 text-sm"
          />
          {mode !== "forgot" && (
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-input px-3 py-2.5 text-sm"
            />
          )}
          {mode === "signin" && (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
              }}
              className="text-right text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </button>
          )}
          {error && <div className="text-sm text-destructive">{error}</div>}
          <button
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-neon px-4 py-3 font-bold text-neon-foreground shadow-neon disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
          </button>
        </form>
      )}

      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setForgotSent(false);
        }}
        className="mt-4 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === "signin"
          ? "New here? Create an account"
          : mode === "forgot"
            ? "Remember your password? Sign in"
            : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
