import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.UI_AUDIT_PORT || 3200);
const baseURL = process.env.UI_AUDIT_BASE_URL || `http://127.0.0.1:${PORT}`;

const responsiveSpec = /responsive\.audit\.spec\.ts/;
const criticalBrowserSpec = /critical-browser\.audit\.spec\.ts/;
const textScaleSpec = /text-scale\.audit\.spec\.ts/;
const keyboardSpec = /keyboard\.audit\.spec\.ts/;

const commonUse = {
  baseURL,
  locale: "vi-VN",
  timezoneId: "Asia/Ho_Chi_Minh",
  trace: "retain-on-failure" as const,
  screenshot: "off" as const,
  video: "off" as const,
};

export default defineConfig({
  testDir: "./e2e/audit",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "output/playwright-audit/report" }],
  ],
  outputDir: "output/playwright-audit/test-results",
  use: commonUse,
  projects: [
    {
      name: "chromium-phone-320",
      testMatch: responsiveSpec,
      use: {
        browserName: "chromium",
        viewport: { width: 320, height: 568 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "chromium-android-360",
      testMatch: responsiveSpec,
      use: {
        browserName: "chromium",
        viewport: { width: 360, height: 800 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "chromium-iphone-390",
      testMatch: responsiveSpec,
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "chromium-tablet-portrait",
      testMatch: responsiveSpec,
      use: {
        browserName: "chromium",
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
    },
    {
      name: "chromium-tablet-landscape",
      testMatch: responsiveSpec,
      use: {
        browserName: "chromium",
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
      },
    },
    {
      name: "chromium-desktop-1366",
      testMatch: responsiveSpec,
      use: {
        browserName: "chromium",
        viewport: { width: 1366, height: 768 },
      },
    },
    {
      name: "chromium-wide-1440",
      testMatch: responsiveSpec,
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "chromium-phone-dark",
      testMatch: criticalBrowserSpec,
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        colorScheme: "dark",
      },
    },
    {
      name: "chromium-desktop-dark",
      testMatch: criticalBrowserSpec,
      use: {
        browserName: "chromium",
        viewport: { width: 1366, height: 768 },
        colorScheme: "dark",
      },
    },
    {
      name: "webkit-iphone",
      testMatch: criticalBrowserSpec,
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "webkit-tablet",
      testMatch: criticalBrowserSpec,
      use: {
        browserName: "webkit",
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
    },
    {
      name: "chromium-text-200-phone",
      testMatch: textScaleSpec,
      use: {
        browserName: "chromium",
        viewport: { width: 320, height: 568 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "chromium-keyboard-desktop",
      testMatch: keyboardSpec,
      use: {
        browserName: "chromium",
        viewport: { width: 1366, height: 768 },
      },
    },
    {
      name: "firefox-desktop",
      testMatch: criticalBrowserSpec,
      use: {
        browserName: "firefox",
        viewport: { width: 1366, height: 768 },
      },
    },
  ],
  webServer: {
    command: `npx next dev --hostname 127.0.0.1 --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_MODE: "demo",
      NEXT_PUBLIC_SITE_URL: baseURL,
    },
  },
});
