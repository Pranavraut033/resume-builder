import { expect, test } from "@playwright/test";

test("loads the job dashboard", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Job Dashboard" })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Quick Draft" })).toBeVisible();
});

test("Quick Draft navigates to the new job page", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Quick Draft" }).click();

  await expect(page).toHaveURL(/\/job\/new/);
});
