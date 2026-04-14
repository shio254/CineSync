import Link from "next/link";
import { getVibeDebugSnapshot } from "@/lib/vibes";

export const dynamic = "force-dynamic";

export default async function VibesAdminPage() {
  const snapshot = await getVibeDebugSnapshot();

  return (
    <main className="min-h-screen bg-[#080b10] px-4 py-8 text-stone-100 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70">
            Sync Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Vibe Engine Debug</h1>
          <p className="mt-2 text-sm text-stone-300">
            Runtime diagnostics for cache health, OpenAI generation, and failure trends.
          </p>
          <Link
            href="/doctor"
            className="mt-4 inline-flex rounded-full border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-100 transition hover:border-white/45"
          >
            Back to Doctor
          </Link>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Cache Entries" value={String(snapshot.cacheSize)} />
          <MetricCard label="OpenAI Entries" value={String(snapshot.openAiCacheSize)} />
          <MetricCard label="Fallback Entries" value={String(snapshot.fallbackCacheSize)} />
          <MetricCard label="In-Flight Jobs" value={String(snapshot.inFlightJobs)} />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Metrics</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Cache Hits" value={String(snapshot.metrics.cacheHits)} />
            <MetricCard label="Cache Misses" value={String(snapshot.metrics.cacheMisses)} />
            <MetricCard label="Refresh Calls" value={String(snapshot.metrics.refreshCalls)} />
            <MetricCard label="Queued Jobs" value={String(snapshot.metrics.queuedJobs)} />
            <MetricCard label="OpenAI Calls" value={String(snapshot.metrics.openAiCalls)} />
            <MetricCard
              label="OpenAI Success"
              value={String(snapshot.metrics.openAiSuccess)}
            />
          </div>
          <p className="mt-4 text-xs text-stone-400">
            Last updated: {snapshot.metrics.lastUpdatedAt}
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Recent Failures</h2>
          <div className="mt-3 space-y-2">
            {snapshot.metrics.recentFailures.length === 0 && (
              <p className="text-sm text-stone-300">No failures recorded.</p>
            )}
            {snapshot.metrics.recentFailures.map((failure) => (
              <article
                key={`${failure.movieId}-${failure.at}`}
                className="rounded-xl border border-red-300/25 bg-red-500/10 p-3 text-sm"
              >
                <p className="font-semibold text-red-100">
                  {failure.title} ({failure.movieId})
                </p>
                <p className="mt-1 text-red-100/80">{failure.reason}</p>
                <p className="mt-1 text-xs text-red-100/70">{failure.at}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Cache Samples</h2>
          <div className="mt-3 space-y-2">
            {snapshot.samples.length === 0 && (
              <p className="text-sm text-stone-300">No cached vibes yet.</p>
            )}
            {snapshot.samples.map((sample) => (
              <article
                key={sample.movieId}
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
              >
                <p className="font-semibold text-white">
                  Movie ID: {sample.movieId} ({sample.vibe.source})
                </p>
                <p className="mt-1 text-stone-300">{sample.vibe.tags.join(", ")}</p>
                <p className="mt-1 text-xs text-stone-400">{sample.vibe.updatedAt}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-wide text-stone-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </article>
  );
}
