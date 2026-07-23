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
});
