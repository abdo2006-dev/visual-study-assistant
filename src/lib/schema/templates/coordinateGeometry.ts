import { z } from "zod";

export const geometryPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  label: z.string().optional(),
});

export const geometryVectorSchema = z.object({
  fromX: z.number(),
  fromY: z.number(),
  toX: z.number(),
  toY: z.number(),
  label: z.string().optional(),
});

/**
 * Curves are restricted to a small set of typed variants (no arbitrary
 * expression string + evaluator) — this is what keeps curve plotting safe
 * without needing an expression parser or eval.
 */
export const geometryCurveSchema = z.discriminatedUnion("curveType", [
  z.object({ curveType: z.literal("linear"), slope: z.number(), intercept: z.number() }),
  z.object({ curveType: z.literal("quadratic"), a: z.number(), b: z.number(), c: z.number() }),
  z.object({
    curveType: z.literal("sine"),
    amplitude: z.number(),
    frequency: z.number(),
    phase: z.number().default(0),
  }),
]);

export const shadedRegionSchema = z.object({
  curveIndex: z.number().int().min(0),
  fromX: z.number(),
  toX: z.number(),
});

export const coordinateGeometryParamsSchema = z.object({
  xRange: z.tuple([z.number(), z.number()]).default([-5, 5]),
  yRange: z.tuple([z.number(), z.number()]).default([-5, 5]),
  points: z.array(geometryPointSchema).default([]),
  vectors: z.array(geometryVectorSchema).default([]),
  curves: z.array(geometryCurveSchema).default([]),
  shadedRegions: z.array(shadedRegionSchema).default([]),
  showGrid: z.boolean().default(true),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
});

export type GeometryPoint = z.infer<typeof geometryPointSchema>;
export type GeometryVector = z.infer<typeof geometryVectorSchema>;
export type GeometryCurve = z.infer<typeof geometryCurveSchema>;
export type ShadedRegion = z.infer<typeof shadedRegionSchema>;
export type CoordinateGeometryParams = z.infer<typeof coordinateGeometryParamsSchema>;
