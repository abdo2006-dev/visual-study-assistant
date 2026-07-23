import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function GoogleGenAI() {
    return { models: { generateContent } };
  }),
  Type: { OBJECT: "OBJECT", STRING: "STRING", ARRAY: "ARRAY", NUMBER: "NUMBER" },
}));

const condensedLesson = {
  title: "Test lesson",
  summary: "A test lesson.",
  prerequisites: [],
  sections: [
    {
      id: "s1",
      heading: "Section 1",
      simplifiedExplanation: "Some text.",
      visuals: [{ id: "v1", templateId: "simple-circuit", title: "Circuit" }],
    },
  ],
};

describe("GeminiProvider.modifyLesson", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    generateContent.mockReset();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    vi.resetModules();
  });

  it("returns the reply and valid patches from a well-formed response", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        reply: "Done — I removed that visual.",
        patches: [{ op: "remove-visual", sectionId: "s1", visualId: "v1" }],
      }),
    });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().modifyLesson({
      lesson: condensedLesson,
      message: "remove that visual",
    });

    expect(result.reply).toBe("Done — I removed that visual.");
    expect(result.patches).toEqual([
      { op: "remove-visual", sectionId: "s1", visualId: "v1" },
    ]);
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gemini-flash-lite-latest" })
    );
  });

  it("filters out patches that fail validation, keeping valid ones and the reply", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        reply: "Made one change.",
        patches: [
          { op: "add-prerequisite", prerequisite: "Vectors" },
          { op: "not-a-real-op" },
        ],
      }),
    });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().modifyLesson({
      lesson: condensedLesson,
      message: "add a prerequisite",
    });

    expect(result.reply).toBe("Made one change.");
    expect(result.patches).toEqual([{ op: "add-prerequisite", prerequisite: "Vectors" }]);
  });

  it("expands parametersJson for add-visual patches", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        reply: "Added a circuit diagram.",
        patches: [
          {
            op: "add-visual",
            sectionId: "s1",
            type: "scientific-diagram",
            templateId: "simple-circuit",
            title: "Circuit",
            educationalPurpose: "test",
            accessibilityDescription: "test",
            parametersJson: '{"configuration":"parallel"}',
          },
        ],
      }),
    });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().modifyLesson({
      lesson: condensedLesson,
      message: "add a parallel circuit",
    });

    expect(result.patches[0]).toMatchObject({
      op: "add-visual",
      parameters: { configuration: "parallel" },
    });
  });

  it("returns generated-illustration patches as pending image prompts without blocking on image data", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        reply: "Added a generated illustration.",
        patches: [
          {
            op: "add-visual",
            sectionId: "s1",
            type: "generated-illustration",
            templateId: "generated-illustration",
            title: "Battery connected vs disconnected",
            educationalPurpose: "Show why the two dielectric cases differ.",
            accessibilityDescription:
              "A generated comparison image for two dielectric capacitor cases.",
            parametersJson:
              '{"imagePrompt":"Create a two panel diagram comparing dielectric insertion after disconnecting a battery versus while connected.","caption":"Disconnected keeps Q constant; connected keeps V constant."}',
          },
        ],
      }),
    });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().modifyLesson({
      lesson: condensedLesson,
      message: "make an actual image for this",
    });

    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(result.patches[0]).toMatchObject({
      op: "add-visual",
      templateId: "generated-illustration",
      parameters: {
        imagePrompt:
          "Create a two panel diagram comparing dielectric insertion after disconnecting a battery versus while connected.",
      },
    });
  });

  it("directly replaces repeated visuals with generated illustration patches for explicit image requests", async () => {
    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().modifyLesson({
      lesson: {
        ...condensedLesson,
        sections: [
          {
            id: "s1",
            heading: "Dielectric polarization",
            simplifiedExplanation:
              "A dielectric polarizes in an electric field by induced or reoriented dipoles.",
            visuals: [{ id: "v1", templateId: "parallel-plate-capacitor-field", title: "Capacitor" }],
            existingCuriosityQuestions: [],
          },
          {
            id: "s2",
            heading: "Disconnected battery",
            simplifiedExplanation:
              "After battery disconnection, charge stays constant and the electric field drops.",
            visuals: [{ id: "v2", templateId: "parallel-plate-capacitor-field", title: "Capacitor" }],
            existingCuriosityQuestions: [],
          },
        ],
      },
      message:
        "Replace the repeated capacitor visuals with actual generated illustrations.",
    });

    expect(generateContent).not.toHaveBeenCalled();
    expect(result.patches.map((patch) => patch.op)).toEqual([
      "remove-visual",
      "add-visual",
      "remove-visual",
      "add-visual",
    ]);
    expect(result.patches.filter((patch) => patch.op === "add-visual")).toHaveLength(2);
    expect(result.patches[1]).toMatchObject({
      op: "add-visual",
      sectionId: "s1",
      templateId: "generated-illustration",
    });
  });

  it("backfills generated illustrations when Gemini replaces repeated visuals with remove-only patches", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        reply: "I've replaced the repeated visuals.",
        patches: [{ op: "remove-visual", sectionId: "s1", visualId: "v1" }],
      }),
    });

    const { GeminiProvider } = await import("@/lib/ai/gemini/geminiProvider");
    const result = await new GeminiProvider().modifyLesson({
      lesson: {
        ...condensedLesson,
        sections: [
          {
            ...condensedLesson.sections[0],
            heading: "Dielectric polarization",
            simplifiedExplanation:
              "A dielectric polarizes in an electric field. Molecules develop induced dipoles or reorient permanent dipoles, creating an opposing internal field.",
          },
        ],
      },
      message: "Fix the repeated capacitor visual so it matches the section.",
    });

    expect(result.patches).toHaveLength(2);
    expect(result.patches[0]).toEqual({
      op: "remove-visual",
      sectionId: "s1",
      visualId: "v1",
    });
    expect(result.patches[1]).toMatchObject({
      op: "add-visual",
      sectionId: "s1",
      type: "generated-illustration",
      templateId: "generated-illustration",
      parameters: {
        caption: "Generated illustration for Dielectric polarization.",
      },
    });
    expect(String(result.patches[1]?.parameters.imagePrompt)).toContain(
      "Do not draw an interactive slider"
    );
  });
});
