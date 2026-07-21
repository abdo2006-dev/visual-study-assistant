import { Type } from "@google/genai";
import { z } from "zod";

import type { VisualPlanningLesson } from "@/lib/lessonPatch/condenseLessonForVisualPlanning";
import { KNOWN_TEMPLATE_IDS } from "@/lib/schema/knownTemplateIds";
import { visualBlockTypeSchema } from "@/lib/schema/visualBlocks";

/**
 * Same parametersJson-string trick as lessonPatch.ts: Gemini's structured
 * output can't describe a truly heterogeneous "parameters" shape ahead of
 * time (it depends on whichever template gets picked per section), so it
 * travels as a JSON string here and gets parsed + validated against that
 * template's own schema afterward (see toVisualBlockAssignment.ts) — never
 * trusted as-is.
 */
export const visualPlanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    assignments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sectionId: { type: Type.STRING },
          type: { type: Type.STRING, enum: visualBlockTypeSchema.options },
          templateId: { type: Type.STRING, enum: KNOWN_TEMPLATE_IDS },
          title: { type: Type.STRING },
          educationalPurpose: { type: Type.STRING },
          accessibilityDescription: { type: Type.STRING },
          parametersJson: {
            type: Type.STRING,
            description:
              "A JSON-encoded object string containing ONLY the parameter fields you want to set for this templateId; omitted fields fall back to sensible defaults.",
          },
        },
        required: [
          "sectionId",
          "type",
          "templateId",
          "title",
          "educationalPurpose",
          "accessibilityDescription",
          "parametersJson",
        ],
      },
    },
  },
  required: ["assignments"],
};

const rawVisualAssignmentSchema = z.object({
  sectionId: z.string().min(1),
  type: z.string().min(1),
  templateId: z.string().min(1),
  title: z.string().min(1),
  educationalPurpose: z.string().min(1),
  accessibilityDescription: z.string().min(1),
  parametersJson: z.string().min(1),
});

export const aiVisualPlanSchema = z.object({
  assignments: z.array(rawVisualAssignmentSchema),
});

export type RawVisualAssignment = z.infer<typeof rawVisualAssignmentSchema>;
export type AiVisualPlan = z.infer<typeof aiVisualPlanSchema>;

const SYSTEM_INSTRUCTION = `You are choosing which sections of a study lesson would genuinely benefit from an interactive visual diagram, and configuring that diagram.

Rules:
- At most one visual per section.
- Only assign a visual when it would clearly help a student understand that section's actual physical or mathematical content — do not force a visual onto every section. Many sections (definitions, historical context, general commentary) should get none.
- Never invent a templateId. Only use one of the templates listed below, and only when its physical/mathematical setup genuinely matches what the section describes. If nothing fits, skip that section — do not attach the closest-but-wrong template.
- sectionId must exactly match one of the section ids given below.
- parametersJson must be a JSON-encoded object string (e.g. "{\\"sphereType\\":\\"shell\\"}") using ONLY fields from that template's parameter shape — omit any field to accept its default. It must describe configuration (which variant, what to show, an initial value), never facts that could be wrong; all physics/math formulas are already hard-coded in the template itself.

Available templates:

- "radial-charged-sphere" (type: "scientific-diagram"): spherically symmetric electrostatics — a uniformly charged solid sphere, or a thin charged spherical shell. Use for point-charge-like or spherical Gaussian-surface problems (field falls off as 1/r² outside). NOT for wires or planes. Parameters: { sphereType?: "solid-insulator"|"shell", chargeSign?: "positive"|"negative", showGaussianSurface?: boolean, showFieldVectors?: boolean, showIntegralPath?: boolean, showPotentialPlot?: boolean, initialObservationRadiusRatio?: number (0-2) }.

- "long-charged-wire" (type: "scientific-diagram"): cylindrical symmetry — a long/infinite straight charged wire or cylinder (solid insulating rod, or hollow conducting shell). Use for line-charge or cylindrical-Gaussian-surface problems where the field falls off as 1/r, not 1/r². Parameters: { wireType?: "solid-insulator"|"conducting-shell", chargeSign?: "positive"|"negative", showGaussianSurface?: boolean, showFieldVectors?: boolean, showPotentialPlot?: boolean, initialObservationRadiusRatio?: number (0-2) }.

- "infinite-plane" (type: "scientific-diagram"): planar symmetry — a single infinite charged sheet, or a parallel-plate capacitor. Use when the field magnitude is constant with distance (single-plane) or confined between two plates (parallel-plates). Parameters: { configuration?: "single-plane"|"parallel-plates", chargeSign?: "positive"|"negative", showFieldVectors?: boolean, showPotentialPlot?: boolean, initialObservationPositionRatio?: number (-2 to 2) }.

- "electric-dipole" (type: "scientific-diagram"): two opposite point charges (+q, -q) forming a dipole — its field, potential, or torque/potential-energy in an external field. Parameters: { showFieldLines?: boolean, showExternalField?: boolean, showTorqueVector?: boolean, showPotentialEnergyPlot?: boolean, initialAngleDegrees?: number (0-180, angle between dipole moment and external field) }.

- "force-vector-diagram" (type: "scientific-diagram"): free-body / force-vector diagrams — one or more force vectors on an object, optionally with their resultant. Use for mechanics (Newton's laws, statics, free-body diagrams), not electromagnetism. Parameters: { vectors?: [{ id: string, label: string, magnitude: number (0-1), angleDegrees: number (0-360), color?: string }] (at least 1 if provided), coordinateSystem?: "cartesian"|"polar", showResultant?: boolean, allowDragging?: boolean }.

- "particle-container" (type: "simulation"): particles in a container, optionally split by a membrane — diffusion, concentration gradients, osmosis. Use for transport/diffusion concepts, not fields. Parameters: { membranePresent?: boolean, membranePermeable?: boolean, initialConcentrationLeft?: number (0-1), initialConcentrationRight?: number (0-1), particleCount?: number (4-200), animate?: boolean }.

- "process-flow-diagram" (type: "process-flow"): a sequence of labeled stages/steps with directed connections. Use for procedures, algorithms, or multi-step processes — not physical quantities. Parameters: { stages?: [{ id: string, label: string, next: string[] (ids of stages this leads to) }] (at least 1 if provided), animateProgression?: boolean }.

- "coordinate-geometry" (type: "mathematical-plot"): a labeled 2D coordinate-plane plot — points, vectors, and/or curves (only linear, quadratic, or sine — no arbitrary formulas), with optional shaded regions. Use for pure math/graphing content. Parameters: { xRange?: [number, number], yRange?: [number, number], points?: [{x: number, y: number, label?: string}], vectors?: [{fromX: number, fromY: number, toX: number, toY: number, label?: string}], curves?: [{curveType:"linear", slope: number, intercept: number} | {curveType:"quadratic", a: number, b: number, c: number} | {curveType:"sine", amplitude: number, frequency: number, phase?: number}], shadedRegions?: [{curveIndex: number, fromX: number, toX: number}], showGrid?: boolean, xAxisLabel?: string, yAxisLabel?: string }.

- "wave-diagram" (type: "mathematical-plot"): a single traveling or standing sinusoidal wave. Use for oscillations, sound, or light-as-a-wave content. Parameters: { amplitude?: number (0-1), wavelength?: number (0.1-4), initialPhase?: number, propagationDirection?: "left"|"right", waveSpeed?: number (0.1-5), animate?: boolean }.

- "simple-circuit" (type: "scientific-diagram"): a basic series or parallel resistor circuit with a voltage source. Use only for circuit/Ohm's-law content. Parameters: { configuration?: "series"|"parallel", voltageSource?: number (>0), resistors?: [{id: string, label: string, resistanceOhms: number (>0)}] (at least 1 if provided), showCurrentDirection?: boolean, showValues?: boolean }.

If no section warrants a visual, return an empty assignments array. Output valid JSON matching the provided schema exactly, with no other text.`;

export function buildVisualPlanningPrompt(lesson: VisualPlanningLesson): string {
  return `${SYSTEM_INSTRUCTION}

Lesson (subject: ${lesson.subject}):
${JSON.stringify(lesson, null, 2)}`;
}
