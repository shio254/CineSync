"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface AuthFormProps {
  initialEmail: string;
  isAuthenticated: boolean;
}

export default function AuthForm({
  initialEmail,
  isAuthenticated,
}: AuthFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setStatus("Supabase env is not configured yet.");
      return;
    }

    setLoading(true);
    setStatus(null);

    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/doctor`,
      },
    });

    setLoading(false);
    setStatus(
      error
        ? error.message
        : "Magic link sent. Open your email and continue from the link.",
    );
  }

  async function handleSignOut() {
    if (!supabase) {
      setStatus("Supabase env is not configured yet.");
      return;
    }

    setLoading(true);
    setStatus(null);
    const { error } = await supabase.auth.signOut();
    setLoading(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    window.location.href = "/doctor";
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white">
        {isAuthenticated ? "You are signed in" : "Sign in with magic link"}
      </h2>
      {isAuthenticated ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-stone-200">
            Authenticated as <span className="font-semibold">{initialEmail}</span>.
          </p>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={loading}
            className="rounded-full border border-white/30 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-white/60 disabled:opacity-60"
          >
            {loading ? "Signing out..." : "Sign out"}
          </button>
        </div>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={(event) => void handleMagicLink(event)}>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-stone-300">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/20 bg-[#0d1118] px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-amber-300"
              placeholder="you@example.com"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-amber-300 px-6 py-3 text-xs font-bold uppercase tracking-widest text-zinc-900 transition hover:bg-amber-200 disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>
      )}

      {status && (
        <p className="mt-4 rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-stone-100">
          {status}
        </p>
      )}

      <Link
        href="/doctor"
        className="mt-5 inline-flex text-xs uppercase tracking-wider text-stone-300 underline underline-offset-4"
      >
        Back to Doctor
      </Link>
    </section>
  );
}
