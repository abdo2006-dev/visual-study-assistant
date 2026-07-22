import fs from "node:fs";
import path from "node:path";

import { expect, type Locator, test } from "@playwright/test";

const fixturePath = path.join(
  process.cwd(),
  "tests/e2e/fixtures/test-screenshot.png"
);

async function dropFile(locator: Locator, filePath: string, fileName: string) {
  const buffer = fs.readFileSync(filePath);
  const dataTransfer = await locator.page().evaluateHandle(
    ({ base64, name }) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const file = new File([bytes], name, { type: "image/png" });
      const dt = new DataTransfer();
      dt.items.add(file);
      return dt;
    },
    { base64: buffer.toString("base64"), name: fileName }
  );
  await locator.dispatchEvent("drop", { dataTransfer });
}

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
    page.getByText("Drag and drop screenshots, paste them, or choose files")
  ).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(fixturePath);

  await expect(page.getByRole("img", { name: "Uploaded screenshot preview 1" })).toBeVisible();
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
    page.getByRole("img", { name: "Original uploaded screenshot 1" })
  ).toBeVisible();
});

test("supports attaching more than one screenshot in a single extraction", async ({ page }) => {
  await page.route("**/api/extract", async (route) => {
    const body = route.request().postDataJSON() as { images: unknown[] };
    expect(body.images).toHaveLength(2);
    await route.fulfill({
      status: 200,
      json: { markdown: "# Combined\n\nText from both screenshots." },
    });
  });
  await page.route("**/api/lesson-plan", async (route) => {
    await route.fulfill({ status: 200, json: mockLesson });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Upload screenshot" }).click();
  await page.locator('input[type="file"]').setInputFiles([fixturePath, fixturePath]);

  await expect(page.getByRole("img", { name: "Uploaded screenshot preview 1" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Uploaded screenshot preview 2" })).toBeVisible();
  await expect(page.getByText("2 screenshots")).toBeVisible();

  await page.getByRole("button", { name: "Extract text" }).click();
  await expect(page.getByPlaceholder("Paste a text explanation here...")).toHaveValue(
    /Combined/
  );
});

test("keeps accepting drag-and-drop after the first screenshot, not just the file picker", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Upload screenshot" }).click();

  const dropzone = page.locator('[data-slot="screenshot-dropzone"]');
  await dropFile(dropzone, fixturePath, "first.png");
  await expect(page.getByRole("img", { name: "Uploaded screenshot preview 1" })).toBeVisible();

  // Regression check: after the first drop, the component used to switch to
  // a layout with no drop handlers at all, forcing the file picker for
  // every subsequent screenshot.
  await dropFile(page.locator('[data-slot="screenshot-dropzone"]'), fixturePath, "second.png");
  await expect(page.getByRole("img", { name: "Uploaded screenshot preview 2" })).toBeVisible();
  await expect(page.getByText("2 screenshots")).toBeVisible();
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
