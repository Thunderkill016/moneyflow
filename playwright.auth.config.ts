import { defineConfig } from "@playwright/test";

/**
 * Authenticated browser harness — additive, never a replacement.
 *
 * `playwright.config.ts` and `playwright.audit.config.ts` both pin
 * `NEXT_PUBLIC_APP_MODE: "demo"` and own the demo/geometry evidence. They are
 * deliberately untouched. This config is the only one that boots the app in
 * authenticated mode, against the deterministic double in
 * `e2e/auth/supabase-double.mjs`.
 *
 * No secrets are required and none are read. The double runs on loopback and
 * holds only synthetic fixture rows, so this suite can never reach a real
 * Supabase project or a real user.
 */

const APP_PORT = Number(process.env.AUTH_E2E_PORT || 3300);
const DOUBLE_PORT = Number(process.env.SUPABASE_DOUBLE_PORT || 3301);

const baseURL = `http://127.0.0.1:${APP_PORT}`;
const supabaseURL = `http://127.0.0.1:${DOUBLE_PORT}`;

export default defineConfig({
  testDir: "./e2e/auth",
  testMatch: /\.auth\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  outputDir: "output/playwright-auth/test-results",
  use: {
    baseURL,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    trace: "retain-on-failure",
    screenshot: "off",
    video: "off",
  },
  projects: [
    /*
     * Phone only, for now. The shell's pending-Inbox badge is painted by the
     * mobile navigation, so that viewport is where Inbox ownership is
     * observable. A desktop project would currently match no spec, and an
     * empty project reads as coverage that does not exist.
     */
    {
      name: "authenticated-phone",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command: `node e2e/auth/supabase-double.mjs`,
      url: `${supabaseURL}/__control/health`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: { SUPABASE_DOUBLE_PORT: String(DOUBLE_PORT) },
    },
    {
      command: `npm run build && npx next start -H 127.0.0.1 -p ${APP_PORT}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_APP_MODE: "authenticated",
        NEXT_PUBLIC_SUPABASE_URL: supabaseURL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_harness_double", // gitleaks:allow harness value
        NEXT_PUBLIC_SITE_URL: baseURL,
        NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED: "false",
      },
    },
  ],
});
