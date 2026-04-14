"use client";

import { useMemo, useState } from "react";

type StampType =
  | "theater_worthy"
  | "laptop_movie"
  | "second_screen"
  | "guilty_pleasure"
  | "too_heavy";

interface StampRecord {
  movieId: number;
  userId: string;
  stamp: StampType;
  score: number;
  createdAt: string;
  isFriend?: boolean;
}

interface StampPanelProps {
  movieId: number;
  isAuthenticated: boolean;
  initialRecords: StampRecord[];
  initialSummary: {
    total: number;
    averageScore: number | null;
    friendCount: number;
  };
}

const stampOptions: Array<{ stamp: StampType; label: string }> = [
  { stamp: "theater_worthy", label: "Theater Worthy" },
  { stamp: "laptop_movie", label: "Laptop Movie" },
  { stamp: "second_screen", label: "Second Screen" },
  { stamp: "guilty_pleasure", label: "Guilty Pleasure" },
  { stamp: "too_heavy", label: "Too Heavy" },
];

export default function StampPanel({
  movieId,
  isAuthenticated,
  initialRecords,
  initialSummary,
}: StampPanelProps) {
  const [records, setRecords] = useState(initialRecords);
  const [summary, setSummary] = useState(initialSummary);
  const [submitting, setSubmitting] = useState<StampType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canStamp = isAuthenticated;

  const friendRecords = useMemo(
    () => records.filter((record) => record.isFriend).slice(0, 8),
    [records],
  );

  async function submitStamp(stamp: StampType) {
    if (!canStamp) {
      setError("Sign in first to submit stamps.");
      return;
    }

    setSubmitting(stamp);
    setError(null);

    try {
      const response = await fetch("/api/stamps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ movieId, stamp }),
      });

      const data = (await response.json()) as
        | { stamp: StampRecord }
        | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Failed to submit stamp.");
      }

      const updated = await fetch(`/api/stamps?movieId=${movieId}`, { cache: "no-store" });
      const activity = (await updated.json()) as {
        records: StampRecord[];
        summary: { total: number; averageScore: number | null; friendCount: number };
      };

      setRecords(activity.records);
      setSummary(activity.summary);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to stamp.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-[#111724]/80 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-100">
        Inner Circle
      </h3>
      <p className="mt-2 text-xs text-stone-300">
        {summary.total} total stamps |{" "}
        {summary.averageScore !== null ? `${summary.averageScore.toFixed(1)} / 5 avg` : "No score"}{" "}
        | {summary.friendCount} from friends
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {stampOptions.map((option) => (
          <button
            key={option.stamp}
            type="button"
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-stone-100 transition hover:border-white/35 disabled:opacity-50"
            onClick={() => void submitStamp(option.stamp)}
            disabled={submitting !== null}
          >
            {submitting === option.stamp ? "Saving..." : option.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-300/30 bg-red-500/10 p-2 text-xs text-red-100">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-2">
        {friendRecords.length === 0 && (
          <p className="text-xs text-stone-400">No friend activity yet for this title.</p>
        )}
        {friendRecords.map((record, index) => (
          <article
            key={`${record.userId}-${record.createdAt}-${index}`}
            className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs"
          >
            <p className="font-semibold text-white">
              {record.userId.slice(0, 8)} stamped {formatStamp(record.stamp)}
            </p>
            <p className="mt-1 text-stone-300">Score {record.score}/5</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatStamp(stamp: StampType): string {
  return stamp.replaceAll("_", " ");
}
