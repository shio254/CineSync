import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getGenreLabels,
  inferFallbackVibeTags,
  type CandidateMovie,
} from "@/lib/algorithm";

const CACHE_DIRECTORY = path.join(process.cwd(), "var");
const CACHE_PATH = path.join(CACHE_DIRECTORY, "vibes-cache.json");
const METRICS_PATH = path.join(CACHE_DIRECTORY, "vibes-metrics.json");
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

type VibeSource = "openai" | "fallback";

interface VibeFailureEvent {
  movieId: number;
  title: string;
  reason: string;
  at: string;
}

interface VibeMetrics {
  cacheHits: number;
  cacheMisses: number;
  queuedJobs: number;
  openAiCalls: number;
  openAiSuccess: number;
  openAiFailure: number;
  refreshCalls: number;
  lastUpdatedAt: string;
  recentFailures: VibeFailureEvent[];
}

export interface CachedVibe {
  tags: string[];
  summary: string;
  source: VibeSource;
  model: string;
  updatedAt: string;
}

type CacheStore = Record<string, CachedVibe>;

let memoryCache: CacheStore | null = null;
let memoryCachePromise: Promise<CacheStore> | null = null;
let metricsCache: VibeMetrics | null = null;
let metricsPromise: Promise<VibeMetrics> | null = null;
const inFlightGenerations = new Map<number, Promise<void>>();

export async function getBestAvailableVibes(
  movies: CandidateMovie[],
): Promise<Map<number, CachedVibe>> {
  const cache = await loadCache();
  const results = new Map<number, CachedVibe>();
  let hitCount = 0;

  for (const movie of movies) {
    const fromCache = cache[String(movie.id)];
    if (fromCache) {
      results.set(movie.id, fromCache);
      hitCount += 1;
      continue;
    }

    results.set(movie.id, buildFallbackVibe(movie));
  }

  await updateMetrics((metrics) => {
    metrics.cacheHits += hitCount;
    metrics.cacheMisses += Math.max(movies.length - hitCount, 0);
  });

  return results;
}

export async function refreshVibesForMovies(
  movies: CandidateMovie[],
): Promise<Map<number, CachedVibe>> {
  await updateMetrics((metrics) => {
    metrics.refreshCalls += 1;
  });

  const cache = await loadCache();
  const apiKey = process.env.OPENAI_API_KEY;
  const results = new Map<number, CachedVibe>();
  let changed = false;

  for (const movie of movies) {
    const cached = cache[String(movie.id)];
    if (cached) {
      results.set(movie.id, cached);
      continue;
    }

    const fallback = buildFallbackVibe(movie);
    if (!apiKey) {
      results.set(movie.id, fallback);
      continue;
    }

    const generated = await generateWithOpenAi(movie, apiKey);
    if (generated) {
      cache[String(movie.id)] = generated;
      results.set(movie.id, generated);
      changed = true;
    } else {
      results.set(movie.id, fallback);
    }
  }

  if (changed) {
    await persistCache(cache);
  }

  return results;
}

export function queueVibeEnrichment(movies: CandidateMovie[]): void {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return;
  }

  void updateMetrics((metrics) => {
    metrics.queuedJobs += movies.length;
  });

  for (const movie of movies) {
    if (!movie.overview || movie.overview.trim().length < 30) {
      continue;
    }

    if (inFlightGenerations.has(movie.id)) {
      continue;
    }

    const generation = (async () => {
      const cache = await loadCache();
      if (cache[String(movie.id)]) {
        return;
      }

      const generated = await generateWithOpenAi(movie, apiKey);
      if (!generated) {
        return;
      }

      cache[String(movie.id)] = generated;
      await persistCache(cache);
    })()
      .catch(() => undefined)
      .finally(() => {
        inFlightGenerations.delete(movie.id);
      });

    inFlightGenerations.set(movie.id, generation);
  }
}

export async function getVibeDebugSnapshot(): Promise<{
  cacheSize: number;
  openAiCacheSize: number;
  fallbackCacheSize: number;
  inFlightJobs: number;
  metrics: VibeMetrics;
  samples: Array<{ movieId: string; vibe: CachedVibe }>;
}> {
  const cache = await loadCache();
  const metrics = await loadMetrics();
  const entries = Object.entries(cache);

  const openAiCacheSize = entries.filter(([, vibe]) => vibe.source === "openai").length;
  const fallbackCacheSize = entries.length - openAiCacheSize;

  return {
    cacheSize: entries.length,
    openAiCacheSize,
    fallbackCacheSize,
    inFlightJobs: inFlightGenerations.size,
    metrics,
    samples: entries.slice(0, 20).map(([movieId, vibe]) => ({ movieId, vibe })),
  };
}

function buildFallbackVibe(movie: CandidateMovie): CachedVibe {
  return {
    tags: inferFallbackVibeTags(movie.genreIds),
    summary: "Fallback genre profile while vibe model warms this title.",
    source: "fallback",
    model: "rules",
    updatedAt: new Date().toISOString(),
  };
}

async function loadCache(): Promise<CacheStore> {
  if (memoryCache) {
    return memoryCache;
  }

  if (memoryCachePromise) {
    return memoryCachePromise;
  }

  memoryCachePromise = (async () => {
    try {
      const content = await readFile(CACHE_PATH, "utf8");
      const parsed = JSON.parse(content) as CacheStore;
      memoryCache = parsed;
      return parsed;
    } catch {
      memoryCache = {};
      return memoryCache;
    }
  })();

  const loaded = await memoryCachePromise;
  memoryCachePromise = null;
  return loaded;
}

async function persistCache(cache: CacheStore): Promise<void> {
  await mkdir(CACHE_DIRECTORY, { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
}

async function loadMetrics(): Promise<VibeMetrics> {
  if (metricsCache) {
    return metricsCache;
  }

  if (metricsPromise) {
    return metricsPromise;
  }

  metricsPromise = (async () => {
    try {
      const content = await readFile(METRICS_PATH, "utf8");
      const parsed = JSON.parse(content) as VibeMetrics;
      metricsCache = normalizeMetrics(parsed);
      return metricsCache;
    } catch {
      metricsCache = defaultMetrics();
      return metricsCache;
    }
  })();

  const loaded = await metricsPromise;
  metricsPromise = null;
  return loaded;
}

async function persistMetrics(metrics: VibeMetrics): Promise<void> {
  await mkdir(CACHE_DIRECTORY, { recursive: true });
  await writeFile(METRICS_PATH, JSON.stringify(metrics, null, 2), "utf8");
}

async function updateMetrics(mutator: (metrics: VibeMetrics) => void): Promise<void> {
  const metrics = await loadMetrics();
  mutator(metrics);
  metrics.lastUpdatedAt = new Date().toISOString();
  await persistMetrics(metrics);
}

function defaultMetrics(): VibeMetrics {
  return {
    cacheHits: 0,
    cacheMisses: 0,
    queuedJobs: 0,
    openAiCalls: 0,
    openAiSuccess: 0,
    openAiFailure: 0,
    refreshCalls: 0,
    lastUpdatedAt: new Date().toISOString(),
    recentFailures: [],
  };
}

function normalizeMetrics(metrics: VibeMetrics): VibeMetrics {
  return {
    ...defaultMetrics(),
    ...metrics,
    recentFailures: Array.isArray(metrics.recentFailures)
      ? metrics.recentFailures.slice(-15)
      : [],
  };
}

async function recordFailure(movie: CandidateMovie, reason: string): Promise<void> {
  await updateMetrics((metrics) => {
    metrics.openAiFailure += 1;
    metrics.recentFailures.push({
      movieId: movie.id,
      title: movie.title,
      reason,
      at: new Date().toISOString(),
    });
    metrics.recentFailures = metrics.recentFailures.slice(-15);
  });
}

async function generateWithOpenAi(
  movie: CandidateMovie,
  apiKey: string,
): Promise<CachedVibe | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  await updateMetrics((metrics) => {
    metrics.openAiCalls += 1;
  });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VIBE_MODEL ?? DEFAULT_OPENAI_MODEL,
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "movie_vibe",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                tags: {
                  type: "array",
                  minItems: 2,
                  maxItems: 4,
                  items: {
                    type: "string",
                    minLength: 2,
                    maxLength: 24,
                  },
                },
                summary: {
                  type: "string",
                  minLength: 12,
                  maxLength: 180,
                },
              },
              required: ["tags", "summary"],
            },
          },
        },
        messages: [
          {
            role: "system",
            content:
              "You are a movie vibe classifier for a recommendation engine. Return concise tags suitable for a user-facing badge UI.",
          },
          {
            role: "user",
            content: [
              `Title: ${movie.title}`,
              `Overview: ${movie.overview}`,
              `Genres: ${getGenreLabels(movie.genreIds).join(", ") || "Unknown"}`,
              "Rules: Tags should be short, title-cased, and emotionally descriptive.",
            ].join("\n"),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      await recordFailure(movie, `HTTP ${response.status}`);
      return null;
    }

    const completion = (await response.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string | null } }>;
    };

    const rawContent = completion.choices?.[0]?.message?.content;
    if (!rawContent) {
      await recordFailure(movie, "Empty model content");
      return null;
    }

    const parsed = JSON.parse(rawContent) as {
      tags?: string[];
      summary?: string;
    };

    const cleanedTags = (parsed.tags ?? [])
      .map((tag) => sanitizeTag(tag))
      .filter((tag): tag is string => Boolean(tag))
      .slice(0, 4);

    if (cleanedTags.length === 0 || !parsed.summary) {
      await recordFailure(movie, "Invalid schema content");
      return null;
    }

    await updateMetrics((metrics) => {
      metrics.openAiSuccess += 1;
    });

    return {
      tags: cleanedTags,
      summary: parsed.summary.trim().slice(0, 180),
      source: "openai",
      model: completion.model ?? process.env.OPENAI_VIBE_MODEL ?? DEFAULT_OPENAI_MODEL,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown generation error";
    await recordFailure(movie, reason);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizeTag(value: string): string | null {
  const cleaned = value.replace(/[^a-zA-Z0-9\s/-]/g, "").trim();
  if (cleaned.length < 2) {
    return null;
  }

  return cleaned.slice(0, 24);
}
