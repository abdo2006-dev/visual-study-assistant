import { expect, test } from "@playwright/test";

function visual(overrides: Record<string, unknown>) {
  return {
    id: overrides.id ?? "visual-1",
    type: overrides.type ?? "scientific-diagram",
    templateId: overrides.templateId,
    title: overrides.title ?? "Test visual",
    educationalPurpose: "Testing",
    accessibilityDescription: "A test visual.",
    parameters: overrides.parameters ?? {},
    controls: [],
    annotations: [],
    factualChecks: [],
    generationStatus: "ready",
  };
}

function sectionWith(id: string, heading: string, block: Record<string, unknown>) {
  return {
    id,
    heading,
    sourceText: "",
    simplifiedExplanation: `Demonstrates the ${heading} template.`,
    importantTerms: [],
    equations: [],
    visuals: [visual({ ...block, id: `${id}-visual`, sourceSectionId: id })],
  };
}

const mockLesson = {
  schemaVersion: 1,
  id: "e2e-new-templates-lesson",
  title: "New templates showcase",
  subject: "physics",
  source: { kind: "pasted-text", originalText: "test input" },
  summary: "One section per new visual template.",
  prerequisites: [],
  learningObjectives: [],
  sections: [
    sectionWith("s-forces", "Force vectors", {
      templateId: "force-vector-diagram",
      type: "scientific-diagram",
      parameters: {
        vectors: [{ id: "f1", label: "F1", magnitude: 0.6, angleDegrees: 20 }],
      },
    }),
    sectionWith("s-particles", "Diffusion", {
      templateId: "particle-container",
      type: "simulation",
      parameters: { particleCount: 10, animate: false },
    }),
    sectionWith("s-flow", "Process", {
      templateId: "process-flow-diagram",
      type: "process-flow",
      parameters: {
        stages: [
          { id: "a", label: "Stage A", next: ["b"] },
          { id: "b", label: "Stage B", next: [] },
        ],
        animateProgression: false,
      },
    }),
    sectionWith("s-geometry", "Geometry", {
      templateId: "coordinate-geometry",
      type: "mathematical-plot",
      parameters: {},
    }),
    sectionWith("s-wave", "Wave", {
      templateId: "wave-diagram",
      type: "mathematical-plot",
      parameters: { animate: false },
    }),
    sectionWith("s-circuit", "Circuit", {
      templateId: "simple-circuit",
      type: "scientific-diagram",
      parameters: {},
    }),
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("all six new visual templates render inside a generated lesson", async ({ page }) => {
  await page.route("**/api/lesson-plan", async (route) => {
    await route.fulfill({ status: 200, json: mockLesson });
  });

  await page.goto("/");
  await page
    .getByPlaceholder("Paste a text explanation here...")
    .fill("irrelevant, network is mocked");
  await page.getByRole("button", { name: "Generate lesson" }).click();
  await expect(page).toHaveURL(/\/lessons\/e2e-new-templates-lesson$/);

  await expect(page.getByText(/Resultant: magnitude/)).toBeVisible();
  await expect(page.getByText(/Left: \d+ · Right: \d+/)).toBeVisible();
  await expect(page.getByText("Stage A")).toBeVisible();
  await expect(page.getByText("Stage B")).toBeVisible();
  await expect(page.getByRole("img", { name: "Coordinate geometry diagram" })).toBeVisible();
  await expect(page.getByText(/Wave propagating/)).toBeVisible();
  await expect(page.getByText(/Series circuit/)).toBeVisible();
});
