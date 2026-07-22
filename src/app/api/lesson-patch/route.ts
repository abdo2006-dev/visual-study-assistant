import { NextResponse } from "next/server";
import { z } from "zod";

import { economyModeSchema } from "@/lib/ai/config";
import { GeminiProvider } from "@/lib/ai/gemini/geminiProvider";
import { jsonWithUsage } from "@/lib/ai/jsonWithUsage";
import { generateLessonPatch } from "@/lib/ai/lessonPatchService";
import { mapAiErrorToResponse } from "@/lib/ai/routeErrorResponse";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby plan hard ceiling — matches this route's own 60s AbortController below.

// Overridable so tests can exercise the timeout path without waiting 60s.
const TIMEOUT_MS = Number(process.env.LESSON_PATCH_TIMEOUT_MS) || 60_000;

const condensedVisualSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  title: z.string(),
});
const condensedSectionSchema = z.object({
  id: z.string(),
  heading: z.string().optional(),
  simplifiedExplanation: z.string(),
  visuals: z.array(condensedVisualSchema),
  existingCuriosityQuestions: z.array(z.string()),
});
const condensedLessonSchema = z.object({
  title: z.string(),
  summary: z.string(),
  prerequisites: z.array(z.string()),
  sections: z.array(condensedSectionSchema),
});

const requestBodySchema = z.object({
  lesson: condensedLessonSchema,
  message: z.string(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .optional(),
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
      { error: "Expected { lesson, message: string, history?, mode? }." },
      { status: 400 }
    );
  }

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, timeoutController.signal]);

  try {
    return await jsonWithUsage(() =>
      generateLessonPatch(new GeminiProvider(), {
        lesson: parsedBody.data.lesson,
        message: parsedBody.data.message,
        history: parsedBody.data.history,
        mode: parsedBody.data.mode,
        signal,
      })
    );
  } catch (err) {
    return mapAiErrorToResponse(err, {
      timedOut: timeoutController.signal.aborted,
      logPrefix: "[lesson-patch]",
    });
  } finally {
    clearTimeout(timeout);
  }
}
