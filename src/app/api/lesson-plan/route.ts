import { NextResponse } from "next/server";
import { z } from "zod";

import { MissingApiKeyError, economyModeSchema } from "@/lib/ai/config";
import { GeminiProvider, LessonPlanGenerationError } from "@/lib/ai/gemini/geminiProvider";
import { InvalidLessonPlanRequestError, generateLessonPlan } from "@/lib/ai/lessonPlanService";
import { RateLimitError } from "@/lib/ai/rateLimit";

export const runtime = "nodejs";

// Overridable so tests can exercise the timeout path without waiting 60s.
const TIMEOUT_MS = Number(process.env.LESSON_PLAN_TIMEOUT_MS) || 60_000;

const requestBodySchema = z.object({
  sourceText: z.string(),
  mode: economyModeSchema.optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const parsedBody = requestBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Expected { sourceText: string, mode?: string }." },
      { status: 400 }
    );
  }

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, timeoutController.signal]);

  try {
    const lesson = await generateLessonPlan(new GeminiProvider(), {
      sourceText: parsedBody.data.sourceText,
      mode: parsedBody.data.mode,
      signal,
    });
    return NextResponse.json(lesson, { status: 200 });
  } catch (err) {
    if (err instanceof InvalidLessonPlanRequestError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof MissingApiKeyError) {
      console.error("[lesson-plan]", err.name);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    if (timeoutController.signal.aborted) {
      return NextResponse.json(
        { error: "Generating the lesson took too long. Please try again." },
        { status: 504 }
      );
    }
    if (err instanceof LessonPlanGenerationError) {
      console.error("[lesson-plan]", err.name, err.message);
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    if (err instanceof Error && err.name === "AbortError") {
      // Client disconnected; the response body won't reach anyone, but
      // return something well-formed regardless.
      return NextResponse.json({ error: "Request aborted." }, { status: 499 });
    }

    console.error("[lesson-plan] unexpected error", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Something went wrong generating the lesson." },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
