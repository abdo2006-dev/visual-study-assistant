import { z } from "zod";

/**
 * Parameters for the "infinite-plane" template. `configuration` alone
 * determines the geometry: a single infinite charged sheet at x = 0, or
 * a parallel-plate pair at x = -0.5 and x = +0.5 (plate separation
 * normalized to 1 unit). `initialObservationPositionRatio` is a position
 * along the axis perpendicular to the plane(s), not a radius — it may be
 * negative, unlike the radial templates.
 */
export const infinitePlaneParamsSchema = z.object({
  configuration: z.enum(["single-plane", "parallel-plates"]).default("single-plane"),
  chargeSign: z.enum(["positive", "negative"]).default("positive"),
  showFieldVectors: z.boolean().default(true),
  showPotentialPlot: z.boolean().default(true),
  initialObservationPositionRatio: z.number().min(-2).max(2).default(1),
});

export type InfinitePlaneParams = z.infer<typeof infinitePlaneParamsSchema>;
