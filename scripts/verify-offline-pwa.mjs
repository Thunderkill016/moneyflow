import { chromium } from "playwright";

const BASE = "http://localhost:8471";
const shot = (page, name) =>
  page.screenshot({ path: `/tmp/x1-${name}.png`, fullPage: false });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: "allow",
});
const page = await context.newPage();

// 1. Visit dashboard online — SW registers (page itself is NOT yet controlled).
await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
await page.waitForFunction(() => navigator.serviceWorker?.controller, null, {
  timeout: 10000,
});
console.log("SW controlled:", true);

// 2. Reload dashboard — now controlled → network-first fetch caches the HTML.
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);
const swState = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  const keys = await caches.keys();
  let cachedUrls = [];
  for (const key of keys) {
    const cache = await caches.open(key);
    cachedUrls = cachedUrls.concat((await cache.keys()).map((r) => r.url));
  }
  return {
    registered: Boolean(reg),
    scope: reg?.scope,
    cacheKeys: keys,
    cachedUrls,
  };
});
console.log("SW:", JSON.stringify(swState, null, 1));

// 3. Visit /settings — hub row — then /settings/install.
await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const hubHasInstall = await page.getByText("Cài đặt ứng dụng").count();
await page.goto(`${BASE}/settings/install`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const installText = await page.locator("main").innerText();
console.log(
  "HUB ROW:",
  hubHasInstall,
  "| INSTALL PAGE:",
  installText.slice(0, 220)
);
await shot(page, "install");

// 4. Offline: /dashboard → cached copy should render.
await context.setOffline(true);
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
const offlineDash = await page.locator("main").innerText().catch(() => "FAILED");
console.log(
  "OFFLINE /dashboard:",
  offlineDash.slice(0, 200).replace(/\n+/g, " | ")
);
await shot(page, "offline-dash");

// 5. Offline uncached page → notice.
await page.goto(`${BASE}/transactions`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
const offlineOther = await page.locator("body").innerText().catch(() => "FAILED");
console.log(
  "OFFLINE /transactions:",
  offlineOther.slice(0, 200).replace(/\n+/g, " | ")
);
await shot(page, "offline-other");

await browser.close();
