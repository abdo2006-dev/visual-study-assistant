import { z } from "zod";

export const waveDiagramParamsSchema = z.object({
  amplitude: z.number().min(0).max(1).default(0.8),
  wavelength: z.number().min(0.1).max(4).default(1),
  initialPhase: z.number().default(0),
  propagationDirection: z.enum(["left", "right"]).default("right"),
  waveSpeed: z.number().min(0.1).max(5).default(1),
  animate: z.boolean().default(true),
});

export type WaveDiagramParams = z.infer<typeof waveDiagramParamsSchema>;
