import { chromium } from "playwright";

// Use "localhost", not "127.0.0.1" — the API's CORS_ORIGIN and the cookie's
// domain are origin-specific, and the two are not interchangeable to a
// browser even though they resolve to the same host.
const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const API_BASE = process.env.QA_API_BASE_URL ?? "http://localhost:4000";

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ["--no-sandbox"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.route("**tile.openstreetmap.org/**", (r) => r.abort());
await context.route("**nominatim.openstreetmap.org/**", (r) => r.abort());
const page = await context.newPage();

const steps = [];
function check(label, ok, detail = "") {
  steps.push(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
}

const email = `qa-${Date.now()}@example.com`;

try {
  await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await page.getByLabel("Full name").fill("QA Real Backend");
  await page.getByLabel("Email", { exact: false }).first().fill(email);
  await page.getByLabel("Password", { exact: false }).first().fill("StrongPass99");
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.waitForURL("**/verify-email**", { timeout: 15000 });
  check("Sign up against the live backend redirects to verify-email", true);

  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name === "pp_session");
  check(
    "A real httpOnly session cookie was set by the backend",
    Boolean(sessionCookie?.httpOnly),
    sessionCookie ? `domain=${sessionCookie.domain} httpOnly=${sessionCookie.httpOnly}` : "no cookie found",
  );

  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const welcome = await page.getByRole("heading", { name: /Welcome back, QA/i }).count();
  check("Dashboard reads the session from the real backend", welcome > 0);

  // Vehicle round-trip through the real API.
  await page.goto(`${BASE}/dashboard/vehicles`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Add vehicle" }).first().click();
  await page.waitForTimeout(400);
  await page.getByLabel("Make").fill("Subaru");
  await page.getByLabel("Model").fill("Outback");
  await page.getByLabel("Color").fill("Green");
  await page.getByLabel("License plate").fill("QAB123");
  await page.getByLabel("State or jurisdiction").fill("CA");
  await page.getByLabel("Vehicle size").selectOption("standard");
  await page.getByRole("button", { name: "Add vehicle" }).last().click();
  await page.waitForTimeout(1000);
  check("Vehicle created via the real API appears in the list", (await page.getByText("Green Subaru Outback").count()) > 0);

  // Reload from scratch — proves persistence lives in Postgres, not memory.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  check("Vehicle survives a full page reload (real persistence)", (await page.getByText("Green Subaru Outback").count()) > 0);

  // Sign out, then confirm the session is really gone server-side.
  await page.goto(`${BASE}/dashboard/settings`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Sign out of all devices" }).click();
  await page.waitForTimeout(1000);
  const afterSignOut = await page.evaluate(async (apiBase) => {
    const res = await fetch(`${apiBase}/auth/session`, { credentials: "include" });
    return res.json();
  }, API_BASE);
  check("Session is genuinely cleared server-side after sign-out", afterSignOut === null);

  // Sign back in with the same real credentials.
  await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await page.getByLabel("Email", { exact: false }).fill(email);
  await page.getByLabel("Password", { exact: false }).first().fill("StrongPass99");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/dashboard**", { timeout: 15000 });
  check("Sign in with the same real credentials succeeds", true);
} catch (error) {
  steps.push(`FAIL  aborted — ${error.message.split("\n")[0]}`);
}

await browser.close();

console.log("\n=== LIVE BACKEND INTEGRATION RESULTS ===");
steps.forEach((s) => console.log(" " + s));
const failures = steps.filter((s) => s.startsWith("FAIL")).length;
console.log(`\n${steps.length - failures}/${steps.length} passed`);
