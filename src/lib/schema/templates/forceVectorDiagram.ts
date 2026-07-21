import { z } from "zod";

export const forceVectorSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** Normalized 0-1; the diagram scales this to pixels itself. */
  magnitude: z.number().min(0).max(1),
  /** Degrees, standard math convention: 0 = +x axis, counterclockwise. */
  angleDegrees: z.number().min(0).max(360),
  color: z.string().optional(),
});

export const forceVectorDiagramParamsSchema = z.object({
  vectors: z
    .array(forceVectorSchema)
    .min(1)
    .default([
      { id: "f1", label: "F1", magnitude: 0.7, angleDegrees: 30 },
      { id: "f2", label: "F2", magnitude: 0.5, angleDegrees: 150 },
    ]),
  coordinateSystem: z.enum(["cartesian", "polar"]).default("cartesian"),
  showResultant: z.boolean().default(true),
  allowDragging: z.boolean().default(true),
});

export type ForceVector = z.infer<typeof forceVectorSchema>;
export type ForceVectorDiagramParams = z.infer<typeof forceVectorDiagramParamsSchema>;
