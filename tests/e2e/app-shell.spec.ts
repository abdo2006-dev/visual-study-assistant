import { expect, test } from "@playwright/test";

test("home page renders the app shell and new-lesson form", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle("EduViz");
  await expect(
    page.getByRole("complementary", { name: "Lesson library" }).getByText("EduViz")
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "New lesson" })
  ).toBeVisible();
  await expect(
    page.getByPlaceholder("Paste a text explanation here...")
  ).toBeVisible();
});

test("sidebar navigation reaches the library, settings and import/export pages", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Library" }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();

  await page.getByRole("link", { name: "Bulk import" }).click();
  await expect(page).toHaveURL(/\/bulk-import$/);
  await expect(page.getByRole("heading", { name: "Bulk import" })).toBeVisible();

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  await page.getByRole("link", { name: "Import / export" }).click();
  await expect(page).toHaveURL(/\/import-export$/);
  await expect(
    page.getByRole("heading", { name: "Import / export" })
  ).toBeVisible();
});

test("theme toggle switches between light and dark", async ({ page }) => {
  await page.goto("/");

  const html = page.locator("html");
  const toggle = page.getByRole("button", { name: "Toggle theme" });

  await toggle.click();
  const firstClass = await html.getAttribute("class");

  await toggle.click();
  const secondClass = await html.getAttribute("class");

  expect(firstClass).not.toBe(secondClass);
});
