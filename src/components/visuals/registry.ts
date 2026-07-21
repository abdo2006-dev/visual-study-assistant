import type { ComponentType } from "react";
import type { z } from "zod";

import { CoordinateGeometryDiagram } from "@/components/visuals/mathematical-plot/coordinate-geometry-diagram";
import { WaveDiagram } from "@/components/visuals/mathematical-plot/wave-diagram";
import { ProcessFlowDiagram } from "@/components/visuals/process-flow/process-flow-diagram";
import { ForceVectorDiagram } from "@/components/visuals/scientific-diagram/force-vector-diagram";
import { RadialChargedSphere } from "@/components/visuals/scientific-diagram/radial-charged-sphere";
import { SimpleCircuit } from "@/components/visuals/scientific-diagram/simple-circuit";
import { ParticleContainer } from "@/components/visuals/simulation/particle-container";
import { coordinateGeometryParamsSchema } from "@/lib/schema/templates/coordinateGeometry";
import { forceVectorDiagramParamsSchema } from "@/lib/schema/templates/forceVectorDiagram";
import { particleContainerParamsSchema } from "@/lib/schema/templates/particleContainer";
import { processFlowDiagramParamsSchema } from "@/lib/schema/templates/processFlowDiagram";
import { radialChargedSphereParamsSchema } from "@/lib/schema/templates/radialChargedSphere";
import { simpleCircuitParamsSchema } from "@/lib/schema/templates/simpleCircuit";
import { waveDiagramParamsSchema } from "@/lib/schema/templates/waveDiagram";

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
 * code. See VISUAL_TEMPLATE_GUIDE.md for how to add a new entry.
 */
export const visualTemplateRegistry: Record<string, VisualTemplateDefinition<unknown>> = {
  "radial-charged-sphere": defineTemplate(
    radialChargedSphereParamsSchema,
    RadialChargedSphere
  ),
  "force-vector-diagram": defineTemplate(
    forceVectorDiagramParamsSchema,
    ForceVectorDiagram
  ),
  "particle-container": defineTemplate(particleContainerParamsSchema, ParticleContainer),
  "process-flow-diagram": defineTemplate(
    processFlowDiagramParamsSchema,
    ProcessFlowDiagram
  ),
  "coordinate-geometry": defineTemplate(
    coordinateGeometryParamsSchema,
    CoordinateGeometryDiagram
  ),
  "wave-diagram": defineTemplate(waveDiagramParamsSchema, WaveDiagram),
  "simple-circuit": defineTemplate(simpleCircuitParamsSchema, SimpleCircuit),
};

export function getVisualTemplate(templateId: string) {
  return visualTemplateRegistry[templateId];
}
