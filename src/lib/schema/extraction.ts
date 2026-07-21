import { z } from "zod";

/**
 * Reading-order reconstruction of a screenshot's content as markdown:
 * `#`/`##` headings, blank-line-separated paragraphs, `**bold**` emphasis,
 * `- ` lists, `$...$`/`$$...$$` LaTeX equations, and `[Diagram: ...]` notes
 * for detected figures. Shown to the user as editable text and, once
 * confirmed, fed into the same lesson-planning pipeline as pasted text
 * (see lessonPlanService) — so this stays a single string rather than a
 * richer block structure the UI doesn't otherwise need.
 */
export const extractedSourceSchema = z.object({
  markdown: z.string().min(1),
});

export type ExtractedSource = z.infer<typeof extractedSourceSchema>;
