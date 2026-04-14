export type MentalLoad = "vegetable" | "casual" | "sherlock";
export type SocialContext = "solo" | "date" | "group";
export type TimeConstraint = "quick" | "standard" | "epic";
export type RerollPreference = "lighter" | "darker" | "newer" | "classics";

export interface DiagnoseInput {
  mentalLoad: MentalLoad;
  socialContext: SocialContext;
  timeConstraint: TimeConstraint;
  rerollPreference?: RerollPreference;
  rejectedMovieIds?: number[];
  rerollCount?: number;
}

export interface CandidateMovie {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  genreIds: number[];
  runtime: number | null;
  networkScore?: number | null;
}

export interface RankedMovie extends CandidateMovie {
  matchScore: number;
  vibeTags: string[];
  reasons: string[];
}

const MENTAL_LOAD_VALUES: MentalLoad[] = ["vegetable", "casual", "sherlock"];
const SOCIAL_CONTEXT_VALUES: SocialContext[] = ["solo", "date", "group"];
const TIME_CONSTRAINT_VALUES: TimeConstraint[] = ["quick", "standard", "epic"];
const REROLL_PREFERENCE_VALUES: RerollPreference[] = [
  "lighter",
  "darker",
  "newer",
  "classics",
];

const GENRE_NAMES: Record<number, string> = {
  12: "Adventure",
  14: "Fantasy",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  53: "Thriller",
  878: "Sci-Fi",
  9648: "Mystery",
  10749: "Romance",
};

const VIBE_TAGS_BY_GENRE: Record<number, string> = {
  12: "Quest Energy",
  14: "Mythic Ride",
  18: "Emotional Weight",
  27: "True Dread",
  28: "Adrenaline Rush",
  35: "Popcorn Fun",
  53: "Edge of Seat",
  878: "Mind Bender",
  9648: "Puzzle Box",
  10749: "Date Night",
};

export function parseDiagnoseInput(value: unknown): DiagnoseInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const {
    mentalLoad,
    socialContext,
    timeConstraint,
    rerollPreference,
    rejectedMovieIds,
    rerollCount,
  } = candidate;

  if (
    typeof mentalLoad !== "string" ||
    typeof socialContext !== "string" ||
    typeof timeConstraint !== "string"
  ) {
    return null;
  }

  if (
    !MENTAL_LOAD_VALUES.includes(mentalLoad as MentalLoad) ||
    !SOCIAL_CONTEXT_VALUES.includes(socialContext as SocialContext) ||
    !TIME_CONSTRAINT_VALUES.includes(timeConstraint as TimeConstraint)
  ) {
    return null;
  }

  if (
    rerollPreference !== undefined &&
    (typeof rerollPreference !== "string" ||
      !REROLL_PREFERENCE_VALUES.includes(rerollPreference as RerollPreference))
  ) {
    return null;
  }

  if (
    rerollCount !== undefined &&
    (typeof rerollCount !== "number" ||
      !Number.isInteger(rerollCount) ||
      rerollCount < 0 ||
      rerollCount > 20)
  ) {
    return null;
  }

  let normalizedRejectedMovieIds: number[] | undefined;
  if (rejectedMovieIds !== undefined) {
    if (!Array.isArray(rejectedMovieIds)) {
      return null;
    }

    const parsedIds = rejectedMovieIds
      .filter((id) => typeof id === "number" && Number.isInteger(id) && id > 0)
      .map((id) => id as number);

    if (parsedIds.length !== rejectedMovieIds.length) {
      return null;
    }

    normalizedRejectedMovieIds = [...new Set(parsedIds)].slice(0, 200);
  }

  return {
    mentalLoad: mentalLoad as MentalLoad,
    socialContext: socialContext as SocialContext,
    timeConstraint: timeConstraint as TimeConstraint,
    rerollPreference:
      rerollPreference === undefined
        ? undefined
        : (rerollPreference as RerollPreference),
    rejectedMovieIds: normalizedRejectedMovieIds,
    rerollCount: rerollCount as number | undefined,
  };
}

export function buildDiscoverParams(input: DiagnoseInput): URLSearchParams {
  const params = new URLSearchParams({
    include_adult: "false",
    include_video: "false",
    language: "en-US",
    sort_by: "popularity.desc",
    "vote_count.gte": "250",
  });

  const genres = new Set<number>();
  const excludedGenres = new Set<number>();

  if (input.mentalLoad === "vegetable") {
    [28, 35, 12].forEach((genre) => genres.add(genre));
    [18, 99].forEach((genre) => excludedGenres.add(genre));
  }

  if (input.mentalLoad === "casual") {
    [12, 35, 14].forEach((genre) => genres.add(genre));
  }

  if (input.mentalLoad === "sherlock") {
    [53, 9648, 878, 18].forEach((genre) => genres.add(genre));
    params.set("vote_average.gte", "6.8");
  }

  if (input.socialContext === "date") {
    [10749, 35, 53].forEach((genre) => genres.add(genre));
  }

  if (input.socialContext === "group") {
    [28, 12, 35].forEach((genre) => genres.add(genre));
    params.set("sort_by", "vote_count.desc");
  }

  if (input.timeConstraint === "quick") {
    params.set("with_runtime.lte", "105");
  }

  if (input.timeConstraint === "standard") {
    params.set("with_runtime.gte", "95");
    params.set("with_runtime.lte", "140");
  }

  if (input.timeConstraint === "epic") {
    params.set("with_runtime.gte", "140");
  }

  if (input.rerollPreference === "lighter") {
    [35, 12].forEach((genre) => genres.add(genre));
    [27].forEach((genre) => excludedGenres.add(genre));
  }

  if (input.rerollPreference === "darker") {
    [53, 9648, 27].forEach((genre) => genres.add(genre));
  }

  if (input.rerollPreference === "newer") {
    const now = new Date();
    const fromDate = `${now.getFullYear() - 3}-01-01`;
    params.set("primary_release_date.gte", fromDate);
    params.set("sort_by", "primary_release_date.desc");
  }

  if (input.rerollPreference === "classics") {
    const now = new Date();
    const toDate = `${now.getFullYear() - 12}-12-31`;
    params.set("primary_release_date.lte", toDate);
    params.set("sort_by", "vote_count.desc");
  }

  if (genres.size > 0) {
    params.set("with_genres", [...genres].join("|"));
  }

  if (excludedGenres.size > 0) {
    params.set("without_genres", [...excludedGenres].join(","));
  }

  return params;
}

export function rankMovies(
  input: DiagnoseInput,
  movies: CandidateMovie[],
): RankedMovie[] {
  const rejectedSet = new Set(input.rejectedMovieIds ?? []);

  const scored = movies.map((movie) => {
    const voteScore = normalize(movie.voteAverage, 4, 8.8) * 35;
    const popularityScore = normalizeLog(movie.popularity, 10, 300) * 18;
    const voteCountScore = normalizeLog(movie.voteCount, 200, 12000) * 12;
    const recencyScore = releaseRecencyScore(movie.releaseDate) * 10;
    const runtimeScore = runtimeFitScore(input.timeConstraint, movie.runtime) * 15;
    const socialScore = socialContextScore(input.socialContext, movie.genreIds) * 10;
    const rerollPreferenceScore =
      rerollPreferenceFitScore(input.rerollPreference, movie) * 8;
    const trustGraphScore = trustGraphFitScore(movie.networkScore) * 12;

    const rawTotal =
      voteScore +
      popularityScore +
      voteCountScore +
      recencyScore +
      runtimeScore +
      socialScore +
      rerollPreferenceScore +
      trustGraphScore;

    const rejectedPenalty = rejectedSet.has(movie.id) ? 60 : 0;

    const matchScore = clamp(Math.round(rawTotal - rejectedPenalty), 1, 99);
    const vibeTags = inferFallbackVibeTags(movie.genreIds);
    const reasons = buildReasons(input, movie, vibeTags);

    return {
      ...movie,
      matchScore,
      vibeTags,
      reasons,
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return pickDiverseTopThree(scored.filter((movie) => movie.matchScore > 40));
}

export function inferFallbackVibeTags(genreIds: number[]): string[] {
  const tags = genreIds
    .map((genreId) => VIBE_TAGS_BY_GENRE[genreId])
    .filter((tag): tag is string => Boolean(tag));

  if (tags.length === 0) {
    return ["General Crowd Pick"];
  }

  return [...new Set(tags)].slice(0, 3);
}

function buildReasons(
  input: DiagnoseInput,
  movie: CandidateMovie,
  vibeTags: string[],
): string[] {
  const reasons: string[] = [];

  const genreLabel = movie.genreIds.map((id) => GENRE_NAMES[id]).find(Boolean);
  if (genreLabel) {
    reasons.push(`${genreLabel} profile fits your current mood.`);
  }

  if (movie.runtime) {
    const runtimeReason = runtimeReasonForConstraint(input.timeConstraint, movie.runtime);
    if (runtimeReason) {
      reasons.push(runtimeReason);
    }
  }

  if (input.rerollPreference) {
    reasons.push(rerollReason(input.rerollPreference, movie));
  }

  if (typeof movie.networkScore === "number") {
    reasons.push(
      `Inner Circle signal: ${Math.round(movie.networkScore * 100)}% approval.`,
    );
  }

  reasons.push(`Primary vibe: ${vibeTags[0]}.`);

  return reasons.slice(0, 3);
}

function rerollReason(preference: RerollPreference, movie: CandidateMovie): string {
  if (preference === "lighter") {
    return "Shifted toward lighter, more playful energy.";
  }

  if (preference === "darker") {
    return "Shifted toward tense and darker tone.";
  }

  if (preference === "newer") {
    return "Prioritizing recent releases.";
  }

  const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : "older eras";
  return `Leaning into classics from ${year} and beyond.`;
}

function runtimeReasonForConstraint(
  timeConstraint: TimeConstraint,
  runtime: number,
): string | null {
  if (timeConstraint === "quick" && runtime <= 105) {
    return `Runtime stays tight at ${runtime} minutes.`;
  }

  if (timeConstraint === "standard" && runtime >= 95 && runtime <= 140) {
    return `Balanced runtime around ${runtime} minutes.`;
  }

  if (timeConstraint === "epic" && runtime >= 140) {
    return `Epic runtime delivers a full-length watch at ${runtime} minutes.`;
  }

  return null;
}

function pickDiverseTopThree(movies: RankedMovie[]): RankedMovie[] {
  const picked: RankedMovie[] = [];

  for (const movie of movies) {
    if (picked.length === 3) {
      break;
    }

    const isTooSimilar = picked.some((pickedMovie) => {
      const overlapCount = movie.genreIds.filter((genreId) =>
        pickedMovie.genreIds.includes(genreId),
      ).length;

      return overlapCount >= 3;
    });

    if (!isTooSimilar) {
      picked.push(movie);
    }
  }

  if (picked.length < 3) {
    for (const movie of movies) {
      if (picked.length === 3) {
        break;
      }

      if (!picked.some((pickedMovie) => pickedMovie.id === movie.id)) {
        picked.push(movie);
      }
    }
  }

  return picked;
}

function socialContextScore(context: SocialContext, genreIds: number[]): number {
  if (context === "solo") {
    return 0.7;
  }

  if (context === "date") {
    if (genreIds.includes(10749) || genreIds.includes(35)) {
      return 1;
    }

    if (genreIds.includes(53)) {
      return 0.8;
    }

    return 0.55;
  }

  if (genreIds.includes(28) || genreIds.includes(12) || genreIds.includes(35)) {
    return 1;
  }

  return 0.6;
}

function trustGraphFitScore(networkScore: number | null | undefined): number {
  if (typeof networkScore !== "number") {
    return 0.55;
  }

  return clamp(networkScore, 0, 1);
}

function rerollPreferenceFitScore(
  preference: RerollPreference | undefined,
  movie: CandidateMovie,
): number {
  if (!preference) {
    return 0.6;
  }

  if (preference === "lighter") {
    if (movie.genreIds.includes(35) || movie.genreIds.includes(12)) {
      return 1;
    }

    return 0.45;
  }

  if (preference === "darker") {
    if (
      movie.genreIds.includes(53) ||
      movie.genreIds.includes(9648) ||
      movie.genreIds.includes(27)
    ) {
      return 1;
    }

    return 0.5;
  }

  const releaseYear = Number.parseInt(movie.releaseDate.slice(0, 4), 10);
  if (Number.isNaN(releaseYear)) {
    return 0.5;
  }

  const currentYear = new Date().getFullYear();
  const age = currentYear - releaseYear;

  if (preference === "newer") {
    if (age <= 2) {
      return 1;
    }

    if (age <= 5) {
      return 0.85;
    }

    return 0.35;
  }

  if (age >= 15) {
    return 1;
  }

  if (age >= 10) {
    return 0.75;
  }

  return 0.35;
}

function runtimeFitScore(timeConstraint: TimeConstraint, runtime: number | null): number {
  if (!runtime) {
    return 0.65;
  }

  if (timeConstraint === "quick") {
    const distance = Math.abs(runtime - 95);
    return clamp(1 - distance / 70, 0.2, 1);
  }

  if (timeConstraint === "standard") {
    const distance = Math.abs(runtime - 120);
    return clamp(1 - distance / 80, 0.2, 1);
  }

  const distance = Math.abs(runtime - 155);
  return clamp(1 - distance / 90, 0.2, 1);
}

function releaseRecencyScore(releaseDate: string): number {
  if (!releaseDate) {
    return 0.4;
  }

  const releasedYear = Number.parseInt(releaseDate.slice(0, 4), 10);
  if (Number.isNaN(releasedYear)) {
    return 0.4;
  }

  const currentYear = new Date().getFullYear();
  const age = currentYear - releasedYear;

  if (age <= 2) {
    return 1;
  }

  if (age <= 5) {
    return 0.8;
  }

  if (age <= 12) {
    return 0.65;
  }

  return 0.5;
}

function normalize(value: number, min: number, max: number): number {
  if (max <= min) {
    return 0;
  }

  return clamp((value - min) / (max - min), 0, 1);
}

function normalizeLog(value: number, min: number, max: number): number {
  if (max <= min || value <= 0) {
    return 0;
  }

  const safeMin = Math.max(min, 1);
  const numerator = Math.log10(Math.max(value, safeMin)) - Math.log10(safeMin);
  const denominator = Math.log10(max) - Math.log10(safeMin);

  if (denominator <= 0) {
    return 0;
  }

  return clamp(numerator / denominator, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getGenreLabels(genreIds: number[]): string[] {
  return genreIds
    .map((genreId) => GENRE_NAMES[genreId])
    .filter((label): label is string => Boolean(label));
}
