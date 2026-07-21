import { z } from "zod";

import { visualBlockTypeSchema } from "./visualBlocks";

/**
 * Validated edits the chat/modify-lesson pipeline can make to a lesson.
 * Every patch names the section (and, where relevant, visual) it targets
 * by id — applyLessonPatch (src/lib/lessonPatch/applyLessonPatch.ts)
 * rejects a patch referencing an id that doesn't exist rather than
 * guessing. Covers the patch types from IMPLEMENTATION_PLAN.md section 13:
 * "highlight concept" is deliberately not a persisted patch (see that
 * file's Milestone 7 notes) since it's a UI attention cue, not a content
 * change; "add comparison" and "simplify section" are expressed via
 * add-visual and replace-explanation respectively rather than as their own
 * ops, since they don't need different data.
 */
export const lessonPatchSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("replace-explanation"),
    sectionId: z.string().min(1),
    simplifiedExplanation: z.string().min(1),
  }),
  z.object({
    op: z.literal("remove-visual"),
    sectionId: z.string().min(1),
    visualId: z.string().min(1),
  }),
  z.object({
    op: z.literal("update-visual-parameters"),
    sectionId: z.string().min(1),
    visualId: z.string().min(1),
    parameters: z.record(z.string(), z.unknown()),
  }),
  z.object({
    op: z.literal("add-visual"),
    sectionId: z.string().min(1),
    type: visualBlockTypeSchema,
    templateId: z.string().min(1),
    title: z.string().min(1),
    educationalPurpose: z.string().min(1),
    accessibilityDescription: z.string().min(1),
    parameters: z.record(z.string(), z.unknown()),
  }),
  z.object({
    op: z.literal("remove-section"),
    sectionId: z.string().min(1),
  }),
  z.object({
    op: z.literal("add-prerequisite"),
    prerequisite: z.string().min(1),
  }),
]);

export type LessonPatch = z.infer<typeof lessonPatchSchema>;
