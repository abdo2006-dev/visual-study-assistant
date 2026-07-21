import { NextResponse } from "next/server";
import { z } from "zod";

import { economyModeSchema } from "@/lib/ai/config";
import { GeminiProvider } from "@/lib/ai/gemini/geminiProvider";
import { verifyLesson } from "@/lib/ai/lessonVerificationService";
import { mapAiErrorToResponse } from "@/lib/ai/routeErrorResponse";

export const runtime = "nodejs";

// Overridable so tests can exercise the timeout path without waiting 60s.
const TIMEOUT_MS = Number(process.env.VERIFY_LESSON_TIMEOUT_MS) || 60_000;

const verificationEquationSchema = z.object({
  id: z.string(),
  latex: z.string(),
  appliesWhen: z.string().optional(),
});
const verificationVisualSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  title: z.string(),
  educationalPurpose: z.string(),
});
const verificationSectionSchema = z.object({
  id: z.string(),
  heading: z.string().optional(),
  sourceText: z.string(),
  simplifiedExplanation: z.string(),
  equations: z.array(verificationEquationSchema),
  visuals: z.array(verificationVisualSchema),
});
const verificationLessonSchema = z.object({
  title: z.string(),
  sections: z.array(verificationSectionSchema),
});

const requestBodySchema = z.object({
  lesson: verificationLessonSchema,
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
      { error: "Expected { lesson, mode? }." },
      { status: 400 }
    );
  }

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, timeoutController.signal]);

  try {
    const result = await verifyLesson(new GeminiProvider(), {
      lesson: parsedBody.data.lesson,
      mode: parsedBody.data.mode,
      signal,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return mapAiErrorToResponse(err, {
      timedOut: timeoutController.signal.aborted,
      logPrefix: "[verify-lesson]",
    });
  } finally {
    clearTimeout(timeout);
  }
}
