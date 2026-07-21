import { z } from "zod";

/**
 * Categories mirror IMPLEMENTATION_PLAN.md section 10: this is an advisory
 * pass that flags likely problems for the user to judge, never proof that
 * a lesson is correct or incorrect.
 */
export const verificationIssueCategorySchema = z.enum([
  "unsupported-label",
  "conflicting-direction",
  "incorrect-sign",
  "missing-boundary",
  "inconsistent-variable",
  "other",
]);

export const verificationIssueSchema = z.object({
  category: verificationIssueCategorySchema,
  description: z.string().min(1),
  sectionId: z.string().optional(),
  equationId: z.string().optional(),
  visualId: z.string().optional(),
});

export const lessonVerificationSchema = z.object({
  checkedAt: z.iso.datetime(),
  summary: z.string().min(1),
  issues: z.array(verificationIssueSchema),
});

export type VerificationIssueCategory = z.infer<typeof verificationIssueCategorySchema>;
export type VerificationIssue = z.infer<typeof verificationIssueSchema>;
export type LessonVerification = z.infer<typeof lessonVerificationSchema>;
