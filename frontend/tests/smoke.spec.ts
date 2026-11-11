import { expect, test } from "@playwright/test";

test("the SkyFare homepage renders its sections", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/SkyFare/);
  await expect(
    page.getByRole("heading", { name: "Your Journey Begins Here" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Popular Destinations" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Why Choose SkyFare" }),
  ).toBeVisible();
  await expect(
    page.getByText("no live availability or bookings", { exact: false }),
  ).toBeVisible();
});

test("currency and destination filters update the homepage", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("combobox", { name: "Display currency" }).selectOption("USD");
  await expect(page.getByText("$89", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Coastal Retreats" }).click();
  await expect(page.locator(".destination-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Goa", exact: true }),
  ).toBeVisible();
});

test("flight search submits criteria to the non-live search preview", async ({
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
  await expect(page).toHaveURL(/\/flights\/search\?/);
  await expect(
    page.getByText("No live flight search has been performed."),
  ).toBeVisible();
  await expect(page.getByText("CCU → DXB")).toBeVisible();
});

test("route selection, airport swap, and preview dialogs are interactive", async ({
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

  await page.getByRole("button", { name: "Use Goa as the destination" }).click();
  await expect(destination).toHaveValue("GOI - Goa");
  await expect(
    page.getByRole("status").filter({ hasText: "Goa selected as your destination" }),
  ).toBeVisible();
});

test("newsletter preview does not claim to save a subscriber", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel("Email address").fill("traveller@example.com");
  await page.getByRole("button", { name: "Join" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "your email was not saved" }),
  ).toBeVisible();
});

test("the mobile menu works without horizontal page overflow", async ({
  page,
}) => {
  for (const width of [320, 390]) {
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
