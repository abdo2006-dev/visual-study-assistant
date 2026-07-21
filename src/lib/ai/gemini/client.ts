import "server-only";

import { GoogleGenAI } from "@google/genai";

import { getGeminiApiKey } from "@/lib/ai/config";

let client: GoogleGenAI | null = null;

/** Lazily constructed so a missing key only fails when a request actually needs Gemini. */
export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  }
  return client;
}
