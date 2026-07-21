import { z } from "zod";

/**
 * Parameters for the "electric-dipole" template: a fixed +/- charge pair
 * (dipole moment **p**, pointing from - to +) in a uniform external field
 * **E**. `initialAngleDegrees` is the angle theta between **p** and **E** —
 * 0 is the stable equilibrium (aligned), 180 is the unstable equilibrium
 * (anti-aligned).
 */
export const electricDipoleParamsSchema = z.object({
  showFieldLines: z.boolean().default(true),
  showExternalField: z.boolean().default(true),
  showTorqueVector: z.boolean().default(true),
  showPotentialEnergyPlot: z.boolean().default(true),
  initialAngleDegrees: z.number().min(0).max(180).default(45),
});

export type ElectricDipoleParams = z.infer<typeof electricDipoleParamsSchema>;
