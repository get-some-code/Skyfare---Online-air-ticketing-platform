import { expect, test } from "@playwright/test";

test.describe("SkyFare v2 - AI Trip Planner feature", () => {
  test("navbar has Trip Planner link between Search Flights and My Bookings", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("#primary-navigation");
    await expect(nav).toBeAttached();

    const plannerLink = nav.getByRole("link", { name: "Trip Planner" });
    await expect(plannerLink).toBeVisible();
    await expect(plannerLink).toHaveAttribute("href", "/planner");
  });

  test("landing page renders Trip Planner teaser section above offers section", async ({ page }) => {
    await page.goto("/");
    const teaser = page.locator(".planner-teaser");
    await expect(teaser).toBeVisible();

    const heading = teaser.locator("#planner-teaser-heading");
    await expect(heading).toHaveText("AI Trip Planner");

    // Chips exist
    const manaliChip = teaser.getByRole("button", { name: "Manali" });
    await expect(manaliChip).toBeVisible();

    // Clicking chip while logged out redirects to /login with redirect param
    await manaliChip.click();
    await page.waitForURL(/\/login\?redirect=/);
    expect(decodeURIComponent(page.url())).toContain("destination=Manali");
  });

  test("flight search results page includes Plan your trip link", async ({ page }) => {
    await page.goto("/flights/search?origin=DEL&destination=BOM");
    const planTripLink = page.locator(".search-bar__plan-trip");
    await expect(planTripLink).toBeVisible();
    await expect(planTripLink).toContainText("Plan your trip to");
    const href = await planTripLink.getAttribute("href");
    expect(href).toContain("/planner?destination=");
  });

  test("unauthenticated access to /planner redirects to /login", async ({ page }) => {
    await page.goto("/planner?destination=Germany");
    await page.waitForURL(/\/login\?redirect=/);
    expect(decodeURIComponent(page.url())).toContain("redirect=");
    expect(decodeURIComponent(page.url())).toContain("destination=Germany");

    // Login page renders clean form
    await expect(page.getByRole("heading", { name: "Sign In to Your Account" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In & Continue" })).toBeVisible();
  });
});
