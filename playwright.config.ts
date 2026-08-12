import { defineConfig } from "@playwright/test";

const PORT = 3100;

/**
 * Regression coverage lives here as focused, mocked-network tests — no real
 * backend or database required. Every test intercepts the exact endpoints
 * it needs via page.route() and asserts on the UI's reaction, the same
 * contract src/lib/api/index.ts's `request()` helper guarantees against a
 * real server.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: "list",
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Any reachable-looking origin — every request to it is intercepted by
    // the tests, so nothing ever actually connects here.
    env: {
      NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:4999",
      // Fake but well-formed — only needs to make paymentsConfigured true so
      // the wizard's final step isn't disabled outright. Stripe.js is never
      // actually loaded in these tests since every mocked reservation
      // response fails before the payment step is reached.
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_fake_for_e2e",
    },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        // Use the full pre-installed Chromium binary rather than the
        // headless-shell variant, whose bundled revision doesn't always
        // match this sandbox's pre-provisioned browser.
        launchOptions: { executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] },
      },
    },
  ],
});
