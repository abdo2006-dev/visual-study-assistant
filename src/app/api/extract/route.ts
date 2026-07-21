import { NextResponse } from "next/server";
import { z } from "zod";

import { economyModeSchema } from "@/lib/ai/config";
import { extractLessonSource } from "@/lib/ai/extractionService";
import { GeminiProvider } from "@/lib/ai/gemini/geminiProvider";
import { mapAiErrorToResponse } from "@/lib/ai/routeErrorResponse";

export const runtime = "nodejs";

// Overridable so tests can exercise the timeout path without waiting 60s.
const TIMEOUT_MS = Number(process.env.EXTRACT_TIMEOUT_MS) || 60_000;

const requestBodySchema = z.object({
  imageBase64: z.string(),
  mimeType: z.string(),
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
      { error: "Expected { imageBase64: string, mimeType: string, mode?: string }." },
      { status: 400 }
    );
  }

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, timeoutController.signal]);

  try {
    const extracted = await extractLessonSource(new GeminiProvider(), {
      imageBase64: parsedBody.data.imageBase64,
      mimeType: parsedBody.data.mimeType,
      mode: parsedBody.data.mode,
      signal,
    });
    return NextResponse.json(extracted, { status: 200 });
  } catch (err) {
    return mapAiErrorToResponse(err, {
      timedOut: timeoutController.signal.aborted,
      logPrefix: "[extract]",
    });
  } finally {
    clearTimeout(timeout);
  }
}
