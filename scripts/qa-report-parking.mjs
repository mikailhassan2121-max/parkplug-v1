import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const API_BASE = "http://127.0.0.1:4000";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  geolocation: { latitude: 37.7749, longitude: -122.4194 },
  permissions: ["geolocation"],
});
const page = await context.newPage();

const steps = [];
function check(label, ok, detail = "") {
  steps.push(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
}

try {
  // Anonymous visitors should see the sign-in gate immediately, not five
  // steps of a wizard that fails only at the very end.
  await page.goto(`${BASE}/report-parking`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  check(
    "Anonymous visitor sees the sign-in gate, not the wizard",
    (await page.getByRole("heading", { name: "Sign in to continue" }).count()) > 0,
  );

  // Reporting requires an account (POST /reports requires auth) — sign up
  // first so the wizard itself is under test, not the auth gate.
  const email = `report-qa-${Date.now()}@example.com`;
  await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.getByLabel("Full name").fill("Report QA");
  await page.getByLabel("Email", { exact: false }).first().fill(email);
  await page.getByLabel("Password", { exact: false }).first().fill("StrongPass99");
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.waitForURL("**/verify-email**", { timeout: 15000 });

  // --- Combobox: typing should never spin forever, and should show a real
  // state (matches, "no matches", or "lookup unavailable") — never nothing.
  await page.goto(`${BASE}/report-parking`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  check("Signed-in user reaches the report wizard (no auth wall)", (await page.getByText("Where is the parking?").count()) > 0);
  const addressBox = page.getByLabel("Search an address");
  await addressBox.fill("this is not a real address asdkjqwlekj");
  await page.waitForTimeout(2500); // debounce (350ms) + request + this sandbox's proxy timeout

  const spinnerCount = await page.locator('svg[aria-hidden="true"]').locator("visible=true").count();
  const stillSpinning = await page.evaluate(() => {
    const spinner = document.querySelector(".animate-spin-slow");
    return spinner ? getComputedStyle(spinner).display !== "none" : false;
  });
  check("Address combobox spinner resolves (does not spin forever)", !stillSpinning);

  const noMatchesShown = await page.getByText(/No matches for/i).count();
  const lookupUnavailableShown = await page.getByText(/Address lookup is unavailable/i).count();
  check(
    "Combobox shows a real empty/error state, not silence",
    noMatchesShown > 0 || lookupUnavailableShown > 0,
    noMatchesShown > 0 ? "showed 'No matches'" : lookupUnavailableShown > 0 ? "showed 'lookup unavailable'" : "showed NOTHING",
  );

  // --- Full 5-step wizard via "Use my current location" (does not depend on
  // Nominatim, which this sandbox's own network policy blocks outright —
  // real users' browsers reach it fine; this proves the rest of the wizard).
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Use my current location" }).click();
  await page.waitForTimeout(800);
  const mapShown = await page.locator('[aria-label*="fine-tune"]').count();
  check("'Use my current location' sets a location and shows the map", mapShown > 0);

  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(300);
  check("Step 1 -> 2 advances (location step no longer blocks)", (await page.getByText("What did you see?").count()) > 0);

  await page.getByLabel("Number of spaces you saw").fill("2");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(300);
  check("Step 2 -> 3 advances", (await page.getByText("What do the signs say?").count()) > 0);

  await page.getByText("No restrictions posted", { exact: false }).first().click().catch(() => {});
  // Fall back to whatever the first restriction pill is if the label differs.
  const restrictionPills = page.locator('button:has-text("unknown"), button:has-text("None")');
  if ((await restrictionPills.count()) > 0) await restrictionPills.first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(300);
  const onStep4 = (await page.getByText("Add a photo or note").count()) > 0;
  check("Step 3 -> 4 advances", onStep4);

  if (onStep4) {
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForTimeout(300);
    check("Step 4 -> 5 (Review) advances", (await page.getByText("Review your report").count()) > 0);

    await page.getByRole("button", { name: "Submit report" }).click();
    await page.waitForTimeout(2000);
    const confirmed = await page.getByText("Thanks — your report is live").count();
    check("Report submits successfully", confirmed > 0);

    if (confirmed > 0) {
      // Verify it is genuinely persisted server-side, not just local UI state.
      const reportsInDb = await page.evaluate(async (apiBase) => {
        const res = await fetch(`${apiBase}/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: "",
            center: { lat: 37.7749, lng: -122.4194 },
            sort: "recommended",
            filters: { includePaid: false, includeFree: true, availableNow: false, parkingTypes: [], amenities: [], instantBookOnly: false },
          }),
        });
        const body = await res.json();
        return body.reports?.length ?? 0;
      }, API_BASE);
      check("Submitted report is retrievable via /search (real persistence)", reportsInDb > 0, `${reportsInDb} report(s) found nearby`);
    }
  }
} catch (error) {
  steps.push(`FAIL  aborted — ${error.message.split("\n")[0]}`);
}

await browser.close();

console.log("\n=== REPORT-PARKING WIZARD RESULTS ===");
steps.forEach((s) => console.log(" " + s));
const failures = steps.filter((s) => s.startsWith("FAIL")).length;
console.log(`\n${steps.length - failures}/${steps.length} passed`);
