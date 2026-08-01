import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.QA_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = process.env.QA_SCREENSHOT_DIR ?? "screenshots";
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ["home", "/"],
  ["search", "/search"],
  ["how-it-works", "/how-it-works"],
  ["pricing", "/pricing"],
  ["about", "/about"],
  ["safety", "/safety"],
  ["hosting-guide", "/hosting-guide"],
  ["help", "/help"],
  ["support", "/support"],
  ["accessibility", "/accessibility"],
  ["report-parking", "/report-parking"],
  ["signin", "/signin"],
  ["signup", "/signup"],
  ["forgot-password", "/forgot-password"],
  ["verify-email", "/verify-email"],
  ["dashboard", "/dashboard"],
  ["dashboard-reservations", "/dashboard/reservations"],
  ["dashboard-saved", "/dashboard/saved"],
  ["dashboard-vehicles", "/dashboard/vehicles"],
  ["dashboard-settings", "/dashboard/settings"],
  ["notifications", "/notifications"],
  ["messages", "/messages"],
  ["host", "/host"],
  ["host-listings", "/host/listings"],
  ["host-listing-new", "/host/listings/new"],
  ["host-calendar", "/host/calendar"],
  ["host-reservations", "/host/reservations"],
  ["host-earnings", "/host/earnings"],
  ["host-payouts", "/host/payouts"],
  ["host-settings", "/host/settings"],
  ["legal-terms", "/legal/terms"],
  ["legal-privacy", "/legal/privacy"],
  ["legal-cancellation", "/legal/cancellation"],
  ["not-found", "/this-page-does-not-exist"],
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

// Extra narrow/tablet widths get an overflow check only, not screenshots.
const OVERFLOW_WIDTHS = [320, 375, 430, 768, 1024];

const problems = [];

const browser = await chromium.launch({
  // Falls back to Playwright's own download when CHROMIUM_PATH is unset.
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ["--no-sandbox"],
});

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    // Block map tiles: the sandbox has no egress to the tile host, and a
    // pending request would otherwise hold up networkidle.
    permissions: [],
  });

  await context.route("**tile.openstreetmap.org/**", (route) => route.abort());
  await context.route("**nominatim.openstreetmap.org/**", (route) => route.abort());

  const page = await context.newPage();

  for (const [name, path] of ROUTES) {
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    try {
      const response = await page.goto(`${BASE}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      // Let client components settle (session resolution, skeleton -> state).
      await page.waitForTimeout(1400);

      const status = response?.status() ?? 0;
      if (status >= 500) problems.push(`${name} [${viewport.name}] HTTP ${status}`);

      const overflow = await page.evaluate(() => {
        const de = document.documentElement;
        return { scrollW: de.scrollWidth, clientW: de.clientWidth };
      });
      if (overflow.scrollW > overflow.clientW + 1) {
        problems.push(
          `${name} [${viewport.name}] horizontal overflow: ${overflow.scrollW} > ${overflow.clientW}`,
        );
      }

      // Images that failed to resolve.
      const brokenImages = await page.evaluate(() =>
        Array.from(document.images)
          .filter((img) => img.complete && img.naturalWidth === 0)
          .map((img) => img.currentSrc || img.src),
      );
      if (brokenImages.length) {
        problems.push(`${name} [${viewport.name}] broken images: ${brokenImages.join(", ")}`);
      }

      // Images with no alt attribute at all (empty alt is valid for decorative).
      const missingAlt = await page.evaluate(() =>
        Array.from(document.images).filter((img) => !img.hasAttribute("alt")).length,
      );
      if (missingAlt > 0) {
        problems.push(`${name} [${viewport.name}] ${missingAlt} image(s) missing alt attribute`);
      }

      // Exactly one h1 per page.
      const h1Count = await page.evaluate(() => document.querySelectorAll("h1").length);
      if (h1Count !== 1) {
        problems.push(`${name} [${viewport.name}] has ${h1Count} h1 elements (expected 1)`);
      }

      // Buttons and links with no accessible name.
      const unnamed = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll("button, a[href]"));
        return nodes.filter((el) => {
          if (el.getAttribute("aria-hidden") === "true") return false;
          const label =
            el.getAttribute("aria-label") ||
            el.getAttribute("title") ||
            el.textContent?.trim() ||
            "";
          return label.length === 0;
        }).length;
      });
      if (unnamed > 0) {
        problems.push(`${name} [${viewport.name}] ${unnamed} control(s) with no accessible name`);
      }

      if (consoleErrors.length) {
        problems.push(`${name} [${viewport.name}] console: ${consoleErrors.slice(0, 2).join(" | ")}`);
      }
      if (pageErrors.length) {
        problems.push(`${name} [${viewport.name}] pageerror: ${pageErrors.slice(0, 2).join(" | ")}`);
      }

      await page.screenshot({
        path: `${OUT}/${viewport.name}-${name}.png`,
        fullPage: false,
      });
    } catch (error) {
      problems.push(`${name} [${viewport.name}] FAILED: ${error.message}`);
    }

    page.removeAllListeners("console");
    page.removeAllListeners("pageerror");
  }

  await context.close();
}

// Overflow sweep across the remaining breakpoints.
const sweepContext = await browser.newContext();
await sweepContext.route("**tile.openstreetmap.org/**", (r) => r.abort());
const sweepPage = await sweepContext.newPage();
for (const width of OVERFLOW_WIDTHS) {
  await sweepPage.setViewportSize({ width, height: 800 });
  for (const [name, path] of ROUTES) {
    try {
      await sweepPage.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 20000 });
      await sweepPage.waitForTimeout(500);
      const o = await sweepPage.evaluate(() => ({
        s: document.documentElement.scrollWidth,
        c: document.documentElement.clientWidth,
      }));
      if (o.s > o.c + 1) problems.push(`${name} @${width}px overflow: ${o.s} > ${o.c}`);
    } catch (error) {
      problems.push(`${name} @${width}px FAILED: ${error.message}`);
    }
  }
}
await sweepContext.close();
await browser.close();

console.log("\n=== QA RESULTS ===");
if (problems.length === 0) {
  console.log("No problems found.");
} else {
  console.log(`${problems.length} problem(s):`);
  problems.forEach((p) => console.log(" - " + p));
}
