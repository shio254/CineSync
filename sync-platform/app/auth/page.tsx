import AuthForm from "@/app/auth/auth-form";
import { getAuthenticatedViewer } from "@/lib/supabase/server";

export default async function AuthPage() {
  const viewer = await getAuthenticatedViewer();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_12%,rgba(247,191,98,0.18),transparent_38%),radial-gradient(circle_at_88%_0%,rgba(112,191,255,0.18),transparent_42%),linear-gradient(155deg,#07090f,#121826_65%)] px-4 py-10 text-stone-100 sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="rounded-3xl border border-white/10 bg-black/30 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-200/75">
            Sync Auth
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Account Access</h1>
          <p className="mt-2 text-sm text-stone-300">
            Sign in to enable personalized trust-graph scoring and save your movie stamps.
          </p>
        </header>

        <div className="mt-6">
          <AuthForm
            initialEmail={viewer?.email ?? ""}
            isAuthenticated={Boolean(viewer?.id)}
          />
        </div>
      </div>
    </main>
  );
}
