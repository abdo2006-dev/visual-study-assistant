import "server-only";

import { InferenceClient } from "@huggingface/inference";
import type { InferenceProviderOrPolicy } from "@huggingface/inference";
import type { GoogleGenAI, Modality } from "@google/genai";

import {
  geminiImageGenerationModel,
  getHuggingFaceToken,
  huggingFaceImageGenerationModel,
  huggingFaceImageProvider,
} from "@/lib/ai/config";
import { getGeminiClient } from "@/lib/ai/gemini/client";
import { AiGenerationError } from "@/lib/ai/gemini/generateWithRepair";
import { recordGeminiUsage } from "@/lib/ai/usageContext";

const IMAGE_RESPONSE_MODALITIES = ["TEXT", "IMAGE"] as unknown as Modality[];
const HUGGING_FACE_IMAGE_PROVIDERS: readonly string[] = [
  "fal-ai",
  "hf-inference",
  "replicate",
  "together",
  "wavespeed",
  "auto",
] as const;

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
  imagePrompt: string,
  signal?: AbortSignal
): Promise<{ dataUrl: string; mimeType: string }> {
  const huggingFaceToken = getHuggingFaceToken();
  if (huggingFaceToken) {
    try {
      return await generateHuggingFaceEducationalImage(
        huggingFaceToken,
        imagePrompt,
        signal
      );
    } catch (err) {
      console.error(
        "[generate-visual-image] Hugging Face image generation failed, falling back to Gemini",
        err instanceof Error ? err.message : err
      );
    }
  }

  return generateGeminiEducationalImage(getGeminiClient(), imagePrompt, signal);
}

async function generateGeminiEducationalImage(
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

async function generateHuggingFaceEducationalImage(
  token: string,
  imagePrompt: string,
  signal?: AbortSignal
): Promise<{ dataUrl: string; mimeType: string }> {
  const client = new InferenceClient(token);
  const image = await client.textToImage(
    {
      provider: getHuggingFaceImageProvider(),
      model: huggingFaceImageGenerationModel,
      inputs: buildEducationalImagePrompt(imagePrompt),
      parameters: {
        width: 1024,
        height: 576,
        num_inference_steps: 4,
        guidance_scale: 3.5,
        negative_prompt:
          "photorealistic clutter, decorative background, unreadable text, tiny labels, unrelated equipment",
      },
    },
    {
      outputType: "blob",
      signal,
    }
  );

  const mimeType = image.type || "image/png";
  if (!mimeType.startsWith("image/")) {
    throw new AiGenerationError("Hugging Face did not return an image.");
  }

  const data = Buffer.from(await image.arrayBuffer()).toString("base64");
  return { dataUrl: `data:${mimeType};base64,${data}`, mimeType };
}

function getHuggingFaceImageProvider(): InferenceProviderOrPolicy {
  return HUGGING_FACE_IMAGE_PROVIDERS.includes(huggingFaceImageProvider)
    ? (huggingFaceImageProvider as InferenceProviderOrPolicy)
    : "fal-ai";
}
