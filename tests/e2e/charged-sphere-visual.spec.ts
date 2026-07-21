import { expect, test } from "@playwright/test";

test("the charged-sphere visual updates region, equations, and caption as the slider moves", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load example lesson" }).click();
  await expect(page).toHaveURL(/\/lessons\/.+/);

  const slider = page.getByLabel("Observation radius r");
  await expect(slider).toBeVisible();

  // Default is inside the sphere. The widget's own region label includes
  // "(r = ...)", distinguishing it from the static section heading/caption
  // text that also contain "Inside the sphere".
  const regionLabel = page.getByText(/^Inside the sphere \(r = /);
  await expect(regionLabel).toBeVisible();
  await expect(page.getByText(/reaching its maximum at the surface/)).toBeVisible();

  // Move well outside the sphere.
  await slider.fill("1.8");
  await expect(page.getByText(/^Outside the sphere \(r = /)).toBeVisible();
  await expect(page.getByText(/behaves like a point charge/)).toBeVisible();

  // The equation panel should now show the outside E(r) formula. KaTeX's
  // MathML annotation is intentionally screen-reader-only (not visible),
  // so check attachment/content rather than visibility.
  const katexAnnotations = page.locator('annotation[encoding="application/x-tex"]');
  await expect(katexAnnotations.filter({ hasText: "r^2" }).first()).toBeAttached();

  // Move back to the center.
  await slider.fill("0");
  await expect(page.getByText(/^Inside the sphere \(r = /)).toBeVisible();
});
