import "server-only";

import { InvalidAiRequestError } from "@/lib/ai/errors";
import type { LessonAIProvider, ModifyLessonInput, ModifyLessonResult } from "@/lib/ai/provider";
import { checkRateLimit } from "@/lib/ai/rateLimit";

export class InvalidLessonPatchRequestError extends InvalidAiRequestError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLessonPatchRequestError";
  }
}

const MAX_MESSAGE_LENGTH = 2_000;

/**
 * Provider-agnostic orchestration for chat-based lesson edits — mirrors
 * lessonPlanService.ts/extractionService.ts. No content-hash caching here:
 * a cached patch could reference a visual/section id that a subsequent
 * edit has already removed, which is a correctness risk the other two
 * services' patch-only requests don't have.
 */
export async function generateLessonPatch(
  provider: LessonAIProvider,
  input: ModifyLessonInput
): Promise<ModifyLessonResult> {
  const message = input.message.trim();

  if (!message) {
    throw new InvalidLessonPatchRequestError("Type a message before sending.");
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new InvalidLessonPatchRequestError(
      `That message is too long (max ${MAX_MESSAGE_LENGTH.toLocaleString()} characters).`
    );
  }
  if (input.lesson.sections.length === 0) {
    throw new InvalidLessonPatchRequestError("This lesson has no sections to modify.");
  }

  checkRateLimit();

  return provider.modifyLesson({ ...input, message });
}
