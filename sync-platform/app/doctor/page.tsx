"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MentalLoad = "vegetable" | "casual" | "sherlock";
type SocialContext = "solo" | "date" | "group";
type TimeConstraint = "quick" | "standard" | "epic";
type RerollPreference = "lighter" | "darker" | "newer" | "classics";

interface DiagnoseRequest {
  mentalLoad: MentalLoad;
  socialContext: SocialContext;
  timeConstraint: TimeConstraint;
  rejectedMovieIds?: number[];
  rerollPreference?: RerollPreference;
  rerollCount?: number;
}

interface Recommendation {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
  runtime: number | null;
  networkScore: number | null;
  matchScore: number;
  vibeTags: string[];
  vibeSource: "openai" | "fallback";
  vibeSummary: string | null;
  reasons: string[];
}

interface DiagnoseResponse {
  diagnosis: DiagnoseRequest;
  viewerId?: string | null;
  viewerAuthenticated?: boolean;
  trustGraphEnabled?: boolean;
  recommendations: Recommendation[];
}

interface Option<TValue> {
  value: TValue;
  title: string;
  subtitle: string;
}

interface RefreshVibesResponse {
  vibes: Array<{
    movieId: number;
    tags?: string[];
    summary?: string;
    source?: "openai" | "fallback";
  }>;
}

const mentalLoadOptions: Option<MentalLoad>[] = [
  { value: "vegetable", title: "Brain Dead", subtitle: "Just entertain me." },
  { value: "casual", title: "Casual", subtitle: "Good story, easy watch." },
  { value: "sherlock", title: "Sherlock", subtitle: "I want layered plots." },
];

const socialOptions: Option<SocialContext>[] = [
  { value: "solo", title: "Solo", subtitle: "Anything goes." },
  { value: "date", title: "Date Night", subtitle: "Shared mood matters." },
  { value: "group", title: "The Group", subtitle: "Crowd-pleaser energy." },
];

const timeOptions: Option<TimeConstraint>[] = [
  { value: "quick", title: "Quick Fix", subtitle: "Under ~105 minutes." },
  { value: "standard", title: "Standard", subtitle: "Around 2 hours." },
  { value: "epic", title: "Epic", subtitle: "No upper time limit." },
];

const rerollOptions: Option<RerollPreference>[] = [
  {
    value: "lighter",
    title: "Go Lighter",
    subtitle: "More fun, less emotional weight.",
  },
  {
    value: "darker",
    title: "Go Darker",
    subtitle: "More tension and intensity.",
  },
  {
    value: "newer",
    title: "Only New",
    subtitle: "Focus on recent releases.",
  },
  {
    value: "classics",
    title: "Go Classic",
    subtitle: "Pull from older, proven titles.",
  },
];

export default function DoctorPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<DiagnoseRequest>({
    mentalLoad: "casual",
    socialContext: "solo",
    timeConstraint: "standard",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnoseResponse | null>(null);
  const [rerollPreference, setRerollPreference] =
    useState<RerollPreference>("lighter");
  const [rejectedMovieIds, setRejectedMovieIds] = useState<number[]>([]);
  const [rerollCount, setRerollCount] = useState(0);
  const [showRerollQuestion, setShowRerollQuestion] = useState(false);
  const [refreshingVibes, setRefreshingVibes] = useState(false);

  const progress = useMemo(() => {
    if (step === 0) {
      return 0;
    }
    if (step <= 3) {
      return Math.round((step / 3) * 100);
    }
    return 100;
  }, [step]);

  useEffect(() => {
    if (step !== 5 || !result) {
      return;
    }

    const fallbackIds = result.recommendations
      .filter((movie) => movie.vibeSource === "fallback")
      .map((movie) => movie.id);

    if (fallbackIds.length === 0) {
      return;
    }

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function poll(attempt: number) {
      if (cancelled) {
        return;
      }

      setRefreshingVibes(true);

      try {
        const response = await fetch("/api/vibes/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ movieIds: fallbackIds }),
        });

        const payload = (await response.json()) as RefreshVibesResponse | { error: string };
        if (!response.ok || "error" in payload) {
          return;
        }

        const vibeMap = new Map(payload.vibes.map((vibe) => [vibe.movieId, vibe]));

        setResult((previous) => {
          if (!previous) {
            return previous;
          }

          const updatedRecommendations = previous.recommendations.map((movie) => {
            const vibe = vibeMap.get(movie.id);
            if (!vibe) {
              return movie;
            }

            return {
              ...movie,
              vibeTags: vibe.tags ?? movie.vibeTags,
              vibeSummary: vibe.summary ?? movie.vibeSummary,
              vibeSource: vibe.source ?? movie.vibeSource,
            };
          });

          return {
            ...previous,
            recommendations: updatedRecommendations,
          };
        });

        const hasFallback = payload.vibes.some((vibe) => vibe.source !== "openai");
        if (hasFallback && attempt < 4) {
          timeout = setTimeout(() => {
            void poll(attempt + 1);
          }, 4500);
        }
      } finally {
        setRefreshingVibes(false);
      }
    }

    timeout = setTimeout(() => {
      void poll(1);
    }, 2500);

    return () => {
      cancelled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [result, step]);

  function updateAnswer<TKey extends keyof DiagnoseRequest>(
    key: TKey,
    value: DiagnoseRequest[TKey],
  ) {
    setAnswers((previous) => ({ ...previous, [key]: value }));
  }

  async function runDiagnosis(extraPayload?: Partial<DiagnoseRequest>) {
    setLoading(true);
    setError(null);
    setResult(null);
    setStep(4);

    try {
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...answers, ...extraPayload }),
      });

      const data = (await response.json()) as DiagnoseResponse | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Diagnosis failed.");
      }

      setResult(data);
      setStep(5);
    } catch (diagnosisError) {
      const message =
        diagnosisError instanceof Error
          ? diagnosisError.message
          : "Unable to run diagnosis right now.";
      setError(message);
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  function beginFirstDiagnosis() {
    setRejectedMovieIds([]);
    setRerollCount(0);
    setShowRerollQuestion(false);
    void runDiagnosis({
      rejectedMovieIds: [],
      rerollCount: 0,
      rerollPreference: undefined,
    });
  }

  function rejectAndReroll() {
    if (!result) {
      return;
    }

    const nextRejectedMovieIds = [
      ...new Set([
        ...rejectedMovieIds,
        ...result.recommendations.map((movie) => movie.id),
      ]),
    ];

    const nextRerollCount = rerollCount + 1;
    setRejectedMovieIds(nextRejectedMovieIds);
    setRerollCount(nextRerollCount);
    setShowRerollQuestion(false);

    void runDiagnosis({
      rejectedMovieIds: nextRejectedMovieIds,
      rerollPreference,
      rerollCount: nextRerollCount,
    });
  }

  function startOver() {
    setStep(0);
    setResult(null);
    setError(null);
    setRejectedMovieIds([]);
    setRerollCount(0);
    setShowRerollQuestion(false);
    setRerollPreference("lighter");
    setRefreshingVibes(false);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,rgba(247,191,98,0.22),transparent_42%),radial-gradient(circle_at_90%_0%,rgba(112,191,255,0.2),transparent_40%),linear-gradient(145deg,#090909,#121826_70%)] px-4 py-10 text-stone-100 sm:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="rounded-3xl border border-white/10 bg-black/35 p-6 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-200/80">
                Sync Decision Doctor
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
                Stop scrolling. Tell us your mood and we prescribe the exact three.
              </h1>
            </div>
            <div className="flex gap-2">
              <Link
                href="/auth"
                className="rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-stone-100 transition hover:border-white/40"
              >
                Auth
              </Link>
              <Link
                href="/admin/vibes"
                className="rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-stone-100 transition hover:border-white/40"
              >
                Vibe Debug
              </Link>
            </div>
          </div>
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#0f1117]/85 p-6 backdrop-blur sm:p-8">
          {step === 0 && (
            <div className="space-y-5">
              <p className="text-lg text-stone-200">
                We ask three quick questions, run a weighted score, and return one
                golden trio.
              </p>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full bg-amber-300 px-7 py-3 text-sm font-bold uppercase tracking-widest text-zinc-900 transition hover:bg-amber-200"
              >
                Start Consultation
              </button>
            </div>
          )}

          {step === 1 && (
            <QuestionBlock
              title="Mental Load"
              subtitle="How much focus do you have right now?"
              options={mentalLoadOptions}
              selected={answers.mentalLoad}
              onSelect={(value) => updateAnswer("mentalLoad", value)}
              onContinue={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <QuestionBlock
              title="Social Context"
              subtitle="Who are you watching with?"
              options={socialOptions}
              selected={answers.socialContext}
              onSelect={(value) => updateAnswer("socialContext", value)}
              onContinue={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <QuestionBlock
              title="Time Constraint"
              subtitle="How long can this movie run tonight?"
              options={timeOptions}
              selected={answers.timeConstraint}
              onSelect={(value) => updateAnswer("timeConstraint", value)}
              onContinue={beginFirstDiagnosis}
              continueLabel="Prescribe Movies"
            />
          )}

          {step === 4 && (
            <div className="py-8 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-amber-300" />
              <p className="mt-5 text-lg text-stone-200">
                Running diagnostics against TMDB...
              </p>
              <p className="mt-2 text-sm text-stone-400">
                Weighting mood, social context, runtime fit, reroll direction, and trust graph.
              </p>
            </div>
          )}

          {step === 5 && result && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-white">The Golden Trio</h2>
                  <p className="mt-1 text-xs text-stone-400">
                    Trust graph {result.trustGraphEnabled ? "enabled" : "disabled"}.
                    {" "}
                    {result.viewerAuthenticated ? "Signed-in session detected." : "Guest session."}
                    {refreshingVibes ? " Refreshing vibe tags..." : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-red-300/30 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-100 transition hover:border-red-200/45 hover:text-white"
                    onClick={() => setShowRerollQuestion(true)}
                  >
                    Reject Trio
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-200 transition hover:border-white/45 hover:text-white"
                    onClick={startOver}
                  >
                    New Consultation
                  </button>
                </div>
              </div>

              {showRerollQuestion && (
                <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-amber-100">
                    Adaptive Follow-up
                  </p>
                  <p className="mt-1 text-sm text-stone-300">
                    What felt off about that trio?
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {rerollOptions.map((option) => {
                      const selected = option.value === rerollPreference;
                      return (
                        <button
                          type="button"
                          key={option.value}
                          className={`rounded-xl border p-3 text-left transition ${
                            selected
                              ? "border-amber-300 bg-amber-300/10"
                              : "border-white/10 bg-white/5 hover:border-white/35"
                          }`}
                          onClick={() => setRerollPreference(option.value)}
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-white">
                            {option.title}
                          </p>
                          <p className="mt-1 text-xs text-stone-300">{option.subtitle}</p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-amber-300 px-5 py-2 text-xs font-bold uppercase tracking-widest text-zinc-900 transition hover:bg-amber-200"
                      onClick={rejectAndReroll}
                    >
                      Reroll With This Direction
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-white/20 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:border-white/40"
                      onClick={() => setShowRerollQuestion(false)}
                    >
                      Keep Current Trio
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {result.recommendations.map((movie) => (
                  <article
                    key={movie.id}
                    className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    {movie.posterPath ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                        alt={`${movie.title} poster`}
                        width={500}
                        height={750}
                        sizes="(min-width: 768px) 30vw, 92vw"
                        className="h-64 w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-64 w-full items-center justify-center rounded-xl bg-white/10 text-sm text-stone-300">
                        Poster unavailable
                      </div>
                    )}
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                      Match {movie.matchScore}%
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{movie.title}</h3>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-stone-400">
                      Vibe source: {movie.vibeSource === "openai" ? "OpenAI cache" : "Fallback"}
                    </p>
                    {typeof movie.networkScore === "number" && (
                      <p className="mt-1 text-[11px] uppercase tracking-wider text-emerald-200">
                        Inner Circle: {Math.round(movie.networkScore * 100)}% match
                      </p>
                    )}
                    <p className="mt-2 line-clamp-4 text-sm text-stone-300">{movie.overview}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {movie.vibeTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-amber-200/35 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-100"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {movie.vibeSummary && (
                      <p className="mt-3 text-xs text-stone-300">{movie.vibeSummary}</p>
                    )}
                    <ul className="mt-4 space-y-1 text-xs text-stone-300">
                      {movie.reasons.map((reason) => (
                        <li key={reason}>- {reason}</li>
                      ))}
                    </ul>
                    <Link
                      href={`/movie/${movie.id}`}
                      className="mt-4 inline-flex items-center justify-center rounded-full border border-white/25 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-stone-100 transition hover:border-white/45 hover:text-white"
                    >
                      Open Movie Room
                    </Link>
                    <p className="mt-auto pt-4 text-xs text-stone-400">
                      {movie.runtime ? `${movie.runtime} min` : "Runtime pending"} |{" "}
                      {movie.releaseDate ? movie.releaseDate.slice(0, 4) : "Year unknown"} |{" "}
                      {movie.voteAverage.toFixed(1)} global
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
              {error}
            </p>
          )}

          {loading && step !== 4 && (
            <p className="mt-4 text-sm text-stone-400">Refreshing recommendations...</p>
          )}
        </section>
      </div>
    </main>
  );
}

function QuestionBlock<TValue extends string>({
  title,
  subtitle,
  options,
  selected,
  onSelect,
  onContinue,
  continueLabel = "Continue",
}: {
  title: string;
  subtitle: string;
  options: Option<TValue>[];
  selected: TValue;
  onSelect: (value: TValue) => void;
  onContinue: () => void;
  continueLabel?: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-stone-300">{subtitle}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const isSelected = option.value === selected;
          return (
            <button
              type="button"
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`rounded-2xl border p-4 text-left transition ${
                isSelected
                  ? "border-amber-300 bg-amber-300/10"
                  : "border-white/15 bg-white/5 hover:border-white/35"
              }`}
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-white">
                {option.title}
              </p>
              <p className="mt-1 text-sm text-stone-300">{option.subtitle}</p>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-widest text-zinc-900 transition hover:bg-stone-200"
      >
        {continueLabel}
      </button>
    </div>
  );
}
