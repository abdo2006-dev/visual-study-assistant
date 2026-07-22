import type { LessonPatch } from "@/lib/schema/patch";
import { type LessonSection, type VisualLesson, visualLessonSchema } from "@/lib/schema/lesson";

export class PatchApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatchApplicationError";
  }
}

function findSection(lesson: VisualLesson, sectionId: string): LessonSection {
  const section = lesson.sections.find((s) => s.id === sectionId);
  if (!section) {
    throw new PatchApplicationError(`Section "${sectionId}" does not exist in this lesson.`);
  }
  return section;
}

function updateSection(
  lesson: VisualLesson,
  sectionId: string,
  updater: (section: LessonSection) => LessonSection
): VisualLesson {
  findSection(lesson, sectionId);
  return {
    ...lesson,
    sections: lesson.sections.map((s) => (s.id === sectionId ? updater(s) : s)),
    updatedAt: new Date().toISOString(),
  };
}

/** Applies a single validated patch to a lesson, returning a new lesson object. Throws PatchApplicationError if the patch references an id that doesn't exist. */
export function applyLessonPatch(lesson: VisualLesson, patch: LessonPatch): VisualLesson {
  switch (patch.op) {
    case "replace-explanation":
      return updateSection(lesson, patch.sectionId, (section) => ({
        ...section,
        simplifiedExplanation: patch.simplifiedExplanation,
      }));

    case "remove-visual":
      return updateSection(lesson, patch.sectionId, (section) => {
        if (!section.visuals.some((v) => v.id === patch.visualId)) {
          throw new PatchApplicationError(
            `Visual "${patch.visualId}" does not exist in section "${patch.sectionId}".`
          );
        }
        return { ...section, visuals: section.visuals.filter((v) => v.id !== patch.visualId) };
      });

    case "update-visual-parameters":
      return updateSection(lesson, patch.sectionId, (section) => {
        if (!section.visuals.some((v) => v.id === patch.visualId)) {
          throw new PatchApplicationError(
            `Visual "${patch.visualId}" does not exist in section "${patch.sectionId}".`
          );
        }
        return {
          ...section,
          visuals: section.visuals.map((v) =>
            v.id === patch.visualId
              ? { ...v, parameters: { ...v.parameters, ...patch.parameters } }
              : v
          ),
        };
      });

    case "add-visual":
      return updateSection(lesson, patch.sectionId, (section) => ({
        ...section,
        visuals: [
          ...section.visuals,
          {
            id: crypto.randomUUID(),
            type: patch.type,
            templateId: patch.templateId,
            title: patch.title,
            educationalPurpose: patch.educationalPurpose,
            accessibilityDescription: patch.accessibilityDescription,
            parameters: patch.parameters,
            controls: [],
            annotations: [],
            sourceSectionId: patch.sectionId,
            factualChecks: [],
            generationStatus: "ready" as const,
          },
        ],
      }));

    case "remove-section": {
      findSection(lesson, patch.sectionId);
      return {
        ...lesson,
        sections: lesson.sections.filter((s) => s.id !== patch.sectionId),
        updatedAt: new Date().toISOString(),
      };
    }

    case "add-curiosity-question":
      return updateSection(lesson, patch.sectionId, (section) => ({
        ...section,
        curiosityQuestions: [
          ...section.curiosityQuestions,
          {
            id: crypto.randomUUID(),
            type: patch.questionType,
            question: patch.question,
            answer: patch.answer,
          },
        ],
      }));

    case "add-prerequisite":
      return {
        ...lesson,
        prerequisites: [...lesson.prerequisites, patch.prerequisite],
        updatedAt: new Date().toISOString(),
      };
  }
}

export interface FailedPatch {
  patch: LessonPatch;
  error: string;
}

export interface ApplyLessonPatchesResult {
  lesson: VisualLesson;
  failed: FailedPatch[];
}

/**
 * Applies each patch independently rather than all-or-nothing: one bad
 * patch (e.g. a stale section id, or two patches from the same AI response
 * that conflict) is skipped and recorded, not allowed to discard every
 * other patch in the batch. The final lesson always validates against the
 * full schema. Callers should surface `failed` to the user — the AI's own
 * chat reply is written before patches are applied, so it can describe
 * success even when some (or all) of them don't actually apply.
 */
export function applyLessonPatches(
  lesson: VisualLesson,
  patches: LessonPatch[]
): ApplyLessonPatchesResult {
  const failed: FailedPatch[] = [];
  let current = lesson;

  for (const patch of patches) {
    try {
      current = applyLessonPatch(current, patch);
    } catch (err) {
      failed.push({
        patch,
        error: err instanceof PatchApplicationError ? err.message : "Failed to apply this change.",
      });
    }
  }

  return { lesson: visualLessonSchema.parse(current), failed };
}
