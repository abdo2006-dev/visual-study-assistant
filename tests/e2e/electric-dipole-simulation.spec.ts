import { expect, test } from "@playwright/test";

const mockLesson = {
  schemaVersion: 1,
  id: "e2e-dipole-simulation-lesson",
  title: "Dipole in a uniform field",
  subject: "physics",
  source: { kind: "pasted-text", originalText: "test input" },
  summary: "A dipole released near its unstable equilibrium.",
  prerequisites: [],
  learningObjectives: [],
  sections: [
    {
      id: "s-dipole",
      heading: "Torque on a dipole",
      sourceText: "",
      simplifiedExplanation: "Demonstrates the torque-in-field dipole template.",
      importantTerms: [],
      equations: [],
      visuals: [
        {
          id: "dipole-visual",
          type: "scientific-diagram",
          templateId: "electric-dipole",
          title: "Dipole torque",
          educationalPurpose: "Testing",
          accessibilityDescription: "A test visual.",
          parameters: { mode: "torque-in-field", initialAngleDegrees: 179 },
          controls: [],
          annotations: [],
          factualChecks: [],
          generationStatus: "ready",
        },
      ],
    },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("simulating a dipole released near the unstable equilibrium visibly rotates it over time", async ({
  page,
}) => {
  await page.route("**/api/lesson-plan", async (route) => {
    await route.fulfill({ status: 200, json: mockLesson });
  });

  await page.goto("/");
  await page.getByPlaceholder("Paste a text explanation here...").fill("irrelevant, mocked");
  await page.getByRole("button", { name: "Generate lesson" }).click();
  await expect(page).toHaveURL(/\/lessons\/e2e-dipole-simulation-lesson$/);

  await expect(page.getByText("theta = 179°")).toBeVisible();
  await expect(page.getByText(/unstable equilibrium/)).toBeVisible();

  const slider = page.getByLabel("Angle theta between p and E");
  await expect(slider).toBeEnabled();

  await page.getByRole("button", { name: "Simulate" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(slider).toBeDisabled();

  // A real torque should visibly move the angle away from 179 within a few
  // seconds of real animation (not just a single frame's rounding noise).
  await expect(page.getByText("theta = 179°")).toHaveCount(0, { timeout: 8_000 });

  // Specifically toward 0 (the stable equilibrium), not the long way around
  // through 180 first — a nudge in the wrong direction would still make
  // this text disappear (it'd read "180°" briefly) without ever actually
  // heading toward alignment, which the check above alone can't catch.
  await expect(async () => {
    const text = await page.getByText(/theta = \d+°/).textContent();
    const value = Number(text?.match(/theta = (\d+)°/)?.[1]);
    expect(value).toBeLessThan(170);
  }).toPass({ timeout: 8_000 });

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(slider).toBeEnabled();
});
