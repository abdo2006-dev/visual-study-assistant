import { z } from "zod";

export const processStageSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  next: z.array(z.string()).default([]),
});

export const processFlowDiagramParamsSchema = z.object({
  stages: z
    .array(processStageSchema)
    .min(1)
    .default([
      { id: "start", label: "Start", next: ["step-1"] },
      { id: "step-1", label: "Step 1", next: ["end"] },
      { id: "end", label: "End", next: [] },
    ]),
  animateProgression: z.boolean().default(true),
});

export type ProcessStage = z.infer<typeof processStageSchema>;
export type ProcessFlowDiagramParams = z.infer<typeof processFlowDiagramParamsSchema>;
