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
 * `templateId` + `parameters` stay loose here (generic key/value bag) by
 * design: the strict, typed parameter schema lives per-template in the
 * visual registry (src/components/visuals/registry.ts), not here. A
 * `templateId` the registry doesn't recognize, or `parameters` that fail
 * that template's schema, renders UnsupportedVisual — this looseness never
 * reaches the renderer as arbitrary trusted code.
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
