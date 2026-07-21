import { Type } from "@google/genai";

import type { ExtractSourceImage } from "@/lib/ai/provider";

export const extractionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    markdown: {
      type: Type.STRING,
      description: "The reconstructed reading-order content of the screenshot(s).",
    },
  },
  required: ["markdown"],
};

export const EXTRACTION_PROMPT = `You are extracting the readable educational content from one or more screenshots so a student can review and edit it as text.

You may be given more than one screenshot, labeled in order (e.g. consecutive pages or slides of the same material). Treat them as one continuous piece of content in the order given: reconstruct each in reading order, and combine them into a single markdown string as if you were transcribing consecutive pages of the same document — continue a paragraph that visibly wraps from one image to the next rather than breaking it, and don't repeat page furniture (page numbers, running headers/footers) that clearly isn't part of the content itself.

Reconstruct the content in reading order (the order a sighted reader would encounter it — usually top to bottom, left to right) as a single markdown string:
- Headings as "#", "##", etc., matching the visual hierarchy in the image.
- Paragraphs as plain text, separated by a blank line.
- Bold or otherwise emphasized phrases as **bold**.
- Lists as "- " bullets.
- Every equation, as LaTeX: inline as $...$, or on its own line as $$...$$.
- If the image contains a diagram, chart, or figure that isn't primarily text, insert a short note at that point in reading order: [Diagram: one-sentence description of what it shows].

Do not add commentary, headers like "Extracted text:", or anything not present in or directly describing the image(s). If part of an image is illegible, write [illegible] rather than guessing.

Output must be valid JSON matching the provided schema exactly, with no other text.`;

/**
 * One labeled inlineData part per screenshot (labels only added when there's
 * more than one, so the single-screenshot case stays identical to before),
 * followed by the shared instructions.
 */
export function buildExtractionParts(images: ExtractSourceImage[]) {
  const imageParts = images.flatMap((image, index) => {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    if (images.length > 1) {
      parts.push({ text: `Screenshot ${index + 1} of ${images.length}:` });
    }
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.imageBase64 } });
    return parts;
  });

  return [...imageParts, { text: EXTRACTION_PROMPT }];
}
