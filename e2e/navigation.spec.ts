import { expect, test } from "@playwright/test";

test("navigates from dashboard to settings via the sidebar", async ({
  page,
}) => {
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});

test("job/new shows the resume-tailoring form or the profile-required guard", async ({
  page,
}) => {
  await page.goto("/job/new");

  await expect(
    page
      .getByRole("heading", { name: "Tailor Your Resume" })
      .or(page.getByRole("heading", { name: "Base Profile Required" }))
  ).toBeVisible();
});
