import "server-only";

import type { Content, GoogleGenAI, Part } from "@google/genai";
import type { z } from "zod";

import { parseStructuredJson } from "@/lib/ai/gemini/jsonRepair";
import { recordGeminiUsage } from "@/lib/ai/usageContext";

export class AiGenerationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiGenerationError";
  }
}

async function callModel(
  client: GoogleGenAI,
  model: string,
  contents: Content[],
  responseSchema: object,
  signal?: AbortSignal
): Promise<string> {
  const response = await client.models.generateContent({
    model,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema,
      abortSignal: signal,
    },
  });

  // Recorded even if the response text turns out empty/invalid below — a
  // rejected or empty response still consumed real quota against the model.
  const usage = response.usageMetadata;
  recordGeminiUsage({
    model,
    promptTokens: usage?.promptTokenCount ?? 0,
    candidatesTokens: usage?.candidatesTokenCount ?? 0,
    thoughtsTokens: usage?.thoughtsTokenCount ?? 0,
    totalTokens: usage?.totalTokenCount ?? 0,
  });

  const text = response.text;
  if (!text) {
    throw new AiGenerationError("Gemini returned an empty response.");
  }
  return text;
}

/**
 * Calls Gemini for structured JSON output, with one repair attempt (a
 * follow-up turn including the validation error) if the first response
 * doesn't parse against `schema`. Shared by every GeminiProvider operation
 * so the retry policy lives in exactly one place.
 */
export async function generateWithRepair<T>({
  client,
  model,
  schema,
  responseSchema,
  initialParts,
  signal,
  onProgress,
}: {
  client: GoogleGenAI;
  model: string;
  schema: z.ZodType<T>;
  responseSchema: object;
  initialParts: Part[];
  signal?: AbortSignal;
  /** Called once, only if the first response needs a repair retry — an extra Gemini round trip a slow-feeling request is otherwise silent about. */
  onProgress?: (message: string) => void;
}): Promise<T> {
  const contents: Content[] = [{ role: "user", parts: initialParts }];

  const first = await callModel(client, model, contents, responseSchema, signal);
  const firstResult = parseStructuredJson(first, schema);
  if (firstResult.success) {
    return firstResult.data;
  }

  onProgress?.("That response needed a correction — trying again...");
  contents.push({ role: "model", parts: [{ text: first }] });
  contents.push({
    role: "user",
    parts: [
      {
        text: `Your previous response was invalid: ${firstResult.error}\n\nReturn corrected JSON matching the schema exactly, with no other text.`,
      },
    ],
  });

  const second = await callModel(client, model, contents, responseSchema, signal);
  const secondResult = parseStructuredJson(second, schema);
  if (secondResult.success) {
    return secondResult.data;
  }

  throw new AiGenerationError(
    `Gemini did not return valid output after a repair attempt: ${secondResult.error}`
  );
}
