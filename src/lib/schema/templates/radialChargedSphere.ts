import { z } from "zod";

/**
 * Parameters for the "radial-charged-sphere" template. `sphereType` alone
 * determines the charge distribution (solid-insulator: uniform through the
 * volume; shell: on the surface only, field is zero inside) — spec's
 * illustrative example JSON also lists a separate `distribution` field, but
 * keeping one field as the single source of truth avoids a combination
 * like sphereType:"shell" + distribution:"uniform-volume" that would be
 * physically incoherent.
 */
export const radialChargedSphereParamsSchema = z.object({
  sphereType: z.enum(["solid-insulator", "shell"]).default("solid-insulator"),
  chargeSign: z.enum(["positive", "negative"]).default("positive"),
  showGaussianSurface: z.boolean().default(true),
  showFieldVectors: z.boolean().default(true),
  showIntegralPath: z.boolean().default(false),
  showPotentialPlot: z.boolean().default(true),
  initialObservationRadiusRatio: z.number().min(0).max(2).default(0.6),
});

export type RadialChargedSphereParams = z.infer<typeof radialChargedSphereParamsSchema>;
