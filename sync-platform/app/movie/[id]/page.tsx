import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CandidateMovie } from "@/lib/algorithm";
import { getMovieWithContext } from "@/lib/tmdb";
import { getMovieActivity } from "@/lib/trust-graph";
import { getBestAvailableVibes, queueVibeEnrichment } from "@/lib/vibes";
import { getAuthenticatedViewer } from "@/lib/supabase/server";
import StampPanel from "./stamp-panel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MoviePage({ params }: PageProps) {
  const { id } = await params;
  const movieId = Number.parseInt(id, 10);

  if (!Number.isInteger(movieId) || movieId <= 0) {
    notFound();
  }

  let movie;
  try {
    movie = await getMovieWithContext(movieId);
  } catch {
    notFound();
  }

  const candidateForVibes: CandidateMovie = {
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    posterPath: movie.poster_path,
    releaseDate: movie.release_date,
    voteAverage: movie.vote_average,
    voteCount: movie.vote_count,
    popularity: movie.popularity,
    genreIds: movie.genres.map((genre) => genre.id),
    runtime: movie.runtime,
  };

  const vibeMap = await getBestAvailableVibes([candidateForVibes]);
  const vibe = vibeMap.get(movie.id);
  queueVibeEnrichment([candidateForVibes]);
  const viewer = await getAuthenticatedViewer();
  const activity = await getMovieActivity(movie.id, viewer?.id);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(247,191,98,0.2),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(80,184,255,0.2),transparent_40%),linear-gradient(165deg,#07090f,#101725_68%)] text-stone-100">
      <section className="relative h-[68vh] min-h-[420px] w-full overflow-hidden">
        {movie.backdrop_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
            alt={`${movie.title} backdrop`}
            fill
            priority
            className="object-cover opacity-45"
          />
        ) : (
          <div className="h-full w-full bg-[#151922]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090f] via-[#07090f]/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-10 sm:px-8">
          <Link
            href="/doctor"
            className="inline-flex w-fit rounded-full border border-white/30 bg-black/25 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/90 transition hover:border-white/55"
          >
            Back to Doctor
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {(vibe?.tags ?? []).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-amber-200/35 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-100"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
            {movie.title}
          </h1>
          <p className="text-sm text-stone-200">
            {movie.release_date ? movie.release_date.slice(0, 4) : "Unknown year"} |{" "}
            {movie.runtime ? `${movie.runtime} min` : "Runtime unknown"} |{" "}
            {movie.vote_average.toFixed(1)} global
          </p>
          {vibe?.summary && (
            <p className="max-w-3xl text-sm text-stone-200/90">{vibe.summary}</p>
          )}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[2fr,1fr]">
        <article className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-amber-100">Overview</h2>
            <p className="mt-3 text-base leading-relaxed text-stone-200">{movie.overview}</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-amber-100">Top Cast</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {movie.credits.cast.slice(0, 8).map((actor) => (
                <article
                  key={actor.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  {actor.profile_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                      alt={actor.name}
                      width={185}
                      height={278}
                      className="h-40 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="h-40 w-full rounded-xl bg-white/10" />
                  )}
                  <p className="mt-3 text-sm font-semibold text-white">{actor.name}</p>
                  <p className="mt-1 text-xs text-stone-300">{actor.character}</p>
                </article>
              ))}
            </div>
          </div>
        </article>

        <aside className="space-y-5 rounded-3xl border border-white/10 bg-[#111724]/80 p-5">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-100">
              Metadata
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {movie.genres.map((genre) => (
                <span
                  key={genre.id}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs text-stone-200"
                >
                  {genre.name}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs text-stone-400">
              Vibe source: {vibe?.source === "openai" ? "OpenAI cache" : "Fallback"}
            </p>
          </div>

          <div className="border-t border-white/10 pt-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-100">
              Similar Picks
            </h3>
            <div className="mt-3 space-y-3">
              {movie.similar.results.slice(0, 6).map((similarMovie) => (
                <Link
                  key={similarMovie.id}
                  href={`/movie/${similarMovie.id}`}
                  className="flex items-start justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:border-white/35"
                >
                  <span className="pr-2 text-stone-100">{similarMovie.title}</span>
                  <span className="text-xs text-stone-400">
                    {similarMovie.release_date
                      ? similarMovie.release_date.slice(0, 4)
                      : "----"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-8">
        <StampPanel
          movieId={movie.id}
          isAuthenticated={Boolean(viewer?.id)}
          initialRecords={activity.records}
          initialSummary={activity.summary}
        />
      </section>
    </main>
  );
}
