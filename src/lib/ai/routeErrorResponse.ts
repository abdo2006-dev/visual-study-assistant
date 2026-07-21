import "server-only";

import { NextResponse } from "next/server";

import { MissingApiKeyError } from "@/lib/ai/config";
import { InvalidAiRequestError } from "@/lib/ai/errors";
import { AiGenerationError } from "@/lib/ai/gemini/geminiProvider";
import { RateLimitError } from "@/lib/ai/rateLimit";

/**
 * Maps errors from any AI service (lesson planning, extraction, ...) to an
 * appropriate HTTP response, without leaking stack traces or the API key.
 * Shared so every AI route handler maps errors the same way.
 */
export function mapAiErrorToResponse(
  err: unknown,
  { timedOut, logPrefix }: { timedOut: boolean; logPrefix: string }
): NextResponse {
  if (err instanceof InvalidAiRequestError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof RateLimitError) {
    return NextResponse.json({ error: err.message }, { status: 429 });
  }
  if (err instanceof MissingApiKeyError) {
    console.error(logPrefix, err.name);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  if (timedOut) {
    return NextResponse.json(
      { error: "The request took too long. Please try again." },
      { status: 504 }
    );
  }
  if (err instanceof AiGenerationError) {
    console.error(logPrefix, err.name, err.message);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
  if (err instanceof Error && err.name === "AbortError") {
    // Client disconnected; the response body won't reach anyone, but
    // return something well-formed regardless.
    return NextResponse.json({ error: "Request aborted." }, { status: 499 });
  }

  console.error(logPrefix, "unexpected error", err instanceof Error ? err.message : err);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}
