import { z } from "zod";

export const resistorSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  resistanceOhms: z.number().positive(),
});

export const simpleCircuitParamsSchema = z.object({
  configuration: z.enum(["series", "parallel"]).default("series"),
  voltageSource: z.number().positive().default(9),
  resistors: z
    .array(resistorSchema)
    .min(1)
    .default([
      { id: "r1", label: "R1", resistanceOhms: 100 },
      { id: "r2", label: "R2", resistanceOhms: 220 },
    ]),
  showCurrentDirection: z.boolean().default(true),
  showValues: z.boolean().default(true),
});

export type Resistor = z.infer<typeof resistorSchema>;
export type SimpleCircuitParams = z.infer<typeof simpleCircuitParamsSchema>;
