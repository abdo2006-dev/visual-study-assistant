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
  const aiServiceError = extractAiServiceError(err);
  if (aiServiceError && isQuotaError(aiServiceError)) {
    console.error(logPrefix, "quota error", aiServiceError.model ?? aiServiceError.status);
    return NextResponse.json(
      { error: buildQuotaErrorMessage(aiServiceError) },
      { status: 429 }
    );
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

interface AiServiceErrorDetails {
  code?: number;
  status?: string;
  message?: string;
  retryDelay?: string;
  model?: string;
}

function extractAiServiceError(err: unknown): AiServiceErrorDetails | null {
  if (err instanceof Error) {
    const parsed = parsePossibleJson(err.message);
    const fromParsed = extractAiServiceErrorFromObject(parsed);
    if (fromParsed) return fromParsed;

    const fromMessage = extractAiServiceErrorFromMessage(err.message);
    if (fromMessage) return fromMessage;
  }

  const fromObject = extractAiServiceErrorFromObject(err);
  if (fromObject) return fromObject;

  return null;
}

function extractAiServiceErrorFromMessage(message: string): AiServiceErrorDetails | null {
  if (!/quota|rate limit|resource exhausted|exceeded/i.test(message)) return null;

  const codeMatch = message.match(/^\s*(\d{3})\b/);
  return {
    code: codeMatch ? Number(codeMatch[1]) : undefined,
    message,
    retryDelay: extractRetryDelayFromMessage(message),
    model: extractModelFromMessage(message),
  };
}

function extractAiServiceErrorFromObject(err: unknown): AiServiceErrorDetails | null {
  if (!err || typeof err !== "object") return null;

  const record = err as Record<string, unknown>;
  const inner = record.error && typeof record.error === "object" ? record.error : record;
  const source = inner as Record<string, unknown>;
  const message = typeof source.message === "string" ? source.message : undefined;
  const details = source.details;
  const code = typeof source.code === "number" ? source.code : undefined;
  const status = typeof source.status === "string" ? source.status : undefined;
  const retryDelay = extractRetryDelay(details);
  const model = extractQuotaModel(details) ?? extractModelFromMessage(message);
  if (
    code === undefined &&
    status === undefined &&
    !retryDelay &&
    !model &&
    !/quota|rate limit|resource exhausted/i.test(message ?? "")
  ) {
    return null;
  }

  return {
    code,
    status,
    message,
    retryDelay,
    model,
  };
}

function parsePossibleJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isQuotaError(err: AiServiceErrorDetails): boolean {
  return (
    err.code === 429 ||
    err.status === "RESOURCE_EXHAUSTED" ||
    /quota|rate limit|resource exhausted/i.test(err.message ?? "")
  );
}

function buildQuotaErrorMessage(err: AiServiceErrorDetails): string {
  const model = err.model ? ` for ${err.model}` : "";
  const retry = err.retryDelay ? ` Gemini says to retry in about ${formatRetryDelay(err.retryDelay)}.` : "";
  return `Gemini is rate limited or out of quota${model}.${retry} Try again later, switch Settings to Economical, or use a Gemini key with available quota.`;
}

function extractRetryDelay(details: unknown): string | undefined {
  if (!Array.isArray(details)) return undefined;
  for (const detail of details) {
    if (!detail || typeof detail !== "object") continue;
    const retryDelay = (detail as Record<string, unknown>).retryDelay;
    if (typeof retryDelay === "string") return retryDelay;
  }
  return undefined;
}

function extractQuotaModel(details: unknown): string | undefined {
  if (!Array.isArray(details)) return undefined;

  for (const detail of details) {
    if (!detail || typeof detail !== "object") continue;
    const violations = (detail as Record<string, unknown>).violations;
    if (!Array.isArray(violations)) continue;

    for (const violation of violations) {
      if (!violation || typeof violation !== "object") continue;
      const dimensions = (violation as Record<string, unknown>).quotaDimensions;
      if (!dimensions || typeof dimensions !== "object") continue;
      const model = (dimensions as Record<string, unknown>).model;
      if (typeof model === "string" && model.trim()) return model;
    }
  }

  return undefined;
}

function extractModelFromMessage(message: string | undefined): string | undefined {
  if (!message) return undefined;
  return message.match(/model:\s*([^\s,\n]+)/i)?.[1];
}

function extractRetryDelayFromMessage(message: string): string | undefined {
  return message.match(/retry in\s+([0-9.]+\s*s(?:econds?)?)/i)?.[1];
}

function formatRetryDelay(value: string): string {
  return value.endsWith("s") ? `${value.slice(0, -1)} seconds` : value;
}
