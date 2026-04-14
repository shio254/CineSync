import { NextResponse } from "next/server";
import {
  type CandidateMovie,
  buildDiscoverParams,
  parseDiagnoseInput,
  rankMovies,
} from "@/lib/algorithm";
import { discoverMovies, getMovieDetails } from "@/lib/tmdb";
import { getNetworkScores, isSupabaseConfigured } from "@/lib/trust-graph";
import { getBestAvailableVibes, queueVibeEnrichment } from "@/lib/vibes";
import { getAuthenticatedViewer } from "@/lib/supabase/server";

const MAX_DISCOVER_CANDIDATES = 48;
const MAX_DETAIL_LOOKUPS = 24;
const DISCOVER_PAGE_WINDOW = 3;

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const input = parseDiagnoseInput(payload);
  if (!input) {
    return NextResponse.json(
      {
        error:
          "Body must include mentalLoad, socialContext and timeConstraint values.",
      },
      { status: 400 },
    );
  }

  try {
    const viewer = await getAuthenticatedViewer();
    const diagnosisInput = {
      ...input,
      viewerId: viewer?.id,
    };

    const discoverParams = buildDiscoverParams(diagnosisInput);
    const rerollCount = input.rerollCount ?? 0;
    const startPage = Math.min(1 + rerollCount * 2, 470);

    const discoverPages = await Promise.all(
      Array.from({ length: DISCOVER_PAGE_WINDOW }, (_, index) =>
        discoverMovies(discoverParams, startPage + index),
      ),
    );

    const rejectedSet = new Set(input.rejectedMovieIds ?? []);
    const combinedResults = discoverPages
      .flatMap((page) => page.results)
      .filter((movie) => !rejectedSet.has(movie.id))
      .slice(0, MAX_DISCOVER_CANDIDATES);

    const details = await Promise.all(
      combinedResults.slice(0, MAX_DETAIL_LOOKUPS).map(async (movie) => {
        try {
          const detail = await getMovieDetails(movie.id);
          return [movie.id, detail.runtime] as const;
        } catch {
          return [movie.id, null] as const;
        }
      }),
    );

    const runtimeByMovieId = new Map<number, number | null>(details);
    const networkScores = await getNetworkScores(
      viewer?.id,
      combinedResults.map((movie) => movie.id),
    );

    const candidates: CandidateMovie[] = combinedResults.map((movie) => ({
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      posterPath: movie.poster_path,
      releaseDate: movie.release_date,
      voteAverage: movie.vote_average,
      voteCount: movie.vote_count,
      popularity: movie.popularity,
      genreIds: movie.genre_ids,
      runtime: runtimeByMovieId.get(movie.id) ?? null,
      networkScore: networkScores.get(movie.id) ?? null,
    }));

    const recommendations = rankMovies(diagnosisInput, candidates).slice(0, 3);

    if (recommendations.length === 0) {
      return NextResponse.json(
        { error: "No recommendations found for this diagnosis." },
        { status: 404 },
      );
    }

    const vibeByMovieId = await getBestAvailableVibes(recommendations);
    queueVibeEnrichment(recommendations);

    return NextResponse.json({
      diagnosis: input,
      viewerId: viewer?.id ?? null,
      viewerAuthenticated: Boolean(viewer?.id),
      trustGraphEnabled: isSupabaseConfigured(),
      recommendations: recommendations.map((movie) => ({
        ...movie,
        id: movie.id,
        title: movie.title,
        overview: movie.overview,
        posterPath: movie.posterPath,
        releaseDate: movie.releaseDate,
        voteAverage: movie.voteAverage,
        runtime: movie.runtime,
        networkScore: movie.networkScore ?? null,
        matchScore: movie.matchScore,
        vibeTags: vibeByMovieId.get(movie.id)?.tags ?? movie.vibeTags,
        vibeSource: vibeByMovieId.get(movie.id)?.source ?? "fallback",
        vibeSummary: vibeByMovieId.get(movie.id)?.summary ?? null,
        reasons: movie.reasons,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown diagnosis failure.";
    return NextResponse.json(
      { error: `Diagnosis request failed: ${message}` },
      { status: 500 },
    );
  }
}
