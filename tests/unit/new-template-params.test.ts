import { describe, expect, it } from "vitest";

import { coordinateGeometryParamsSchema } from "@/lib/schema/templates/coordinateGeometry";
import { dielectricPolarizationParamsSchema } from "@/lib/schema/templates/dielectricPolarization";
import { forceVectorDiagramParamsSchema } from "@/lib/schema/templates/forceVectorDiagram";
import { generatedIllustrationParamsSchema } from "@/lib/schema/templates/generatedIllustration";
import { particleContainerParamsSchema } from "@/lib/schema/templates/particleContainer";
import { processFlowDiagramParamsSchema } from "@/lib/schema/templates/processFlowDiagram";
import { simpleCircuitParamsSchema } from "@/lib/schema/templates/simpleCircuit";
import { waveDiagramParamsSchema } from "@/lib/schema/templates/waveDiagram";

describe("forceVectorDiagramParamsSchema", () => {
  it("fills in defaults for an empty object", () => {
    expect(forceVectorDiagramParamsSchema.parse({}).vectors.length).toBeGreaterThan(0);
  });

  it("rejects a magnitude outside [0,1]", () => {
    expect(() =>
      forceVectorDiagramParamsSchema.parse({
        vectors: [{ id: "f1", label: "F1", magnitude: 2, angleDegrees: 0 }],
      })
    ).toThrow();
  });
});

describe("particleContainerParamsSchema", () => {
  it("fills in defaults for an empty object", () => {
    const parsed = particleContainerParamsSchema.parse({});
    expect(parsed.particleCount).toBeGreaterThan(0);
  });

  it("rejects a particle count over the cap", () => {
    expect(() => particleContainerParamsSchema.parse({ particleCount: 10_000 })).toThrow();
  });
});

describe("processFlowDiagramParamsSchema", () => {
  it("fills in defaults for an empty object", () => {
    expect(processFlowDiagramParamsSchema.parse({}).stages.length).toBeGreaterThan(0);
  });

  it("rejects an empty stages array", () => {
    expect(() => processFlowDiagramParamsSchema.parse({ stages: [] })).toThrow();
  });
});

describe("coordinateGeometryParamsSchema", () => {
  it("fills in defaults for an empty object", () => {
    const parsed = coordinateGeometryParamsSchema.parse({});
    expect(parsed.xRange).toEqual([-5, 5]);
  });

  it("rejects an unknown curveType", () => {
    expect(() =>
      coordinateGeometryParamsSchema.parse({ curves: [{ curveType: "cubic" }] })
    ).toThrow();
  });

  it("accepts each supported curve type", () => {
    const parsed = coordinateGeometryParamsSchema.parse({
      curves: [
        { curveType: "linear", slope: 1, intercept: 0 },
        { curveType: "quadratic", a: 1, b: 0, c: 0 },
        { curveType: "sine", amplitude: 1, frequency: 1 },
      ],
    });
    expect(parsed.curves).toHaveLength(3);
  });
});

describe("waveDiagramParamsSchema", () => {
  it("fills in defaults for an empty object", () => {
    const parsed = waveDiagramParamsSchema.parse({});
    expect(parsed.propagationDirection).toBe("right");
  });

  it("rejects an out-of-range amplitude", () => {
    expect(() => waveDiagramParamsSchema.parse({ amplitude: 5 })).toThrow();
  });
});

describe("simpleCircuitParamsSchema", () => {
  it("fills in defaults for an empty object", () => {
    expect(simpleCircuitParamsSchema.parse({}).resistors.length).toBeGreaterThan(0);
  });

  it("rejects a non-positive resistance", () => {
    expect(() =>
      simpleCircuitParamsSchema.parse({
        resistors: [{ id: "r1", label: "R1", resistanceOhms: -5 }],
      })
    ).toThrow();
  });
});

describe("dielectricPolarizationParamsSchema", () => {
  it("fills in defaults for an empty object", () => {
    const parsed = dielectricPolarizationParamsSchema.parse({});
    expect(parsed.materialKind).toBe("mixed");
    expect(parsed.showOpposingField).toBe(true);
  });

  it("rejects an alignment outside [0,1]", () => {
    expect(() =>
      dielectricPolarizationParamsSchema.parse({ initialAlignment: 1.5 })
    ).toThrow();
  });
});

describe("generatedIllustrationParamsSchema", () => {
  it("accepts an image prompt before the server has generated image data", () => {
    const parsed = generatedIllustrationParamsSchema.parse({
      imagePrompt: "Show a capacitor with a dielectric being pulled between plates.",
      caption: "Dielectric insertion changes capacitor behavior.",
    });
    expect(parsed.imageDataUrl).toBeUndefined();
  });

  it("accepts a generated image data URL after materialization", () => {
    const parsed = generatedIllustrationParamsSchema.parse({
      imagePrompt: "Show polarization charges creating an opposing field.",
      imageDataUrl: "data:image/png;base64,aW1hZ2U=",
      mimeType: "image/png",
    });
    expect(parsed.mimeType).toBe("image/png");
  });
});
