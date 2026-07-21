import { z } from "zod";

/**
 * Parameters for the "long-charged-wire" template. Same cross-section
 * shape as `radial-charged-sphere` (a circle), but a different physical
 * object: an infinitely long charged cylinder/wire. `wireType` alone
 * determines the charge distribution (solid-insulator: uniform through the
 * volume; conducting-shell: on the surface only, field is zero inside),
 * mirroring the sphere template's `sphereType` convention.
 */
export const longChargedWireParamsSchema = z.object({
  wireType: z.enum(["solid-insulator", "conducting-shell"]).default("solid-insulator"),
  chargeSign: z.enum(["positive", "negative"]).default("positive"),
  showGaussianSurface: z.boolean().default(true),
  showFieldVectors: z.boolean().default(true),
  showPotentialPlot: z.boolean().default(true),
  initialObservationRadiusRatio: z.number().min(0).max(2).default(0.6),
});

export type LongChargedWireParams = z.infer<typeof longChargedWireParamsSchema>;
