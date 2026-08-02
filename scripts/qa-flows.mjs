import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({
  // Falls back to Playwright's own download when CHROMIUM_PATH is unset.
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ["--no-sandbox"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
// No egress to tiles/geocoder from this sandbox.
await context.route("**tile.openstreetmap.org/**", (r) => r.abort());
const page = await context.newPage();

const steps = [];
function check(label, ok, detail = "") {
  steps.push(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
}

try {
  /* ---------------------------- Account flow ---------------------------- */
  await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.getByLabel("Full name").fill("Jordan Vega");
  await page.getByLabel("Email", { exact: false }).first().fill("jordan@example.com");
  await page.getByLabel("Password", { exact: false }).first().fill("StrongPass99");
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.waitForURL("**/verify-email**", { timeout: 15000 });
  check("Sign up creates an account and routes to email verification", true);

  /* --------------------------- Dashboard gate --------------------------- */
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const welcome = await page.getByRole("heading", { name: /Welcome back, Jordan/i }).count();
  check("Dashboard recognises the signed-in user", welcome > 0);

  const emptyReservations = await page
    .getByText("You have no upcoming reservations.")
    .count();
  check("Dashboard shows an honest empty reservations state", emptyReservations > 0);

  /* ------------------------------ Vehicles ------------------------------ */
  await page.goto(`${BASE}/dashboard/vehicles`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Add vehicle" }).first().click();
  await page.waitForTimeout(500);
  await page.getByLabel("Make").fill("Toyota");
  await page.getByLabel("Model").fill("Corolla");
  await page.getByLabel("Color").fill("Silver");
  await page.getByLabel("License plate").fill("ABC1234");
  await page.getByLabel("State or jurisdiction").fill("NJ");
  await page.getByLabel("Vehicle size").selectOption("standard");
  await page.getByRole("button", { name: "Add vehicle" }).last().click();
  await page.waitForTimeout(1200);
  const vehicleSaved = await page.getByText("Silver Toyota Corolla").count();
  check("Vehicle can be added and appears in the list", vehicleSaved > 0);

  /* --------------------------- Listing wizard --------------------------- */
  await page.goto(`${BASE}/host/listings/new`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);

  // Step 1 — location. Geocoding is unavailable offline, so assert the
  // wizard blocks rather than silently accepting an unlocated listing.
  await page.getByLabel("Street address").fill("142 Main Street");
  await page.getByLabel("City").fill("Chatham");
  await page.getByLabel("State").fill("NJ");
  await page.getByLabel("ZIP code").fill("07928");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(600);
  const blockedWithoutPin = await page.getByText("Confirm the location on the map.").count();
  check("Wizard blocks step 1 until the location is confirmed", blockedWithoutPin > 0);

  /* ------------------------------- Search ------------------------------- */
  await page.goto(`${BASE}/search?q=Chatham&lat=40.7407&lng=-74.3846`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1800);
  const noResults = await page.getByText("No parking matches your current search.").count();
  check("Search renders an honest no-results state with no data", noResults > 0);
  const expandAction = await page.getByRole("button", { name: "Expand search area" }).count();
  check("No-results state offers recovery actions", expandAction > 0);

  /* -------------------------- Report free parking ----------------------- */
  await page.goto(`${BASE}/report-parking`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(600);
  const reportBlocked = await page
    .getByText("Choose where the parking is, or use your current location.")
    .count();
  check("Report flow blocks submission without a location", reportBlocked > 0);

  /* ------------------------------ Support ------------------------------- */
  await page.goto(`${BASE}/support`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByLabel("What is this about?").selectOption("Booking issue");
  await page.getByLabel("Your name").fill("Jordan Vega");
  await page.getByLabel("Email", { exact: false }).first().fill("jordan@example.com");
  await page
    .getByLabel("What happened?")
    .fill("Testing that the support form submits and returns a ticket reference.");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.waitForTimeout(2000);
  const ticket = await page.getByRole("heading", { name: /We have your message/i }).count();
  check("Support form submits and returns a ticket reference", ticket > 0);

  /* ------------------------- Keyboard accessibility --------------------- */
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.keyboard.press("Tab");
  const skipLink = await page.evaluate(() => document.activeElement?.textContent?.trim());
  check("First Tab reaches the skip link", skipLink === "Skip to main content", skipLink);

  /* ------------------------------ Sign out ------------------------------ */
  await page.goto(`${BASE}/dashboard/settings`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const settingsLoaded = await page.getByRole("heading", { name: "Account settings" }).count();
  check("Account settings loads for the signed-in user", settingsLoaded > 0);
} catch (error) {
  steps.push(`FAIL  flow aborted — ${error.message.split("\n")[0]}`);
}

await browser.close();

console.log("\n=== FLOW RESULTS ===");
steps.forEach((s) => console.log(" " + s));
const failures = steps.filter((s) => s.startsWith("FAIL")).length;
console.log(`\n${steps.length - failures}/${steps.length} passed`);
