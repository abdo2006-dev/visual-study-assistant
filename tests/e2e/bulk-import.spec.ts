import { expect, test } from "@playwright/test";

const SOURCE_TEXT =
  "Gauss's law relates electric flux to enclosed charge. A dipole consists of two equal and opposite charges separated by a small distance.";

function mockLessonFor(title: string, id: string) {
  return {
    schemaVersion: 1,
    id,
    title,
    subject: "physics",
    source: { kind: "pasted-text", originalText: "x" },
    summary: "A generated lesson.",
    prerequisites: [],
    learningObjectives: [],
    sections: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("proposes lessons, lets the user exclude one, and generates the rest", async ({ page }) => {
  await page.route("**/api/bulk-import-plan", async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        lessons: [
          { title: "Gauss's Law", sourceText: "Gauss's law relates electric flux to enclosed charge." },
          {
            title: "Electric Dipoles",
            topic: "Electrostatics",
            sourceText:
              "A dipole consists of two equal and opposite charges separated by a small distance.",
          },
        ],
      },
    });
  });

  let lessonPlanCalls = 0;
  await page.route("**/api/lesson-plan", async (route) => {
    lessonPlanCalls += 1;
    await route.fulfill({
      status: 200,
      json: mockLessonFor("Generated title (ignored)", `bulk-lesson-${lessonPlanCalls}`),
    });
  });

  await page.goto("/bulk-import");
  await page
    .getByPlaceholder("Paste a large block of study material here — several topics' worth is fine...")
    .fill(SOURCE_TEXT);
  await page.getByRole("button", { name: "Propose lessons" }).click();

  await expect(page.getByText("Proposed 2 lessons from your text.")).toBeVisible();
  const titleInputs = page.getByRole("textbox", { name: "Lesson title" });
  await expect(titleInputs.nth(0)).toHaveValue("Gauss's Law");
  await expect(titleInputs.nth(1)).toHaveValue("Electric Dipoles");

  // Exclude the dipoles lesson.
  await page.getByRole("checkbox", { name: 'Include "Electric Dipoles"' }).uncheck();
  await expect(page.getByRole("button", { name: "Generate 1 lesson" })).toBeVisible();

  await page.getByRole("button", { name: "Generate 1 lesson" }).click();

  await expect(page.getByText("Generated 1 of 1 lesson.")).toBeVisible();
  await expect(page.getByRole("link", { name: "View" })).toBeVisible();
  expect(lessonPlanCalls).toBe(1);

  // The user's edited title is preserved, not the (mocked) generated one.
  await expect(page.getByText("Gauss's Law", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "View" }).click();
  await expect(page).toHaveURL(/\/lessons\/bulk-lesson-1$/);
});

test("shows a per-lesson error but still completes the rest of the batch", async ({ page }) => {
  await page.route("**/api/bulk-import-plan", async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        lessons: [
          { title: "Lesson A", sourceText: "Gauss's law relates electric flux to enclosed charge." },
          {
            title: "Lesson B",
            sourceText:
              "A dipole consists of two equal and opposite charges separated by a small distance.",
          },
        ],
      },
    });
  });

  let call = 0;
  await page.route("**/api/lesson-plan", async (route) => {
    call += 1;
    if (call === 1) {
      await route.fulfill({ status: 502, json: { error: "Gemini did not return valid output." } });
    } else {
      await route.fulfill({ status: 200, json: mockLessonFor("B", "bulk-lesson-b") });
    }
  });

  await page.goto("/bulk-import");
  await page
    .getByPlaceholder("Paste a large block of study material here — several topics' worth is fine...")
    .fill(SOURCE_TEXT);
  await page.getByRole("button", { name: "Propose lessons" }).click();
  await page.getByRole("button", { name: "Generate 2 lessons" }).click();

  await expect(page.getByText("Generated 1 of 2 lessons.")).toBeVisible();
  await expect(page.getByText("Gemini did not return valid output.")).toBeVisible();
  await expect(page.getByRole("link", { name: "View" })).toBeVisible();
});
