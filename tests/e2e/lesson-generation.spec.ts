import { expect, test } from "@playwright/test";

const mockLesson = {
  schemaVersion: 1,
  id: "e2e-mock-lesson",
  title: "Newton's First Law (mocked)",
  subject: "physics",
  source: { kind: "pasted-text", originalText: "test input" },
  summary: "A mocked lesson used to test the generation flow without calling Gemini.",
  prerequisites: [],
  learningObjectives: ["State Newton's first law"],
  sections: [
    {
      id: "section-1",
      heading: "Inertia",
      sourceText: "An object in motion stays in motion.",
      simplifiedExplanation: "Objects resist changes to their motion.",
      importantTerms: [],
      equations: [],
      visuals: [],
    },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("generating a lesson calls the API and saves the result", async ({ page }) => {
  await page.route("**/api/lesson-plan", async (route) => {
    await route.fulfill({ status: 200, json: mockLesson });
  });

  await page.goto("/");
  await page
    .getByPlaceholder("Paste a text explanation here...")
    .fill("An object in motion stays in motion unless a force acts on it.");
  await page.getByRole("button", { name: "Generate lesson" }).click();

  await expect(page).toHaveURL(/\/lessons\/e2e-mock-lesson$/);
  await expect(
    page.getByRole("heading", { name: "Newton's First Law (mocked)" })
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Newton's First Law (mocked)" })
  ).toBeVisible();
});

test("parses a real multi-line NDJSON progress stream, not just a flat JSON body", async ({
  page,
}) => {
  const ndjsonBody = [
    JSON.stringify({ type: "progress", message: "Reading your text and drafting sections..." }),
    JSON.stringify({ type: "progress", message: "Choosing visuals for each section..." }),
    JSON.stringify({ type: "result", ...mockLesson, apiUsage: [] }),
  ].join("\n");

  await page.route("**/api/lesson-plan", async (route) => {
    await route.fulfill({
      status: 200,
      body: ndjsonBody,
      headers: { "Content-Type": "application/x-ndjson" },
    });
  });

  await page.goto("/");
  await page
    .getByPlaceholder("Paste a text explanation here...")
    .fill("An object in motion stays in motion unless a force acts on it.");
  await page.getByRole("button", { name: "Generate lesson" }).click();

  await expect(page).toHaveURL(/\/lessons\/e2e-mock-lesson$/);
  await expect(
    page.getByRole("heading", { name: "Newton's First Law (mocked)" })
  ).toBeVisible();
});

test("sends optional instructions alongside the source text", async ({ page }) => {
  let sentInstructions: string | undefined;
  await page.route("**/api/lesson-plan", async (route) => {
    sentInstructions = route.request().postDataJSON()?.instructions;
    await route.fulfill({ status: 200, json: mockLesson });
  });

  await page.goto("/");
  await page
    .getByPlaceholder("Paste a text explanation here...")
    .fill("An object in motion stays in motion unless a force acts on it.");
  await page
    .getByPlaceholder(/focus on how to graph this/)
    .fill("focus on how to graph this");
  await page.getByRole("button", { name: "Generate lesson" }).click();

  await expect(page).toHaveURL(/\/lessons\/e2e-mock-lesson$/);
  expect(sentInstructions).toBe("focus on how to graph this");
});

test("shows an error and preserves input when the API call fails", async ({ page }) => {
  await page.route("**/api/lesson-plan", async (route) => {
    await route.fulfill({
      status: 502,
      json: { error: "Gemini did not return a valid lesson plan." },
    });
  });

  await page.goto("/");
  const textarea = page.getByPlaceholder("Paste a text explanation here...");
  await textarea.fill("some source text");
  await page.getByRole("button", { name: "Generate lesson" }).click();

  await expect(
    page.getByText("Gemini did not return a valid lesson plan.")
  ).toBeVisible();
  await expect(textarea).toHaveValue("some source text");
});
