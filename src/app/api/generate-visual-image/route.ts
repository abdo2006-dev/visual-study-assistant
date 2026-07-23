import { NextResponse } from "next/server";
import { z } from "zod";

import { generateEducationalImage } from "@/lib/ai/gemini/generateEducationalImage";
import { jsonWithUsage } from "@/lib/ai/jsonWithUsage";
import { mapAiErrorToResponse } from "@/lib/ai/routeErrorResponse";

export const runtime = "nodejs";
export const maxDuration = 300;

const TIMEOUT_MS = Number(process.env.GENERATE_VISUAL_IMAGE_TIMEOUT_MS) || 240_000;

const requestBodySchema = z.object({
  imagePrompt: z.string().min(20).max(2_000),
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
      { error: "Expected { imagePrompt: string }." },
      { status: 400 }
    );
  }

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, timeoutController.signal]);

  try {
    return await jsonWithUsage(async () =>
      generateEducationalImage(parsedBody.data.imagePrompt, signal)
    );
  } catch (err) {
    return mapAiErrorToResponse(err, {
      timedOut: timeoutController.signal.aborted,
      logPrefix: "[generate-visual-image]",
    });
  } finally {
    clearTimeout(timeout);
  }
}
