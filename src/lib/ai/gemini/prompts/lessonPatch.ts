import { Type } from "@google/genai";
import { z } from "zod";

import type { ChatTurn } from "@/lib/ai/provider";
import { TEMPLATE_DESCRIPTIONS } from "@/lib/ai/gemini/prompts/templateDescriptions";
import type { CondensedLesson } from "@/lib/lessonPatch/condenseLesson";

/**
 * Gemini's structured-output schema needs every field's shape known ahead
 * of time, which a truly free-form "parameters" object isn't (it depends on
 * whichever template the AI picks). So visual parameters travel as a JSON
 * string (`parametersJson`) here — a shape Gemini can always describe —
 * and get parsed + validated against that template's own schema after the
 * fact (see geminiProvider.ts's toLessonPatch), rather than trusted as-is.
 */
export const lessonPatchResponseSchema = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description:
        "A short, friendly message explaining what changed (or, if nothing could be done, why), shown to the user in the chat.",
    },
    patches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          op: {
            type: Type.STRING,
            enum: [
              "replace-explanation",
              "remove-visual",
              "update-visual-parameters",
              "add-visual",
              "remove-section",
              "add-curiosity-question",
              "add-prerequisite",
            ],
          },
          sectionId: { type: Type.STRING },
          simplifiedExplanation: { type: Type.STRING },
          visualId: { type: Type.STRING },
          type: { type: Type.STRING },
          templateId: { type: Type.STRING },
          title: { type: Type.STRING },
          educationalPurpose: { type: Type.STRING },
          accessibilityDescription: { type: Type.STRING },
          parametersJson: { type: Type.STRING },
          questionType: { type: Type.STRING, enum: ["why", "how", "what"] },
          question: { type: Type.STRING },
          answer: { type: Type.STRING },
          prerequisite: { type: Type.STRING },
        },
        required: ["op"],
      },
    },
  },
  required: ["reply", "patches"],
};

const rawPatchSchema = z.object({
  op: z.string(),
  sectionId: z.string().optional(),
  simplifiedExplanation: z.string().optional(),
  visualId: z.string().optional(),
  type: z.string().optional(),
  templateId: z.string().optional(),
  title: z.string().optional(),
  educationalPurpose: z.string().optional(),
  accessibilityDescription: z.string().optional(),
  parametersJson: z.string().optional(),
  questionType: z.string().optional(),
  question: z.string().optional(),
  answer: z.string().optional(),
  prerequisite: z.string().optional(),
});

export const lessonPatchAiResponseSchema = z.object({
  reply: z.string().min(1),
  patches: z.array(rawPatchSchema),
});

export type RawPatch = z.infer<typeof rawPatchSchema>;
export type LessonPatchAiResponse = z.infer<typeof lessonPatchAiResponseSchema>;

const SYSTEM_INSTRUCTION = `You are helping a student edit a study lesson through conversation.

You can make these kinds of changes ("patches"), each identified by its "op":
- replace-explanation: rewrite a section's simplifiedExplanation (sectionId, simplifiedExplanation)
- remove-visual: delete a visual from a section (sectionId, visualId)
- update-visual-parameters: change an existing visual's parameters (sectionId, visualId, parametersJson — a JSON-encoded object string of ONLY the fields to change)
- add-visual: add a new visual to a section (sectionId, type, templateId, title, educationalPurpose, accessibilityDescription, parametersJson — a JSON-encoded object string)
- remove-section: delete an entire section (sectionId)
- add-curiosity-question: attach a persistent, collapsible why/how/what follow-up to a section, shown alongside it from then on (sectionId, questionType: "why"/"how"/"what", question, answer)
- add-prerequisite: add a prerequisite topic to the lesson (prerequisite)

For add-visual and update-visual-parameters, templateId must be one of these, and parametersJson must use ONLY that template's own parameter fields (a JSON-encoded object string, omitted fields fall back to defaults):

${TEMPLATE_DESCRIPTIONS}

If none of these genuinely match what the user is asking for, don't invent a templateId or force the closest-but-wrong one — explain in your reply that it isn't available yet instead, and return no patch for that request. In particular, the electrostatics templates each depict ONE specific charge geometry (sphere, wire, plane, or dipole) — only pick one when the lesson or the user's request actually names or clearly implies that geometry; for a general "show the field" request with no stated geometry, use "coordinate-geometry" instead of assuming one.

If the user says they do not understand a section, says an existing visual is repeated/wrong/not related, or asks for "a visual", "diagram", "image", "picture", or "show me", first identify the single section they mean. If a listed template genuinely matches that concept, return an add-visual patch for that section. If the section already has an unrelated or repeated visual, include a remove-visual patch for that old visual before the add-visual patch. Prefer the most specific matching template; for dielectric polarization, induced dipoles, permanent dipoles reorienting, bound charge, or reduced net field in a dielectric, use "dielectric-polarization", not the isolated point-charge "electric-dipole" template.

Do not add a visual that duplicates an existing visual on that section or another section with the same templateId and same purpose. A repeated generic diagram is worse than no new diagram.

If the user is asking "why", "how", or "what" about something already in the lesson — e.g. "why isn't the field zero there too?" — answer it in your reply AND return an add-curiosity-question patch for the section it's about, so the explanation stays attached to the lesson instead of only living in the chat transcript. Skip the patch (but still answer) if that section's existingCuriosityQuestions already covers essentially the same question. Reason from the lesson's own content or standard, well-established knowledge — never invent facts. For anything else that doesn't require changing the lesson (e.g. a general question unrelated to any section), return an empty patches array and just answer in your reply.

Only reference section/visual ids that actually exist in the lesson below.

Your "reply" must describe only what the "patches" array you're returning actually contains — never claim a change was made unless there's a corresponding patch for it in this same response.

Output valid JSON matching the provided schema exactly, with no other text.`;

export function buildLessonPatchPrompt(
  lesson: CondensedLesson,
  message: string,
  history: ChatTurn[] = []
): string {
  const historyText = history
    .map((turn) => `${turn.role === "user" ? "Student" : "Assistant"}: ${turn.content}`)
    .join("\n");

  return `${SYSTEM_INSTRUCTION}

Current lesson:
${JSON.stringify(lesson, null, 2)}

${historyText ? `Recent conversation:\n${historyText}\n` : ""}
Student's new message: ${message}`;
}
