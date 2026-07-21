import { z } from "zod";

export const particleContainerParamsSchema = z.object({
  membranePresent: z.boolean().default(true),
  membranePermeable: z.boolean().default(false),
  initialConcentrationLeft: z.number().min(0).max(1).default(0.9),
  initialConcentrationRight: z.number().min(0).max(1).default(0.1),
  particleCount: z.number().int().min(4).max(200).default(40),
  animate: z.boolean().default(true),
});

export type ParticleContainerParams = z.infer<typeof particleContainerParamsSchema>;
