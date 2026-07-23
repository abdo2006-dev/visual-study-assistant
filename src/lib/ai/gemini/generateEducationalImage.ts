import "server-only";

import type { GoogleGenAI, Modality } from "@google/genai";

import { geminiImageGenerationModel } from "@/lib/ai/config";
import { AiGenerationError } from "@/lib/ai/gemini/generateWithRepair";
import { recordGeminiUsage } from "@/lib/ai/usageContext";

const IMAGE_RESPONSE_MODALITIES = ["TEXT", "IMAGE"] as unknown as Modality[];

export function buildEducationalImagePrompt(imagePrompt: string): string {
  return `Create a clear instructional science-study illustration for a lesson.

Requirements:
- Make the visual directly explain the requested concept, not a generic diagram.
- Use clean textbook-style composition with high contrast and readable labels.
- Prefer arrows, before/after panels, callouts, and simple symbolic objects over decorative art.
- Include only short labels; avoid paragraphs of text inside the image.
- Do not add unrelated apparatus, extra equations, or invented facts.

Concept to visualize:
${imagePrompt}`;
}

export async function generateEducationalImage(
  client: GoogleGenAI,
  imagePrompt: string,
  signal?: AbortSignal
): Promise<{ dataUrl: string; mimeType: string }> {
  const response = await client.models.generateContent({
    model: geminiImageGenerationModel,
    contents: buildEducationalImagePrompt(imagePrompt),
    config: {
      responseModalities: IMAGE_RESPONSE_MODALITIES,
      abortSignal: signal,
    },
  });

  const usage = response.usageMetadata;
  recordGeminiUsage({
    model: geminiImageGenerationModel,
    promptTokens: usage?.promptTokenCount ?? 0,
    candidatesTokens: usage?.candidatesTokenCount ?? 0,
    thoughtsTokens: usage?.thoughtsTokenCount ?? 0,
    totalTokens: usage?.totalTokenCount ?? 0,
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find(
    (part) => part.inlineData?.data && part.inlineData.mimeType?.startsWith("image/")
  );
  const data = imagePart?.inlineData?.data;
  const mimeType = imagePart?.inlineData?.mimeType;

  if (!data || !mimeType) {
    throw new AiGenerationError("Gemini did not return an image for that visual.");
  }

  return { dataUrl: `data:${mimeType};base64,${data}`, mimeType };
}
