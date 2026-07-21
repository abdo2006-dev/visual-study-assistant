import { expect, test } from "@playwright/test";

test("chatting a change patches the lesson, and undo/redo restore it", async ({ page }) => {
  await page.route("**/api/lesson-patch", async (route) => {
    const body = route.request().postDataJSON();
    const sphereVisual = body.lesson.sections
      .flatMap((s: { visuals: Array<{ id: string; templateId: string }> }) => s.visuals)
      .find((v: { templateId: string }) => v.templateId === "radial-charged-sphere");

    await route.fulfill({
      status: 200,
      json: {
        reply: "Removed the sphere visual.",
        patches: [
          {
            op: "remove-visual",
            sectionId: "interactive-exploration",
            visualId: sphereVisual.id,
          },
        ],
      },
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Load example lesson" }).click();
  await expect(page).toHaveURL(/\/lessons\/.+/);

  const sliderLabel = page.getByLabel("Observation radius r");
  await expect(sliderLabel).toBeVisible();

  const chatInput = page.getByPlaceholder("Ask to change this lesson...");
  await chatInput.fill("remove that visual");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Removed the sphere visual.")).toBeVisible();
  await expect(sliderLabel).toHaveCount(0);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByLabel("Observation radius r")).toBeVisible();

  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByLabel("Observation radius r")).toHaveCount(0);
});

test("one patch failing (e.g. a stale section id) doesn't discard the others in the same batch", async ({
  page,
}) => {
  await page.route("**/api/lesson-patch", async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        reply: "I've added a circuit diagram to that section.",
        patches: [
          {
            op: "add-visual",
            sectionId: "region-outside",
            type: "scientific-diagram",
            templateId: "simple-circuit",
            title: "A circuit",
            educationalPurpose: "test",
            accessibilityDescription: "test",
            parameters: {},
          },
          {
            op: "remove-visual",
            sectionId: "does-not-exist",
            visualId: "also-does-not-exist",
          },
        ],
      },
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Load example lesson" }).click();
  await expect(page).toHaveURL(/\/lessons\/.+/);

  await page.getByPlaceholder("Ask to change this lesson...").fill("add a circuit diagram");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("I've added a circuit diagram to that section.")).toBeVisible();
  // The valid patch still applies even though the other patch in the same
  // response references a section that doesn't exist.
  await expect(page.getByRole("img", { name: /circuit with/ })).toBeVisible();
  // And the failure is surfaced rather than silently swallowed.
  await expect(page.getByText(/1 of 2 changes couldn't be applied/)).toBeVisible();
});

test("chat conversation persists across a page reload", async ({ page }) => {
  await page.route("**/api/lesson-patch", async (route) => {
    await route.fulfill({
      status: 200,
      json: { reply: "Sure thing!", patches: [] },
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Load example lesson" }).click();
  await expect(page).toHaveURL(/\/lessons\/.+/);

  await page.getByPlaceholder("Ask to change this lesson...").fill("hello there");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Sure thing!")).toBeVisible();

  await page.reload();
  await expect(page.getByText("hello there")).toBeVisible();
  await expect(page.getByText("Sure thing!")).toBeVisible();
});
