import { NextResponse } from "next/server";
import { z } from "zod";

import { economyModeSchema } from "@/lib/ai/config";
import { GeminiProvider } from "@/lib/ai/gemini/geminiProvider";
import { jsonWithUsage } from "@/lib/ai/jsonWithUsage";
import { generateLessonPlan } from "@/lib/ai/lessonPlanService";
import { mapAiErrorToResponse } from "@/lib/ai/routeErrorResponse";

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
    return await jsonWithUsage(() =>
      generateLessonPlan(new GeminiProvider(), {
        sourceText: parsedBody.data.sourceText,
        mode: parsedBody.data.mode,
        signal,
      })
    );
  } catch (err) {
    return mapAiErrorToResponse(err, {
      timedOut: timeoutController.signal.aborted,
      logPrefix: "[lesson-plan]",
    });
  } finally {
    clearTimeout(timeout);
  }
}
