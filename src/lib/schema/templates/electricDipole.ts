import { z } from "zod";

/**
 * Parameters for the "electric-dipole" template. Two modes covering two
 * distinct learning objectives that both come up for dipoles:
 *
 * - "torque-in-field" (default, for backward compatibility with lessons
 *   saved before this mode existed): a fixed +/- charge pair (dipole
 *   moment **p**, pointing from - to +) rotating in a uniform external
 *   field **E**. `initialAngleDegrees` is the angle theta between **p**
 *   and **E** — 0 is the stable equilibrium (aligned), 180 is the
 *   unstable equilibrium (anti-aligned).
 * - "far-field-comparison": the dipole's own far field at an axial point
 *   (along **p**, twice the magnitude, same direction as **p**) vs. an
 *   equatorial point (along the perpendicular bisector, half the
 *   magnitude, opposite direction) at the same distance.
 * `initialAngleDegrees` only applies to "torque-in-field";
 * `initialDistanceRatio` only applies to "far-field-comparison".
 */
export const electricDipoleParamsSchema = z.object({
  mode: z.enum(["torque-in-field", "far-field-comparison"]).default("torque-in-field"),
  showFieldLines: z.boolean().default(true),
  showExternalField: z.boolean().default(true),
  showTorqueVector: z.boolean().default(true),
  showPotentialEnergyPlot: z.boolean().default(true),
  initialAngleDegrees: z.number().min(0).max(180).default(45),
  initialDistanceRatio: z.number().min(1.5).max(5).default(2.5),
});

export type ElectricDipoleParams = z.infer<typeof electricDipoleParamsSchema>;
