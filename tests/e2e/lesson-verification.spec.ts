import { expect, test } from "@playwright/test";

test("running a lesson check shows the advisory summary and any issues", async ({ page }) => {
  await page.route("**/api/verify-lesson", async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        checkedAt: "2026-01-01T00:00:00.000Z",
        summary: "Found one inconsistency.",
        issues: [
          {
            category: "conflicting-direction",
            description: "The explanation and the equation disagree on direction.",
            sectionId: "region-inside",
          },
        ],
      },
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Load example lesson" }).click();
  await expect(page).toHaveURL(/\/lessons\/.+/);

  await page.getByRole("button", { name: "Run check" }).click();
  await expect(page.getByText("Found one inconsistency.")).toBeVisible();
  await expect(
    page.getByText("The explanation and the equation disagree on direction.")
  ).toBeVisible();
  await expect(page.getByText("conflicting direction")).toBeVisible();
});
