import { NextResponse } from "next/server";
import { z } from "zod";

import { generateBulkImportPlan } from "@/lib/ai/bulkImportPlanService";
import { economyModeSchema } from "@/lib/ai/config";
import { GeminiProvider } from "@/lib/ai/gemini/geminiProvider";
import { jsonWithUsage } from "@/lib/ai/jsonWithUsage";
import { mapAiErrorToResponse } from "@/lib/ai/routeErrorResponse";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby plan hard ceiling — matches this route's own 60s AbortController below.

// Overridable so tests can exercise the timeout path without waiting 60s.
const TIMEOUT_MS = Number(process.env.BULK_IMPORT_PLAN_TIMEOUT_MS) || 60_000;

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
      generateBulkImportPlan(new GeminiProvider(), {
        sourceText: parsedBody.data.sourceText,
        mode: parsedBody.data.mode,
        signal,
      })
    );
  } catch (err) {
    return mapAiErrorToResponse(err, {
      timedOut: timeoutController.signal.aborted,
      logPrefix: "[bulk-import-plan]",
    });
  } finally {
    clearTimeout(timeout);
  }
}
