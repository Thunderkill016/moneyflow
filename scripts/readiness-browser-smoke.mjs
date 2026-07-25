import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const baseURL = process.env.READINESS_BASE_URL;
const email = process.env.READINESS_EMAIL;
const password = process.env.READINESS_PASSWORD;

if (!baseURL || !email || !password) {
  throw new Error("Missing readiness browser environment variables.");
}

const outputDir = "output/readiness-browser";
await mkdir(outputDir, { recursive: true });

const evidence = {
  baseHost: new URL(baseURL).host,
  startedAt: new Date().toISOString(),
  login: false,
  authenticatedMode: false,
  expenseCreated: false,
  persistedAfterReload: false,
  exportDownloaded: false,
  exportContainsExpense: false,
};

const note = `Readiness synthetic expense ${Date.now()}`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: "vi-VN",
  timezoneId: "Asia/Ho_Chi_Minh",
  acceptDownloads: true,
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

try {
  const response = await page.goto(`${baseURL}/login`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  if (!response?.ok()) {
    throw new Error(`Login page returned HTTP ${response?.status() ?? "unknown"}.`);
  }

  const loginBody = await page.locator("body").innerText();
  evidence.authenticatedMode = !loginBody.includes("Đang ở chế độ demo");
  if (!evidence.authenticatedMode) {
    throw new Error("Deployment is still running in demo mode.");
  }

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(/\/insights(?:\?|$)/, { timeout: 30_000 });
  evidence.login = true;

  const addButton = page.getByRole("button", { name: "Ghi chi tiêu", exact: true }).first();
  await addButton.click();
  await page.locator("#add-tx-amount").fill("12345");
  await page.getByRole("button", { name: /Ăn uống/ }).click();
  await page.locator("#add-tx-note").fill(note);
  await page.getByRole("button", { name: "Lưu", exact: true }).click();

  await page.getByText(note, { exact: true }).waitFor({ timeout: 20_000 });
  evidence.expenseCreated = true;

  await page.reload({ waitUntil: "networkidle" });
  await page.getByText(note, { exact: true }).waitFor({ timeout: 20_000 });
  evidence.persistedAfterReload = true;

  await page.goto(`${baseURL}/settings/export`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await page.getByText(/Sẵn sàng xuất\s+1\s+mục/).waitFor({ timeout: 20_000 });

  const downloadPromise = page.waitForEvent("download", { timeout: 20_000 });
  await page.locator("form.export-form button[type='submit']").click();
  const download = await downloadPromise;
  const downloadPath = join(outputDir, download.suggestedFilename());
  await download.saveAs(downloadPath);
  evidence.exportDownloaded = true;

  const exported = await readFile(downloadPath, "utf8");
  evidence.exportContainsExpense = exported.includes(note) && exported.includes("12345");
  if (!evidence.exportContainsExpense) {
    throw new Error("Export did not contain the synthetic expense.");
  }

  await page.screenshot({
    path: join(outputDir, "authenticated-export-success.png"),
    fullPage: true,
  });
} catch (error) {
  evidence.error = error instanceof Error ? error.message : String(error);
  await page.screenshot({
    path: join(outputDir, "failure.png"),
    fullPage: true,
  });
  throw error;
} finally {
  evidence.finishedAt = new Date().toISOString();
  await writeFile(
    join(outputDir, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  await browser.close();
}
