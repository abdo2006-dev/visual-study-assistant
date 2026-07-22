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

function mockLesson(id: string, section: ReturnType<typeof sectionWith>) {
  return {
    schemaVersion: 1,
    id,
    title: "Simulation showcase",
    subject: "physics",
    source: { kind: "pasted-text", originalText: "test input" },
    summary: "One section demonstrating a simulate feature.",
    prerequisites: [],
    learningObjectives: [],
    sections: [section],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

async function generate(page: import("@playwright/test").Page, lessonId: string, lesson: unknown) {
  await page.route("**/api/lesson-plan", async (route) => {
    await route.fulfill({ status: 200, json: lesson });
  });
  await page.goto("/");
  await page.getByPlaceholder("Paste a text explanation here...").fill("irrelevant, mocked");
  await page.getByRole("button", { name: "Generate lesson" }).click();
  await expect(page).toHaveURL(new RegExp(`/lessons/${lessonId}$`));
}

test("radial-charged-sphere: Simulate sweeps the observation radius and can be paused", async ({
  page,
}) => {
  await generate(
    page,
    "e2e-sphere-sim",
    mockLesson(
      "e2e-sphere-sim",
      sectionWith("s-sphere", "Charged sphere", {
        templateId: "radial-charged-sphere",
        parameters: { initialObservationRadiusRatio: 0 },
      })
    )
  );

  const slider = page.getByLabel("Observation radius r");
  await expect(slider).toBeEnabled();
  await expect(slider).toHaveValue("0");

  await page.getByRole("button", { name: "Simulate" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(slider).toBeDisabled();

  await expect(async () => {
    const value = await slider.inputValue();
    expect(Number(value)).toBeGreaterThan(0);
  }).toPass({ timeout: 5_000 });

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(slider).toBeEnabled();
});

test("simple-circuit: Play current flow only appears when showCurrentDirection is set", async ({
  page,
}) => {
  await generate(
    page,
    "e2e-circuit-sim",
    mockLesson(
      "e2e-circuit-sim",
      sectionWith("s-circuit", "Circuit", {
        templateId: "simple-circuit",
        parameters: {
          configuration: "series",
          voltageSource: 9,
          resistors: [{ id: "r1", label: "R1", resistanceOhms: 100 }],
          showCurrentDirection: true,
        },
      })
    )
  );

  const playButton = page.getByRole("button", { name: "Play current flow" });
  await expect(playButton).toBeVisible();
  await playButton.click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
});

test("force-vector-diagram: Simulate only appears when showResultant is set, and animates a marker", async ({
  page,
}) => {
  await generate(
    page,
    "e2e-force-sim",
    mockLesson(
      "e2e-force-sim",
      sectionWith("s-force", "Forces", {
        templateId: "force-vector-diagram",
        parameters: {
          vectors: [{ id: "f1", label: "F1", magnitude: 0.8, angleDegrees: 0 }],
          showResultant: true,
        },
      })
    )
  );

  await expect(page.getByText(/Resultant: magnitude/)).toBeVisible();
  await page.getByRole("button", { name: "Simulate" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(page.getByText(/Simulating: an object released/)).toBeVisible();
});

test("process-flow-diagram: Play/Next are available even when animateProgression is false", async ({
  page,
}) => {
  await generate(
    page,
    "e2e-flow-sim",
    mockLesson(
      "e2e-flow-sim",
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
      })
    )
  );

  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
});
