import { z } from "zod";

/**
 * Parameters for the "dielectric-polarization" template: a molecular view
 * of how an external electric field polarizes matter. It covers both induced
 * dipoles and permanent dipoles reorienting, and shows how the resulting
 * bound-charge separation creates a weaker opposing internal field.
 */
export const dielectricPolarizationParamsSchema = z.object({
  materialKind: z.enum(["induced", "permanent", "mixed"]).default("mixed"),
  showExternalField: z.boolean().default(true),
  showOpposingField: z.boolean().default(true),
  showBoundSurfaceCharge: z.boolean().default(true),
  initialAlignment: z.number().min(0).max(1).default(0.65),
});

export type DielectricPolarizationParams = z.infer<
  typeof dielectricPolarizationParamsSchema
>;
