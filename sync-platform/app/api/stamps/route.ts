import { NextResponse } from "next/server";
import {
  createStamp,
  getMovieActivity,
  parseStampType,
} from "@/lib/trust-graph";
import { getAuthenticatedViewer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const movieId = Number.parseInt(url.searchParams.get("movieId") ?? "", 10);
  const viewer = await getAuthenticatedViewer();

  if (!Number.isInteger(movieId) || movieId <= 0) {
    return NextResponse.json({ error: "Valid movieId is required." }, { status: 400 });
  }

  const activity = await getMovieActivity(movieId, viewer?.id);
  return NextResponse.json(activity);
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Body is required." }, { status: 400 });
  }

  const candidate = payload as Record<string, unknown>;
  const movieId = Number.parseInt(String(candidate.movieId ?? ""), 10);
  const viewer = await getAuthenticatedViewer();
  const stamp = parseStampType(candidate.stamp);

  if (!Number.isInteger(movieId) || movieId <= 0 || !stamp) {
    return NextResponse.json(
      { error: "movieId and valid stamp are required." },
      { status: 400 },
    );
  }

  if (!viewer?.id) {
    return NextResponse.json({ error: "Sign in required to create stamps." }, { status: 401 });
  }

  const inserted = await createStamp({ movieId, viewerId: viewer.id, stamp });
  if (!inserted) {
    return NextResponse.json(
      { error: "Stamp persistence unavailable. Check Supabase config." },
      { status: 503 },
    );
  }

  return NextResponse.json({ stamp: inserted });
}
