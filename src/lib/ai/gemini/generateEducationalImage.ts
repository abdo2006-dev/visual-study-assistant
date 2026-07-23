import "server-only";

import { InferenceClient } from "@huggingface/inference";
import type { InferenceProviderOrPolicy } from "@huggingface/inference";
import type { GoogleGenAI } from "@google/genai";

import {
  geminiImageGenerationModels,
  getHuggingFaceToken,
  huggingFaceImageGenerationModel,
  huggingFaceImageProvider,
} from "@/lib/ai/config";
import { getGeminiClient } from "@/lib/ai/gemini/client";
import { AiGenerationError } from "@/lib/ai/gemini/generateWithRepair";
import { recordGeminiUsage } from "@/lib/ai/usageContext";

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
  try {
    return await generateGeminiEducationalImage(getGeminiClient(), imagePrompt, signal);
  } catch (geminiError) {
    const huggingFaceToken = getHuggingFaceToken();
    if (!huggingFaceToken) {
      throw geminiError;
    }

    console.error(
      "[generate-visual-image] Gemini image generation failed, falling back to Hugging Face",
      geminiError instanceof Error ? geminiError.message : geminiError
    );

    return generateHuggingFaceEducationalImage(huggingFaceToken, imagePrompt, signal);
  }
}

async function generateGeminiEducationalImage(
  client: GoogleGenAI,
  imagePrompt: string,
  signal?: AbortSignal
): Promise<{ dataUrl: string; mimeType: string }> {
  let lastError: unknown;

  for (const model of geminiImageGenerationModels) {
    try {
      const interaction = await client.interactions.create(
        {
          model,
          input: buildEducationalImagePrompt(imagePrompt),
          response_modalities: ["image"],
          response_format: {
            type: "image",
            mime_type: "image/jpeg",
            aspect_ratio: "16:9",
          },
        },
        signal ? { fetchOptions: { signal } } : undefined
      );

      recordGeminiUsage({
        model,
        promptTokens: interaction.usage?.total_input_tokens ?? 0,
        candidatesTokens: interaction.usage?.total_output_tokens ?? 0,
        thoughtsTokens: interaction.usage?.total_thought_tokens ?? 0,
        totalTokens: interaction.usage?.total_tokens ?? 0,
      });

      const data = interaction.output_image?.data;
      const mimeType = interaction.output_image?.mime_type ?? "image/jpeg";

      if (!data || !mimeType.startsWith("image/")) {
        throw new AiGenerationError(`Gemini ${model} did not return an image.`);
      }

      return { dataUrl: `data:${mimeType};base64,${data}`, mimeType };
    } catch (err) {
      lastError = err;

      if (signal?.aborted) {
        throw err;
      }

      console.error(
        "[generate-visual-image] Gemini image model failed",
        model,
        err instanceof Error ? err.message : err
      );
    }
  }

  throw lastError ?? new AiGenerationError("Gemini did not return an image for that visual.");
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
    : "hf-inference";
}
