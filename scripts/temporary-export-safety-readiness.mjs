import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const base = "https://mfvn.vercel.app";
const userId = process.env.READINESS_USER_ID;
const email = process.env.READINESS_EMAIL;
const password = userId ? `Mf!${userId.replaceAll("-", "").slice(0, 24)}` : "";
const formulaNote = "=1+1";
const amount = 1_000;
const report = { base, checks: {}, consoleErrors: [], urls: [] };

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function parseCsv(text) {
  const source = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\r" && source[index + 1] === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      index += 1;
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value !== ""));
}

async function deleteAccountViaUi(page) {
  await page.goto(`${base}/settings/delete-account`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { name: "Xóa tài khoản" }).waitFor({ timeout: 30_000 });
  await page.getByPlaceholder("XÓA").fill("XÓA");
  await page.locator("button.delete-account-submit").click();
  await page.waitForURL(
    (url) => url.origin === base && url.pathname === "/login" && url.searchParams.get("deleted") === "1",
    { timeout: 60_000 },
  );
}

ensure(userId && email, "Missing disposable readiness identity");
await mkdir("artifacts", { recursive: true });
const vercel = JSON.parse(await readFile("vercel.json", "utf8"));
const supabaseUrl = vercel.env?.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = vercel.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
ensure(supabaseUrl && publishableKey, "Missing public Supabase configuration");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: "vi-VN",
  timezoneId: "Asia/Ho_Chi_Minh",
  viewport: { width: 390, height: 844 },
  acceptDownloads: true,
});
await context.addInitScript(() => {
  try {
    localStorage.setItem("moneyflow-onboarding-done", "1");
  } catch {}
});
const page = await context.newPage();
page.on("console", (message) => {
  if (message.type() === "error") report.consoleErrors.push(message.text());
});
page.on("pageerror", (error) => report.consoleErrors.push(error.message));

let accountDeleted = false;
try {
  await page.goto(`${base}/login`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL((url) => url.origin === base && url.pathname === "/insights", { timeout: 60_000 });
  report.urls.push(page.url());
  report.checks.passwordLogin = true;

  const fab = page.locator('button.mobile-fab[aria-label="Ghi chi tiêu"]');
  await fab.click();
  const dialog = page.getByRole("dialog", { name: "Ghi chi tiêu" });
  await dialog.waitFor({ timeout: 30_000 });
  await dialog.locator("#add-tx-amount").fill(String(amount));
  await dialog.getByRole("button", { name: /Ăn uống/ }).click();
  await dialog.getByPlaceholder("Ví dụ: Cơm trưa").fill(formulaNote);
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await dialog.waitFor({ state: "hidden", timeout: 30_000 });
  const row = page.locator(".transaction-row").filter({ hasText: formulaNote });
  await row.waitFor({ timeout: 30_000 });
  ensure((await row.count()) === 1, "Formula-leading transaction missing or duplicated");
  report.checks.formulaNoteStoredLiterally = true;
  await page.screenshot({ path: "artifacts/01-formula-note.png", fullPage: true });

  const exportLink = page.locator('a:visible').filter({ hasText: "Xuất CSV" }).first();
  await exportLink.waitFor({ timeout: 30_000 });
  const href = await exportLink.getAttribute("href");
  ensure(href === "/settings/export", `Unexpected export navigation target: ${href}`);
  await exportLink.click();
  await page.waitForURL((url) => url.origin === base && url.pathname === "/settings/export", { timeout: 30_000 });
  await page.getByRole("heading", { name: "Xuất dữ liệu" }).waitFor({ timeout: 30_000 });
  report.urls.push(page.url());
  report.checks.exportDiscoverableFromInsights = true;

  const downloadButton = page.locator(".privacy-form-actions button.primary-button");
  await downloadButton.waitFor({ timeout: 30_000 });
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30_000 }),
    downloadButton.click(),
  ]);
  const downloadPath = await download.path();
  ensure(downloadPath, "CSV download path missing");
  const csv = await readFile(downloadPath, "utf8");
  await writeFile("artifacts/moneyflow-export.csv", csv);
  const rows = parseCsv(csv);
  ensure(rows.length >= 2, "CSV has no transaction rows");
  const noteIndex = rows[0].indexOf("Ghi chú");
  ensure(noteIndex >= 0, "CSV note header missing");
  const exportedRow = rows.slice(1).find((item) => item[noteIndex]?.includes("1+1"));
  ensure(exportedRow, "Formula-leading note missing from CSV");
  const exportedNote = exportedRow[noteIndex];
  ensure(exportedNote === `\'${formulaNote}`, `Formula note was not escaped as text: ${exportedNote}`);
  ensure(!/^[=+\-@\t\r]/.test(exportedNote), "Exported note still begins with a spreadsheet formula trigger");
  report.exportedNote = exportedNote;
  report.csvRows = rows.length - 1;
  report.checks.formulaEscapedInProductionCsv = true;
  await page.screenshot({ path: "artifacts/02-export-page.png", fullPage: true });

  await deleteAccountViaUi(page);
  accountDeleted = true;
  report.urls.push(page.url());
  report.checks.accountDeleted = true;

  const fresh = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: loginError } = await fresh.auth.signInWithPassword({ email, password });
  ensure(Boolean(loginError), "Deleted fixture can still sign in");
  report.checks.deletedLoginRejected = true;
  ensure(report.consoleErrors.length === 0, `Browser console errors: ${report.consoleErrors.join(" | ")}`);
  report.status = "pass";
} catch (error) {
  report.status = "fail";
  report.failure = error instanceof Error ? error.stack ?? error.message : String(error);
  await page.screenshot({ path: "artifacts/failure.png", fullPage: true }).catch(() => {});
  throw error;
} finally {
  if (!accountDeleted) {
    try {
      await deleteAccountViaUi(page);
      accountDeleted = true;
      report.cleanupAfterFailure = "deleted_via_ui";
    } catch (cleanupError) {
      report.cleanupAfterFailure = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
    }
  }
  report.finalUrl = page.url();
  report.accountDeleted = accountDeleted;
  await writeFile("artifacts/export-safety-report.json", JSON.stringify(report, null, 2));
  await browser.close();
}
