import { chromium } from "playwright";

// Frontend on "localhost", API on "127.0.0.1" — genuinely different sites to
// a browser (SameSite/CORS/cookie rules key on registrable domain, and an IP
// literal is its own site regardless of hostname resolution), which mirrors
// the real Netlify <-> Railway cross-site relationship closely enough to
// exercise the SameSite=None;Secure fix and the Bearer-token fallback.
const BASE = "http://localhost:3000";
const API_BASE = "http://127.0.0.1:4000";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const steps = [];
function check(label, ok, detail = "") {
  steps.push(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
}

const email = `crosssite-${Date.now()}@example.com`;

try {
  await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.getByLabel("Full name").fill("Cross Site Test");
  await page.getByLabel("Email", { exact: false }).first().fill(email);
  await page.getByLabel("Password", { exact: false }).first().fill("StrongPass99");
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.waitForURL("**/verify-email**", { timeout: 15000 });
  check("Sign-up succeeds cross-site and redirects to verify-email", true);

  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name === "pp_session");
  check(
    "Session cookie was set (SameSite=None;Secure survives cross-site)",
    Boolean(sessionCookie),
    sessionCookie
      ? `sameSite=${sessionCookie.sameSite} secure=${sessionCookie.secure} httpOnly=${sessionCookie.httpOnly}`
      : "no cookie present — expected if this environment enforces Secure-requires-HTTPS even for 127.0.0.1; Bearer fallback should cover it",
  );

  const storedToken = await page.evaluate(() => localStorage.getItem("parkplug:v1:session-token"));
  check("Bearer token was stored client-side after sign-up", Boolean(storedToken));

  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const welcome1 = await page.getByRole("heading", { name: /Welcome back, Cross/i }).count();
  check("Dashboard recognises the signed-in user right after sign-up", welcome1 > 0);

  // The real test: reload from scratch, exactly what the user reported broken.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const welcome2 = await page.getByRole("heading", { name: /Welcome back, Cross/i }).count();
  const signInToContinue = await page.getByText("Sign in to continue").count();
  check(
    "Still signed in after a full page reload (the bug being fixed)",
    welcome2 > 0 && signInToContinue === 0,
    `welcome heading present=${welcome2 > 0}, "Sign in to continue" shown=${signInToContinue > 0}`,
  );

  // Header should show the signed-in state, not Sign In / Create Account.
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const headerSignIn = await page.getByRole("link", { name: "Sign In" }).count();
  check("Header no longer shows Sign In after reload", headerSignIn === 0);

  // Direct session check via fetch from the page's own origin.
  const sessionCheck = await page.evaluate(async (apiBase) => {
    const token = localStorage.getItem("parkplug:v1:session-token");
    const res = await fetch(`${apiBase}/auth/session`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${JSON.parse(token)}` } : {},
    });
    return res.json();
  }, API_BASE);
  check("GET /auth/session returns the real user, not null", sessionCheck !== null, JSON.stringify(sessionCheck)?.slice(0, 120));

  // Sign out and confirm the token is cleared client-side too.
  await page.goto(`${BASE}/dashboard/settings`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Sign out of all devices" }).click();
  await page.waitForTimeout(1000);
  const tokenAfterSignOut = await page.evaluate(() => localStorage.getItem("parkplug:v1:session-token"));
  check("Bearer token cleared client-side after sign-out", tokenAfterSignOut === null || tokenAfterSignOut === "null");
} catch (error) {
  steps.push(`FAIL  aborted — ${error.message.split("\n")[0]}`);
}

await browser.close();

console.log("\n=== CROSS-SITE AUTH RESULTS ===");
steps.forEach((s) => console.log(" " + s));
const failures = steps.filter((s) => s.startsWith("FAIL")).length;
console.log(`\n${steps.length - failures}/${steps.length} passed`);
