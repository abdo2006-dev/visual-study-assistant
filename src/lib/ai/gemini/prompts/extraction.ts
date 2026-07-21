import { Type } from "@google/genai";

export const extractionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    markdown: {
      type: Type.STRING,
      description: "The reconstructed reading-order content of the screenshot.",
    },
  },
  required: ["markdown"],
};

export const EXTRACTION_PROMPT = `You are extracting the readable educational content from a screenshot so a student can review and edit it as text.

Reconstruct the content in reading order (the order a sighted reader would encounter it — usually top to bottom, left to right) as a single markdown string:
- Headings as "#", "##", etc., matching the visual hierarchy in the image.
- Paragraphs as plain text, separated by a blank line.
- Bold or otherwise emphasized phrases as **bold**.
- Lists as "- " bullets.
- Every equation, as LaTeX: inline as $...$, or on its own line as $$...$$.
- If the image contains a diagram, chart, or figure that isn't primarily text, insert a short note at that point in reading order: [Diagram: one-sentence description of what it shows].

Do not add commentary, headers like "Extracted text:", or anything not present in or directly describing the image. If part of the image is illegible, write [illegible] rather than guessing.

Output must be valid JSON matching the provided schema exactly, with no other text.`;
