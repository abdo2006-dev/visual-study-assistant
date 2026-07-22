import { expect, test } from "@playwright/test";

test("a curiosity box is collapsed by default and reveals its answer on click", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load example lesson" }).click();
  await expect(page).toHaveURL(/\/lessons\/.+/);

  const trigger = page.getByRole("button", {
    name: /Why does the sphere behave exactly like a point charge/,
  });
  await expect(trigger).toBeVisible();

  const answer = page.getByText(/Gauss's law only depends on how much charge is enclosed/);
  await expect(answer).toHaveCount(0);

  await trigger.click();
  await expect(answer).toBeVisible();

  await trigger.click();
  await expect(answer).toHaveCount(0);
});

test("asking a why-question in chat adds a persistent, collapsible curiosity box", async ({
  page,
}) => {
  await page.route("**/api/lesson-patch", async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        reply: "Good question — I've added an explanation for that.",
        patches: [
          {
            op: "add-curiosity-question",
            sectionId: "region-inside",
            questionType: "why",
            question: "Why does the field grow linearly instead of staying constant inside?",
            answer:
              "Because the enclosed charge itself grows with r^3 while the Gaussian surface area only grows with r^2, so their ratio — the field — increases in direct proportion to r.",
          },
        ],
      },
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Load example lesson" }).click();
  await expect(page).toHaveURL(/\/lessons\/.+/);

  await page
    .getByPlaceholder("Ask to change this lesson...")
    .fill("why does the field grow linearly inside?");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Good question — I've added an explanation for that.")).toBeVisible();

  const trigger = page.getByRole("button", {
    name: /Why does the field grow linearly instead of staying constant inside/,
  });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByText(/Gaussian surface area only grows with r\^2/)).toBeVisible();

  // Persists across a reload, unlike the transient chat reply.
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: /Why does the field grow linearly instead of staying constant inside/,
    })
  ).toBeVisible();
});
