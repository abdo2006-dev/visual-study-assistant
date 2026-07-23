import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function GoogleGenAI() {
    return { models: { generateContent } };
  }),
  Type: { OBJECT: "OBJECT", STRING: "STRING", ARRAY: "ARRAY", NUMBER: "NUMBER" },
}));

const lesson = {
  title: "Test lesson",
  subject: "physics",
  sections: [
    {
      id: "s1",
      heading: "Section 1",
      sourceText: "A uniformly charged solid sphere...",
      simplifiedExplanation: "Picture a ball packed with charge.",
      equations: [{ latex: "E(r) = kQr/R^3", appliesWhen: "r < R" }],
    },
    {
      id: "s2",
      heading: "A historical aside",
      sourceText: "Coulomb published his findings in 1785.",
      simplifiedExplanation: "This section is just historical context.",
      equations: [],
    },
  ],
};

describe("GeminiProvider.planVisuals", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    generateContent.mockReset();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    vi.resetModules();
  });

  it("expands a valid assignment into a ready VisualBlock", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        assignments: [
          {
            sectionId: "s1",
            type: "scientific-diagram",
            templateId: "radial-charged-sphere",
            title: "Field inside the sphere",
            educationalPurpose: "Shows how the field grows linearly inside the sphere.",
            accessibilityDescription: "A charged sphere cross-section with a radius slider.",
            parametersJson: '{"sphereType":"solid-insulator"}',
          },
        ],
      }),
    });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().planVisuals({ lesson });

    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].sectionId).toBe("s1");
    expect(result.assignments[0].visual.templateId).toBe("radial-charged-sphere");
    expect(result.assignments[0].visual.parameters).toMatchObject({
      sphereType: "solid-insulator",
    });
  });

  it("drops an assignment with an invalid templateId instead of throwing", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        assignments: [
          {
            sectionId: "s2",
            type: "scientific-diagram",
            templateId: "not-a-real-template",
            title: "x",
            educationalPurpose: "x",
            accessibilityDescription: "x",
            parametersJson: "{}",
          },
        ],
      }),
    });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().planVisuals({ lesson });
    expect(result.assignments).toEqual([]);
  });

  it("accepts the dielectric-polarization template for dielectric field reduction", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        assignments: [
          {
            sectionId: "s1",
            type: "scientific-diagram",
            templateId: "dielectric-polarization",
            title: "Polarization reduces the net field",
            educationalPurpose:
              "Shows molecular dipoles creating an opposing polarization field.",
            accessibilityDescription:
              "A dielectric slab with aligned dipoles, bound charges, and opposing field arrows.",
            parametersJson: '{"materialKind":"mixed","initialAlignment":0.7}',
          },
        ],
      }),
    });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().planVisuals({ lesson });

    expect(result.assignments[0].visual.templateId).toBe("dielectric-polarization");
    expect(result.assignments[0].visual.parameters).toMatchObject({
      materialKind: "mixed",
      initialAlignment: 0.7,
    });
  });

  it("returns generated-illustration assignments as image prompts without blocking on image data", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        assignments: [
          {
            sectionId: "s1",
            type: "generated-illustration",
            templateId: "generated-illustration",
            title: "Two dielectric capacitor cases",
            educationalPurpose:
              "Compare constant charge and constant voltage after inserting a dielectric.",
            accessibilityDescription:
              "A two panel generated illustration comparing disconnected and connected battery cases.",
            parametersJson:
              '{"imagePrompt":"Create a two-panel educational diagram: left capacitor disconnected so Q stays constant and V drops after dielectric insertion; right capacitor connected so V stays constant and battery supplies extra Q.","caption":"Disconnected: Q constant. Connected: V constant."}',
          },
        ],
      }),
    });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().planVisuals({ lesson });

    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(result.assignments[0].visual).toMatchObject({
      templateId: "generated-illustration",
      parameters: {
        imagePrompt:
          "Create a two-panel educational diagram: left capacitor disconnected so Q stays constant and V drops after dielectric insertion; right capacitor connected so V stays constant and battery supplies extra Q.",
      },
    });
  });

  it("returns no assignments when the response reports none", async () => {
    generateContent.mockResolvedValueOnce({ text: JSON.stringify({ assignments: [] }) });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().planVisuals({ lesson });
    expect(result.assignments).toEqual([]);
  });
});
