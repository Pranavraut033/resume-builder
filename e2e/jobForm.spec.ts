import { expect, test } from "@playwright/test";

test.describe("new job form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/job/new");
    // Skip these tests when the dev DB has no base profile yet — that's a
    // separate guard screen, not part of the form under test.
    const guard = page.getByRole("heading", { name: "Base Profile Required" });
    if (await guard.isVisible().catch(() => false)) {
      test.skip();
    }
  });

  test("submit is disabled until a job description is entered", async ({
    page,
  }) => {
    const submit = page.getByRole("button", { name: /Analyze & Start/ });
    await expect(submit).toBeDisabled();

    await page.locator("#description").fill("We are hiring a backend engineer.");

    // Still disabled if no LLM model/provider is selected yet (env-dependent),
    // but the description field itself must register the input either way.
    await expect(page.locator("#description")).toHaveValue(
      "We are hiring a backend engineer."
    );
  });

  test("toggling to 'Fetch from URL' swaps the input for a URL field", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Fetch from URL" }).click();

    await expect(
      page.getByPlaceholder("https://example.com/job-posting")
    ).toBeVisible();

    await page.getByRole("button", { name: "Job Description" }).click();

    await expect(page.locator("#description")).toBeVisible();
  });
});
