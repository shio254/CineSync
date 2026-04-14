const DEFAULT_SCORE = 3;

export type StampType =
  | "theater_worthy"
  | "laptop_movie"
  | "second_screen"
  | "guilty_pleasure"
  | "too_heavy";

export interface StampRecord {
  movieId: number;
  userId: string;
  stamp: StampType;
  score: number;
  createdAt: string;
  isFriend?: boolean;
}

interface SupabaseConfig {
  url: string;
  key: string;
}

const stampScore: Record<StampType, number> = {
  theater_worthy: 5,
  laptop_movie: 3,
  second_screen: 1,
  guilty_pleasure: 3,
  too_heavy: 2,
};

export function getStampScore(stamp: StampType): number {
  return stampScore[stamp] ?? DEFAULT_SCORE;
}

export function parseStampType(value: unknown): StampType | null {
  if (typeof value !== "string") {
    return null;
  }

  if (value in stampScore) {
    return value as StampType;
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseConfig());
}

export async function getNetworkScores(
  viewerId: string | undefined,
  movieIds: number[],
): Promise<Map<number, number>> {
  const config = getSupabaseConfig();
  if (!config || !viewerId || movieIds.length === 0) {
    return new Map();
  }

  try {
    const friendIds = await fetchFriendIds(config, viewerId);
    if (friendIds.length === 0) {
      return new Map();
    }

    const query = new URLSearchParams({
      select: "movie_id,score,user_id",
      movie_id: `in.(${movieIds.join(",")})`,
      user_id: `in.(${friendIds.join(",")})`,
      order: "created_at.desc",
      limit: "500",
    });

    const rows = await supabaseFetch<
      Array<{ movie_id: number; score: number | null; user_id: string }>
    >(config, `/rest/v1/movie_stamps?${query.toString()}`);

    const grouped = new Map<number, number[]>();
    for (const row of rows) {
      if (!grouped.has(row.movie_id)) {
        grouped.set(row.movie_id, []);
      }

      grouped
        .get(row.movie_id)
        ?.push(typeof row.score === "number" ? row.score : DEFAULT_SCORE);
    }

    const networkScores = new Map<number, number>();
    for (const [movieId, scores] of grouped.entries()) {
      const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      networkScores.set(movieId, clamp(avg / 5, 0, 1));
    }

    return networkScores;
  } catch {
    return new Map();
  }
}

export async function getMovieActivity(
  movieId: number,
  viewerId?: string,
): Promise<{
  records: StampRecord[];
  summary: { total: number; averageScore: number | null; friendCount: number };
}> {
  const config = getSupabaseConfig();
  if (!config) {
    return {
      records: [],
      summary: { total: 0, averageScore: null, friendCount: 0 },
    };
  }

  try {
    const query = new URLSearchParams({
      select: "movie_id,user_id,stamp,score,created_at",
      movie_id: `eq.${movieId}`,
      order: "created_at.desc",
      limit: "40",
    });

    const rows = await supabaseFetch<
      Array<{
        movie_id: number;
        user_id: string;
        stamp: StampType;
        score: number | null;
        created_at: string;
      }>
    >(config, `/rest/v1/movie_stamps?${query.toString()}`);

    let friendIds = new Set<string>();
    if (viewerId) {
      const ids = await fetchFriendIds(config, viewerId);
      friendIds = new Set(ids);
    }

    const records = rows.map((row) => ({
      movieId: row.movie_id,
      userId: row.user_id,
      stamp: row.stamp,
      score: row.score ?? getStampScore(row.stamp),
      createdAt: row.created_at,
      isFriend: friendIds.has(row.user_id),
    }));

    const scoreValues = records.map((record) => record.score);
    const averageScore =
      scoreValues.length > 0
        ? scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length
        : null;
    const friendCount = records.filter((record) => record.isFriend).length;

    return {
      records,
      summary: { total: records.length, averageScore, friendCount },
    };
  } catch {
    return {
      records: [],
      summary: { total: 0, averageScore: null, friendCount: 0 },
    };
  }
}

export async function createStamp(input: {
  movieId: number;
  viewerId: string;
  stamp: StampType;
}): Promise<StampRecord | null> {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  try {
    const inserted = await supabaseFetch<
      Array<{
        movie_id: number;
        user_id: string;
        stamp: StampType;
        score: number | null;
        created_at: string;
      }>
    >(config, "/rest/v1/movie_stamps", {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        movie_id: input.movieId,
        user_id: input.viewerId,
        stamp: input.stamp,
        score: getStampScore(input.stamp),
      }),
    });

    const row = inserted[0];
    if (!row) {
      return null;
    }

    return {
      movieId: row.movie_id,
      userId: row.user_id,
      stamp: row.stamp,
      score: row.score ?? getStampScore(row.stamp),
      createdAt: row.created_at,
    };
  } catch {
    return null;
  }
}

async function fetchFriendIds(config: SupabaseConfig, viewerId: string): Promise<string[]> {
  const query = new URLSearchParams({
    select: "followed_id",
    follower_id: `eq.${viewerId}`,
    limit: "200",
  });

  const rows = await supabaseFetch<Array<{ followed_id: string }>>(
    config,
    `/rest/v1/friend_edges?${query.toString()}`,
  );

  return rows
    .map((row) => row.followed_id)
    .filter((value) => typeof value === "string" && value.length > 0);
}

async function supabaseFetch<T>(
  config: SupabaseConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${config.url}${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status})`);
  }

  if (response.status === 204) {
    return [] as T;
  }

  return (await response.json()) as T;
}

function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }

  return { url, key };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
