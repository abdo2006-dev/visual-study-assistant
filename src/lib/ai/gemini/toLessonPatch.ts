import type { RawPatch } from "@/lib/ai/gemini/prompts/lessonPatch";
import { type LessonPatch, lessonPatchSchema } from "@/lib/schema/patch";

/**
 * Narrows Gemini's flat, loosely-typed patch envelope down to our strict
 * LessonPatch union, expanding `parametersJson` into a real object first.
 * Returns null (rather than throwing) for a patch that doesn't validate —
 * callers filter these out so one bad patch doesn't fail the whole batch.
 */
export function toLessonPatch(raw: RawPatch): LessonPatch | null {
  let parameters: Record<string, unknown> | undefined;
  if (raw.parametersJson !== undefined) {
    try {
      const parsed: unknown = JSON.parse(raw.parametersJson);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        parameters = parsed as Record<string, unknown>;
      }
    } catch {
      // parameters stays undefined; ops that require it will fail validation below
    }
  }

  const result = lessonPatchSchema.safeParse({ ...raw, parameters });
  return result.success ? result.data : null;
}
