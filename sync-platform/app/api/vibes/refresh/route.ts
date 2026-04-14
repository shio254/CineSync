import { NextResponse } from "next/server";
import type { CandidateMovie } from "@/lib/algorithm";
import { getMovieWithContext } from "@/lib/tmdb";
import { refreshVibesForMovies } from "@/lib/vibes";

interface RefreshPayload {
  movieIds?: unknown;
}

export async function POST(request: Request) {
  let payload: RefreshPayload;
  try {
    payload = (await request.json()) as RefreshPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!Array.isArray(payload.movieIds) || payload.movieIds.length === 0) {
    return NextResponse.json(
      { error: "movieIds must be a non-empty numeric array." },
      { status: 400 },
    );
  }

  const movieIds = [...new Set(payload.movieIds)]
    .filter((id) => typeof id === "number" && Number.isInteger(id) && id > 0)
    .slice(0, 12) as number[];

  if (movieIds.length === 0) {
    return NextResponse.json(
      { error: "movieIds did not include valid IDs." },
      { status: 400 },
    );
  }

  try {
    const movies = await Promise.all(
      movieIds.map(async (id) => {
        const detail = await getMovieWithContext(id);
        const candidate: CandidateMovie = {
          id: detail.id,
          title: detail.title,
          overview: detail.overview,
          posterPath: detail.poster_path,
          releaseDate: detail.release_date,
          voteAverage: detail.vote_average,
          voteCount: detail.vote_count,
          popularity: detail.popularity,
          genreIds: detail.genres.map((genre) => genre.id),
          runtime: detail.runtime,
        };

        return candidate;
      }),
    );

    const refreshed = await refreshVibesForMovies(movies);

    return NextResponse.json({
      vibes: movieIds.map((movieId) => {
        const vibe = refreshed.get(movieId);
        return {
          movieId,
          tags: vibe?.tags ?? [],
          summary: vibe?.summary ?? null,
          source: vibe?.source ?? "fallback",
        };
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to refresh vibes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
