import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true);
      } else {
        const timer = setTimeout(() => {
          supabase.auth.getSession().then(({ data: d2 }) => {
            setSessionReady(!!d2.session);
          });
        }, 1500);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to update password");
    } finally {
      setBusy(false);
    }
  }

  if (!sessionReady) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Verifying your recovery link...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto flex max-w-md flex-col px-4 py-10">
        <h1 className="font-display text-2xl font-black">Password updated</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your password has been reset successfully.
        </p>
        <Link
          to="/auth"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-neon px-4 py-3 font-bold text-neon-foreground shadow-neon"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10">
      <Link to="/auth" className="text-xs text-muted-foreground hover:text-foreground">
        ← Back
      </Link>
      <h1 className="mt-2 font-display text-3xl font-black">Reset password</h1>
      <p className="text-sm text-muted-foreground">Enter your new password below.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="password"
          required
          minLength={6}
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-input bg-input px-3 py-2.5 text-sm"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-md border border-input bg-input px-3 py-2.5 text-sm"
        />
        {error && <div className="text-sm text-destructive">{error}</div>}
        <button
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-neon px-4 py-3 font-bold text-neon-foreground shadow-neon disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </button>
      </form>
    </div>
  );
}
