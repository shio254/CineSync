const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export interface TmdbDiscoverMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
}

export interface TmdbDiscoverResponse {
  page: number;
  results: TmdbDiscoverMovie[];
  total_pages: number;
  total_results: number;
}

export interface TmdbMovieDetails {
  id: number;
  runtime: number | null;
}

export interface TmdbMovieGenre {
  id: number;
  name: string;
}

export interface TmdbMovieCast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface TmdbMovieWithContext extends TmdbMovieDetails {
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: TmdbMovieGenre[];
  credits: {
    cast: TmdbMovieCast[];
  };
  similar: {
    results: TmdbDiscoverMovie[];
  };
}

export async function discoverMovies(
  params: URLSearchParams,
  page: number,
): Promise<TmdbDiscoverResponse> {
  const requestParams = new URLSearchParams(params);
  requestParams.set("page", String(page));

  return tmdbFetch<TmdbDiscoverResponse>("/discover/movie", requestParams, 1800);
}

export async function getMovieDetails(id: number): Promise<TmdbMovieDetails> {
  return tmdbFetch<TmdbMovieDetails>(`/movie/${id}`, undefined, 86400);
}

export async function getMovieWithContext(
  id: number,
): Promise<TmdbMovieWithContext> {
  const params = new URLSearchParams({
    append_to_response: "credits,similar",
    language: "en-US",
  });

  return tmdbFetch<TmdbMovieWithContext>(`/movie/${id}`, params, 3600);
}

async function tmdbFetch<T>(
  path: string,
  params?: URLSearchParams,
  revalidateSeconds = 900,
): Promise<T> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is missing");
  }

  const requestUrl = new URL(`${TMDB_BASE_URL}${path}`);
  requestUrl.searchParams.set("api_key", apiKey);

  if (params) {
    for (const [key, value] of params.entries()) {
      requestUrl.searchParams.set(key, value);
    }
  }

  const response = await fetch(requestUrl, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: revalidateSeconds,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`TMDB request failed (${response.status}): ${body.slice(0, 200)}`);
  }

  return (await response.json()) as T;
}
