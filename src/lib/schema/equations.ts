import { z } from "zod";

export const symbolDefinitionSchema = z.object({
  symbol: z.string().min(1),
  meaning: z.string().min(1),
  unit: z.string().optional(),
});

export const equationBlockSchema = z.object({
  id: z.string().min(1),
  latex: z.string().min(1),
  plainLanguageReading: z.string().optional(),
  symbols: z.array(symbolDefinitionSchema).default([]),
  appliesWhen: z.string().optional(),
  sourceSectionId: z.string().optional(),
});

export type SymbolDefinition = z.infer<typeof symbolDefinitionSchema>;
export type EquationBlock = z.infer<typeof equationBlockSchema>;
