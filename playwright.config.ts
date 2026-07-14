import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke — TASK-116 (expense path) + any specs under ./e2e.
 * Forces demo mode (placeholder Supabase) so flows run without
 * creating real accounts or depending on .env.local credentials.
 */
const PORT = Number(process.env.E2E_PORT || 3100);
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "output/playwright/report" }]],
  outputDir: "output/playwright/test-results",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx next dev --hostname 127.0.0.1 --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      // Placeholder values → isSupabaseConfigured() === false → demo viewer
      NEXT_PUBLIC_SUPABASE_URL: "https://your-project-ref.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_replace_me",
      NEXT_PUBLIC_SITE_URL: baseURL,
    },
  },
});
