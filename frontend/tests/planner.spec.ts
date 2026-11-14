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

  test("planner page displays chips immediately for authenticated user and completes interactive flow", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "usr_123",
          email: "test@example.com",
          full_name: "John Doe",
          tier: "Executive Commercial",
          is_active: true,
          is_admin: false,
          created_at: "2026-01-01T00:00:00Z",
        }),
      });
    });

    // Inject auth session
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.setItem("skyfare_access_token", "test_token");
      localStorage.setItem("skyfare_refresh_token", "test_refresh_token");
      localStorage.setItem(
        "skyfare_user_profile",
        JSON.stringify({
          id: "usr_123",
          email: "test@example.com",
          full_name: "John Doe",
        }),
      );
    });

    await page.goto("/planner");
    await expect(page.getByText("Where would you like to travel?")).toBeVisible();

    // Verify destination chips are visible immediately without delay
    const manaliChip = page.getByRole("button", { name: "Manali" });
    await expect(manaliChip).toBeVisible();

    // Click Manali chip
    await manaliChip.click();

    // Verify next question asks for origin city with chips
    await expect(page.getByText(/Which city will you be departing from/i)).toBeVisible();
    const kolkataChip = page.getByRole("button", { name: "Kolkata" });
    await expect(kolkataChip).toBeVisible();
    await kolkataChip.click();

    // Verify duration question and chips
    await expect(page.getByText(/How many days/i)).toBeVisible();
    const fiveDaysChip = page.getByRole("button", { name: "5 Days" });
    await expect(fiveDaysChip).toBeVisible();
    await fiveDaysChip.click();

    // Verify budget question and chips
    await expect(page.getByText(/budget level/i)).toBeVisible();
    const midRangeChip = page.getByRole("button", { name: "Mid-range" });
    await expect(midRangeChip).toBeVisible();
    await midRangeChip.click();

    // Ready to generate
    const generateBtn = page.getByRole("button", { name: /Generate Complete Itinerary/i });
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // Result view displays itinerary, budget, and search flights link
    await expect(page.getByRole("heading", { name: /Itinerary/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("link", { name: /Search Flights for this Trip/i }).first()).toBeVisible();
  });
});
