import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("New Lesson page has no automatically detectable accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("Library page has no automatically detectable accessibility violations", async ({
  page,
}) => {
  await page.goto("/library");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("Import/export page has no automatically detectable accessibility violations", async ({
  page,
}) => {
  await page.goto("/import-export");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("Settings page has no automatically detectable accessibility violations", async ({
  page,
}) => {
  await page.goto("/settings");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("a lesson workspace with the charged-sphere visual has no automatically detectable accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load example lesson" }).click();
  await expect(page).toHaveURL(/\/lessons\/.+/);
  await expect(page.getByLabel("Observation radius r")).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("the mobile lesson-library drawer has no automatically detectable accessibility violations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open lesson library" }).click();
  await expect(page.getByRole("link", { name: "Library" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
