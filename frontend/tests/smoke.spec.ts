import { expect, test } from "@playwright/test";

test("the SkyFare foundation page renders", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("SkyFare");
  await expect(
    page.getByRole("heading", { name: "Platform foundation" }),
  ).toBeVisible();
});
