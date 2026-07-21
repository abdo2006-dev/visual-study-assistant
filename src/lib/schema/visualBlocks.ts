import { z } from "zod";

export const visualBlockTypeSchema = z.enum([
  "scientific-diagram",
  "simulation",
  "mathematical-plot",
  "comparison",
  "process-flow",
  "timeline",
  "scale-comparison",
  "generated-illustration",
  "annotated-source-image",
]);

export const generationStatusSchema = z.enum([
  "pending",
  "ready",
  "unsupported",
  "error",
]);

/**
 * Shared shape only. `templateId` + `parameters` stay loose (generic
 * key/value bag) until Milestone 5, where each templateId gets a strict,
 * typed parameter schema (registry pattern, see IMPLEMENTATION_PLAN.md
 * section 6) and this becomes a real discriminated union. Until then the
 * registry falls back to an "unsupported visual" placeholder for anything
 * it doesn't recognize, so this looseness never reaches the renderer as
 * arbitrary trusted code.
 */
export const visualBlockSchema = z.object({
  id: z.string().min(1),
  type: visualBlockTypeSchema,
  templateId: z.string().min(1),
  title: z.string().min(1),
  educationalPurpose: z.string().min(1),
  accessibilityDescription: z.string().min(1),
  parameters: z.record(z.string(), z.unknown()).default({}),
  controls: z.array(z.string()).default([]),
  annotations: z.array(z.string()).default([]),
  sourceSectionId: z.string().optional(),
  factualChecks: z.array(z.string()).default([]),
  generationStatus: generationStatusSchema.default("pending"),
  error: z.string().optional(),
});

export type VisualBlockType = z.infer<typeof visualBlockTypeSchema>;
export type VisualBlock = z.infer<typeof visualBlockSchema>;
