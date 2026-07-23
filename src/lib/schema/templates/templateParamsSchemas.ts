import type { z } from "zod";

import { coordinateGeometryParamsSchema } from "@/lib/schema/templates/coordinateGeometry";
import { dielectricPolarizationParamsSchema } from "@/lib/schema/templates/dielectricPolarization";
import { electricDipoleParamsSchema } from "@/lib/schema/templates/electricDipole";
import { forceVectorDiagramParamsSchema } from "@/lib/schema/templates/forceVectorDiagram";
import { generatedIllustrationParamsSchema } from "@/lib/schema/templates/generatedIllustration";
import { infinitePlaneParamsSchema } from "@/lib/schema/templates/infinitePlane";
import { longChargedWireParamsSchema } from "@/lib/schema/templates/longChargedWire";
import { particleContainerParamsSchema } from "@/lib/schema/templates/particleContainer";
import { processFlowDiagramParamsSchema } from "@/lib/schema/templates/processFlowDiagram";
import { radialChargedSphereParamsSchema } from "@/lib/schema/templates/radialChargedSphere";
import { simpleCircuitParamsSchema } from "@/lib/schema/templates/simpleCircuit";
import { waveDiagramParamsSchema } from "@/lib/schema/templates/waveDiagram";

/**
 * templateId -> parameter Zod schema only (no React components), kept
 * separate from src/components/visuals/registry.ts so server-only AI code
 * (visual planning, and in future anything else that needs to validate
 * `parameters` without rendering) never pulls a client component bundle
 * into a server module. Kept in sync manually with the registry and with
 * KNOWN_TEMPLATE_IDS — see VISUAL_TEMPLATE_GUIDE.md.
 */
export const templateParamsSchemas: Record<string, z.ZodType> = {
  "radial-charged-sphere": radialChargedSphereParamsSchema,
  "long-charged-wire": longChargedWireParamsSchema,
  "infinite-plane": infinitePlaneParamsSchema,
  "electric-dipole": electricDipoleParamsSchema,
  "dielectric-polarization": dielectricPolarizationParamsSchema,
  "generated-illustration": generatedIllustrationParamsSchema,
  "force-vector-diagram": forceVectorDiagramParamsSchema,
  "particle-container": particleContainerParamsSchema,
  "process-flow-diagram": processFlowDiagramParamsSchema,
  "coordinate-geometry": coordinateGeometryParamsSchema,
  "wave-diagram": waveDiagramParamsSchema,
  "simple-circuit": simpleCircuitParamsSchema,
};
