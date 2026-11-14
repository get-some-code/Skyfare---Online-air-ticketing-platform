import { expect, test } from "@playwright/test";

test("the SkyFare homepage renders its premium sections and promotional privileges", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/SkyFare/);
  await expect(
    page.getByRole("heading", { name: "Your Journey Begins Here" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Promotions & Bank Partnerships" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Popular Destinations" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Why Choose SkyFare" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /SkyFare Privilege Club/ }),
  ).toBeVisible();
  // Trust signals & fleet showcase present
  await expect(page.getByText("500+ Partner Airlines")).toBeVisible();
  await expect(page.getByText("IATA Accredited", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Fleet and cabin interior showcase" })).toBeVisible();
});

test("promotional and bank offers rotate and filter properly", async ({ page }) => {
  await page.goto("/");

  const offersHeading = page.getByRole("heading", { name: "Promotions & Bank Partnerships" });
  await expect(offersHeading).toBeVisible();

  // Test filter pills
  await page.getByRole("tab", { name: "Bank Offers" }).click();
  await expect(page.getByText("HDFC Bank Infinia & Regalia")).toBeVisible();

  await page.getByRole("tab", { name: "First-Time Flyer" }).click();
  await expect(page.getByText("First Time Flyer Welcome")).toBeVisible();
  await expect(page.getByText("SKYFIRST")).toBeVisible();

  // Test copy promo code
  await page.getByRole("button", { name: "Copy code SKYFIRST" }).click();
  await expect(page.getByText("Copied! ✨")).toBeVisible();
});

test("currency and destination filters update the homepage", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("combobox", { name: "Display currency" }).selectOption("USD");
  await expect(page.getByText("$89", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Coastal Retreats" }).click();
  await expect(page.locator(".destination-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Goa", exact: true }),
  ).toBeVisible();
});

test("flight search submits criteria to the refined search results page", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "One-way" }).click();
  await page.getByLabel("Departure date").fill("2035-02-10");

  await page.getByRole("button", { name: /Travellers & class/ }).click();
  await page.getByRole("button", { name: "Add one adult" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("button", { name: /2 Adults/ })).toBeVisible();

  await page.getByRole("button", { name: "Search Flights" }).click();
  await expect(page).toHaveURL(/\/flights\/search\?/, { timeout: 15000 });
  await expect(
    page.getByText("Live flight inventory is being connected"),
  ).toBeVisible();
  await expect(page.locator(".search-bar__route-label")).toHaveText("CCU → DXB");
  await expect(page.getByRole("link", { name: "Modify Search" })).toBeVisible();
});

test("route selection, airport swap, and dialogs are interactive", async ({
  page,
}) => {
  await page.goto("/");

  const origin = page.getByRole("combobox", { name: "Departure city" });
  const destination = page.getByRole("combobox", { name: "Destination city" });
  await page.getByRole("button", { name: "Swap departure and destination" }).click();
  await expect(origin).toHaveValue("DXB - Dubai");
  await expect(destination).toHaveValue("CCU - Kolkata");

  await page.getByRole("button", { name: "My Bookings" }).click();
  await expect(
    page.getByRole("dialog", { name: "Your trips will appear here" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();

  await page.getByRole("button", { name: "Book a flight to Goa" }).click();
  await expect(destination).toHaveValue("GOI - Goa");
  await expect(
    page.getByRole("status").filter({ hasText: "Goa selected as your destination" }),
  ).toBeVisible();
});

test("newsletter submission gives appropriate confirmation", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel("Email address").fill("traveller@example.com");
  await page.locator("#newsletter").getByRole("button", { name: "Join", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "you're on the list" }),
  ).toBeVisible();
});

test("desktop navigation and header controls function properly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.getByLabel("SkyFare home")).toBeVisible();
  // Ensure 3-bars hamburger toggle is strictly NOT visible on desktop
  await expect(page.locator(".site-header__menu-toggle")).not.toBeVisible();

  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("link", { name: "Search Flights" })).toBeVisible();
  await expect(page.getByRole("button", { name: "24/7 Support" })).toBeVisible();

  // Test bookings dialog centering with backdrop overlay
  await nav.getByRole("button", { name: "My Bookings" }).click();
  const bookingsModal = page.getByRole("dialog", { name: "Your trips will appear here" });
  await expect(bookingsModal).toBeVisible();
  await expect(page.locator(".auth-overlay")).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(bookingsModal).not.toBeVisible();

  // Test support dialog
  await page.getByRole("button", { name: "24/7 Support" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("the mobile menu and responsive layout work without horizontal overflow", async ({
  page,
}) => {
  for (const width of [320, 375, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");

    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  }

  await page.getByRole("button", { name: "Open menu" }).click();
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation).toBeVisible();
  await navigation.getByRole("link", { name: "About Us" }).click();
  await expect(page).toHaveURL(/#why-skyfare$/);
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("authentication modal opens and switches between Sign In and Create Account", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Login" }).click();
  const authModal = page.getByRole("dialog");
  await expect(authModal).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign In to Your Account" })).toBeVisible();

  // Switch to Create Account
  await page.getByRole("tab", { name: "Create Account" }).click();
  await expect(page.getByRole("heading", { name: "Create SkyFare Account" })).toBeVisible();
  await expect(page.getByLabel("Full Name")).toBeVisible();

  // Close dialog
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(authModal).not.toBeVisible();
});

test("SkyBot floating robot avatar opens and introduces her luxury aviation concierge interface", async ({
  page,
}) => {
  await page.goto("/");

  const skybotTrigger = page.getByRole("button", { name: "Chat with SkyBot" });
  await expect(skybotTrigger).toBeVisible();

  // Open SkyBot
  await skybotTrigger.click({ force: true });

  const conciergeDialog = page.getByRole("dialog", { name: "SkyFare Executive Concierge Chat" });
  await expect(conciergeDialog).toBeVisible();
  await expect(page.locator(".concierge-title")).toHaveText("SkyBot");
  await expect(page.getByText("Hello! I am SkyBot, your 24/7 personal flight concierge")).toBeVisible();

  // Verify option chips are present in SkyBot's intro
  const delhiOption = page.getByRole("button", { name: "✈️ Delhi to Kolkata Flights" });
  await expect(delhiOption).toBeVisible();

  // Test flight search via input: chennai to kolkata
  const input = page.getByPlaceholder("Ask about flights, baggage, GST, lounges…");
  await input.fill("chennai to kolkata");
  await input.press("Enter");

  // Verify SkyBot immediately outputs prominent flight options without repeating loops
  await expect(page.getByText("Chennai (MAA) → Kolkata (CCU)")).toBeVisible({ timeout: 12000 });
  await expect(page.getByText("IndiGo 6E-6234")).toBeVisible();
  
  // Verify 1-click prominent search link to all live flights on SkyFare
  const searchAllBtn = page.getByRole("button", { name: /View All 24\+ MAA → CCU Flights/i });
  await expect(searchAllBtn).toBeVisible();

  // Clicking it takes the user to /flights/search with route preserved
  await searchAllBtn.click();
  await expect(page).toHaveURL(/.*\/flights\/search\?origin=MAA&destination=CCU/);

  // Return to homepage
  await page.goto("/");
});

test("mobile flight search allows searching places and suggests international airports cleanly", async ({
  page,
}) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const departurePlaceBtn = page.getByRole("button", {
    name: "Search departure places and international airports",
  });
  await expect(departurePlaceBtn).toBeVisible();

  // Open Airport Search Modal
  await departurePlaceBtn.click();
  const airportModal = page.getByRole("dialog", {
    name: /Select Departure Airport/i,
  });
  await expect(airportModal).toBeVisible();

  // Test place search: e.g. London
  const searchInput = page.getByPlaceholder(
    /Search place, city, country, or code/i,
  );
  await searchInput.fill("London");

  // Verify international London airports are suggested (LHR, LGW)
  const lhrOption = airportModal.getByRole("button", { name: /Heathrow Airport/i });
  await expect(lhrOption).toBeVisible();

  // Select LHR
  await lhrOption.click();
  await expect(airportModal).not.toBeVisible();

  const originInput = page.getByRole("combobox", { name: "Departure city" });
  await expect(originInput).toHaveValue("LHR - London");

  // Test Destination place search: e.g. Tokyo
  const destPlaceBtn = page.getByRole("button", {
    name: "Search destination places and international airports",
  });
  await destPlaceBtn.click();
  const destModal = page.getByRole("dialog", {
    name: /Select Destination Airport/i,
  });
  await expect(destModal).toBeVisible();

  await destModal.getByPlaceholder(/Search place, city, country, or code/i).fill("Tokyo");
  const hndOption = destModal.getByRole("button", { name: /Tokyo Haneda Airport/i });
  await expect(hndOption).toBeVisible();
  await hndOption.click();
  await expect(destModal).not.toBeVisible();

  const destInput = page.getByRole("combobox", { name: "Destination city" });
  await expect(destInput).toHaveValue("HND - Tokyo");
});
