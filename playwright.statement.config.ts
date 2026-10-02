import { defineConfig } from "@playwright/test";
import { localStatementEnvironment } from "./e2e/auth/local-statement-env.mjs";

const local = localStatementEnvironment();
// Separate from both demo mode and the read-only authenticated double.
const APP_PORT = 3400;
const baseURL = `http://127.0.0.1:${APP_PORT}`;

export default defineConfig({
  testDir: "./e2e/auth",
  testMatch: "statement.real.spec.ts",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  // Two minutes covers upload, review, re-import and reconciliation mutations.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  outputDir: "output/playwright-statement/test-results",
  use: {
    baseURL,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "statement-desktop",
      use: { browserName: "chromium", viewport: { width: 1280, height: 900 } },
    },
    {
      name: "statement-phone",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npm run build && npx next start -H 127.0.0.1 -p ${APP_PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    // Match the existing authenticated harness production-build allowance.
    timeout: 240_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_MODE: "authenticated",
      NEXT_PUBLIC_SUPABASE_URL: local.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.anonKey,
      NEXT_PUBLIC_SITE_URL: baseURL,
      NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED: "false",
      // Fixture administration belongs to the test process, never the app.
      MF_STATEMENT_SERVICE_ROLE_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  },
});
