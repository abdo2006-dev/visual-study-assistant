import path from "node:path";

import { expect, test } from "@playwright/test";

const fixturePath = path.join(
  process.cwd(),
  "tests/e2e/fixtures/test-screenshot.png"
);

const mockLesson = {
  schemaVersion: 1,
  id: "e2e-screenshot-lesson",
  title: "From a screenshot",
  subject: "physics",
  source: { kind: "pasted-text", originalText: "placeholder" },
  summary: "A lesson generated from extracted screenshot text.",
  prerequisites: [],
  learningObjectives: [],
  sections: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("uploading a screenshot extracts text, prefills the form, and tags the saved lesson", async ({
  page,
}) => {
  await page.route("**/api/extract", async (route) => {
    await route.fulfill({
      status: 200,
      json: { markdown: "# Extracted Heading\n\nExtracted paragraph text." },
    });
  });
  await page.route("**/api/lesson-plan", async (route) => {
    await route.fulfill({ status: 200, json: mockLesson });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Upload screenshot" }).click();

  await expect(
    page.getByText("Drag and drop a screenshot, paste one, or choose a file")
  ).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(fixturePath);

  await expect(page.getByRole("img", { name: "Uploaded screenshot preview" })).toBeVisible();
  await page.getByRole("button", { name: "Extract text" }).click();

  const textarea = page.getByPlaceholder("Paste a text explanation here...");
  await expect(textarea).toHaveValue(/Extracted Heading/);
  await expect(
    page.getByText("Text extracted from your screenshot")
  ).toBeVisible();

  await page.getByRole("button", { name: "Generate lesson" }).click();
  await expect(page).toHaveURL(/\/lessons\/e2e-screenshot-lesson$/);

  await page.getByText("Original screenshot").click();
  await expect(
    page.getByRole("img", { name: "Original uploaded screenshot" })
  ).toBeVisible();
});

test("rejects an unsupported file type before calling the extract API", async ({ page }) => {
  let extractCalled = false;
  await page.route("**/api/extract", async (route) => {
    extractCalled = true;
    await route.fulfill({ status: 200, json: { markdown: "should not be reached" } });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Upload screenshot" }).click();

  const textFile = Buffer.from("not an image");
  await page.locator('input[type="file"]').setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: textFile,
  });

  await expect(
    page.getByText("Please upload a PNG, JPEG, or WebP image.")
  ).toBeVisible();
  expect(extractCalled).toBe(false);
});
