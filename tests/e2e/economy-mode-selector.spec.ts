import { expect, test } from "@playwright/test";

test("defaults to Automatic and lets the user pin a specific mode", async ({ page }) => {
  await page.goto("/settings");

  const automatic = page.getByRole("radio", { name: /Automatic \(recommended\)/ });
  const highestQuality = page.getByRole("radio", { name: /Highest quality/ });
  await expect(automatic).toBeChecked();

  await highestQuality.check();
  await expect(highestQuality).toBeChecked();

  // The choice is persisted client-side and should survive a reload.
  await page.reload();
  await expect(page.getByRole("radio", { name: /Highest quality/ })).toBeChecked();
});

test("a pinned mode is sent as an override on new lesson requests", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("radio", { name: /^Economical/ }).check();

  let sentMode: string | undefined;
  await page.route("**/api/lesson-plan", async (route) => {
    sentMode = route.request().postDataJSON()?.mode;
    await route.fulfill({
      status: 200,
      json: {
        schemaVersion: 1,
        id: "override-lesson",
        title: "Override test",
        subject: "physics",
        source: { kind: "pasted-text", originalText: "x" },
        summary: "A generated lesson.",
        prerequisites: [],
        learningObjectives: [],
        sections: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });
  });

  await page.goto("/");
  await page.getByPlaceholder("Paste a text explanation here...").fill("Some source text.");
  await page.getByRole("button", { name: "Generate lesson" }).click();
  await expect(page).toHaveURL(/\/lessons\/override-lesson$/);

  expect(sentMode).toBe("economical");
});
