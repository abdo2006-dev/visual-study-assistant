import { expect, test } from "@playwright/test";

const mockLesson = {
  schemaVersion: 1,
  id: "e2e-usage-lesson",
  title: "Usage tracking test lesson",
  subject: "physics",
  source: { kind: "pasted-text", originalText: "test input" },
  summary: "A mocked lesson used to test API usage logging.",
  prerequisites: [],
  learningObjectives: [],
  sections: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("shows no logged calls before any AI request has been made", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText("No AI calls logged yet on this device.")).toBeVisible();
});

test("logs usage from a lesson-plan response and shows it in Settings", async ({ page }) => {
  await page.route("**/api/lesson-plan", async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        ...mockLesson,
        apiUsage: [
          {
            model: "gemini-flash-lite-latest",
            promptTokens: 120,
            candidatesTokens: 340,
            thoughtsTokens: 0,
            totalTokens: 460,
          },
        ],
      },
    });
  });

  await page.goto("/");
  await page
    .getByPlaceholder("Paste a text explanation here...")
    .fill("Some source text for usage tracking.");
  await page.getByRole("button", { name: "Generate lesson" }).click();
  await expect(page).toHaveURL(/\/lessons\/e2e-usage-lesson$/);

  await page.goto("/settings");
  await expect(page.getByRole("cell", { name: "gemini-flash-lite-latest" })).toBeVisible();
  await expect(page.getByText("460", { exact: false })).toBeVisible();
});
