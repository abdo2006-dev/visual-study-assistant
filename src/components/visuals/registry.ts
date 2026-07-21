import type { ComponentType } from "react";
import type { z } from "zod";

import { RadialChargedSphere } from "@/components/visuals/scientific-diagram/radial-charged-sphere";
import { radialChargedSphereParamsSchema } from "@/lib/schema/templates/radialChargedSphere";

interface VisualTemplateDefinition<P> {
  paramsSchema: z.ZodType<P>;
  Component: ComponentType<{ parameters: P }>;
}

/**
 * Ties a schema to a component whose props must match its inferred type,
 * checked here at the definition site, then erases P to `unknown` for
 * storage in the (necessarily heterogeneous) registry map below.
 */
function defineTemplate<P>(
  paramsSchema: z.ZodType<P>,
  Component: ComponentType<{ parameters: P }>
): VisualTemplateDefinition<unknown> {
  return { paramsSchema, Component } as VisualTemplateDefinition<unknown>;
}

/**
 * templateId -> trusted component + its typed parameter schema. The AI only
 * ever supplies a templateId and parameters (see IMPLEMENTATION_PLAN.md
 * section 8) — an unrecognized templateId, or parameters that fail this
 * schema, renders UnsupportedVisual instead of ever executing AI-supplied
 * code.
 */
export const visualTemplateRegistry: Record<string, VisualTemplateDefinition<unknown>> = {
  "radial-charged-sphere": defineTemplate(
    radialChargedSphereParamsSchema,
    RadialChargedSphere
  ),
};

export function getVisualTemplate(templateId: string) {
  return visualTemplateRegistry[templateId];
}
