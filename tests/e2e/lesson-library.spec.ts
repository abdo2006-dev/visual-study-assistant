import { expect, test } from "@playwright/test";

test("a loaded example lesson survives a full page refresh and can be deleted", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Load example lesson" }).click();
  await expect(page).toHaveURL(/\/lessons\/.+/);
  await expect(
    page.getByRole("heading", {
      name: "Potential of a Uniformly Charged Solid Sphere",
    })
  ).toBeVisible();

  const lessonUrl = page.url();

  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Potential of a Uniformly Charged Solid Sphere",
    })
  ).toBeVisible();

  await page.goto("/library");
  await expect(
    page.getByRole("main").getByRole("link", {
      name: "Potential of a Uniformly Charged Solid Sphere",
    })
  ).toBeVisible();

  await page.goto(lessonUrl);
  await page.getByRole("button", { name: "Delete lesson" }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(
    page.getByText("No saved lessons yet.")
  ).toBeVisible();
});

test("export then import round-trips a lesson", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load example lesson" }).click();
  await expect(page).toHaveURL(/\/lessons\/.+/);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();

  await page.getByRole("button", { name: "Delete lesson" }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByText("No saved lessons yet.")).toBeVisible();

  await page.goto("/import-export");
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose file to import" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path!);

  await expect(page.getByText(/Imported 1 lesson/)).toBeVisible();

  await page.goto("/library");
  await expect(
    page.getByRole("main").getByRole("link", {
      name: "Potential of a Uniformly Charged Solid Sphere",
    })
  ).toBeVisible();
});
