"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Status = "loading" | "signed-out" | "not-admin" | "admin";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function apply(next: Session | null) {
      if (cancelled) return;
      setSession(next);
      if (!next) {
        setStatus("signed-out");
        return;
      }
      const { data, error } = await supabase.rpc("is_admin");
      if (cancelled) return;
      setStatus(!error && data === true ? "admin" : "not-admin");
    }

    supabase.auth.getSession().then(({ data }) => void apply(data.session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      // Token refreshes don't change who is signed in; skip re-checking admin status.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // Defer: Supabase warns against awaiting other client calls inside this callback.
        setTimeout(() => void apply(next), 0);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted">Loading…</div>;
  }

  if (status === "signed-out") return <LoginForm />;

  if (status === "not-admin") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center">
          <h1 className="text-lg font-semibold">Not authorized</h1>
          <p className="mt-2 text-sm text-muted">
            {session?.user.email} is not an admin account.
          </p>
          <button
            onClick={() => void signOut()}
            className="mt-5 w-full rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-background"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-border">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-end gap-3 px-6 py-2 text-sm text-muted">
          <span className="truncate">{session?.user.email}</span>
          <button
            onClick={() => void signOut()}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 transition-colors hover:bg-surface hover:text-foreground"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>
      {children}
    </>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message);
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-6"
      >
        <h1 className="text-xl font-bold tracking-tight">easyBITM Admin</h1>
        <p className="mt-1 text-sm text-muted">Sign in to manage content.</p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <label className="mt-5 block text-sm font-medium" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
