import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";

const base = "https://moneyflow-vn.vercel.app";
const email = process.env.READINESS_EMAIL;
const password = process.env.READINESS_PASSWORD;
const note = "Production readiness 15551e7a";
const editedNote = "Production readiness edited 15551e7a";
const report = { base, checks: {}, urls: [], consoleErrors: [] };

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

ensure(email && password, "Missing synthetic readiness credentials");
const vercel = JSON.parse(await readFile("vercel.json", "utf8"));
const supabaseUrl = vercel.env?.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = vercel.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
ensure(supabaseUrl && publishableKey, "Missing public Supabase config in vercel.json");

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

try {
  const loginResponse = await page.goto(`${base}/login`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  report.urls.push(page.url());
  ensure(loginResponse && loginResponse.status() < 400, `Login HTTP ${loginResponse?.status()}`);
  const loginBody = await page.locator("body").innerText();
  ensure(loginBody.includes("Đăng nhập"), "MoneyFlow login heading missing");
  ensure(!loginBody.includes("Log in to Vercel"), "Vercel Authentication still intercepts production");
  ensure(new URL(page.url()).origin === base, `Unexpected login origin: ${page.url()}`);
  ensure(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    "Login page has horizontal overflow on mobile viewport",
  );
  await page.screenshot({ path: "artifacts/01-login.png", fullPage: true });
  report.checks.publicLogin = true;

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL((url) => url.origin === base && url.pathname === "/insights", {
    timeout: 60_000,
  });
  await page.getByText(/Có thể chi hôm nay/i).first().waitFor({ timeout: 30_000 });
  report.urls.push(page.url());
  await page.screenshot({ path: "artifacts/02-insights.png", fullPage: true });
  report.checks.passwordLogin = true;

  await page.goto(`${base}/capture/quick`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { level: 1, name: "Thêm nhanh" }).waitFor();
  const amount = page.locator("#add-tx-amount");
  ensure((await amount.getAttribute("inputmode")) === "decimal", "Amount input keyboard mode is not decimal");
  ensure(await amount.evaluate((element) => element === document.activeElement), "Amount input did not receive focus");
  ensure(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    "Quick-add page has horizontal overflow on mobile viewport",
  );
  await amount.fill("123456");
  await page.getByRole("button", { name: "Ăn uống", exact: true }).click();
  await page.getByPlaceholder("Ví dụ: Cơm trưa").fill(note);
  await page.locator(".capture-quick-form button.primary-button").click();
  await page.waitForURL((url) => url.origin === base && url.pathname === "/capture", {
    timeout: 30_000,
  });
  report.checks.mobileQuickAdd = true;

  await page.goto(`${base}/transactions`, { waitUntil: "networkidle", timeout: 60_000 });
  let row = page.locator(".transaction-row").filter({ hasText: note });
  await row.waitFor({ timeout: 30_000 });
  ensure((await row.count()) === 1, "Created transaction did not appear exactly once");
  await page.screenshot({ path: "artifacts/03-created-transaction.png", fullPage: true });

  await page.reload({ waitUntil: "networkidle" });
  row = page.locator(".transaction-row").filter({ hasText: note });
  await row.waitFor({ timeout: 30_000 });
  ensure((await row.count()) === 1, "Transaction did not persist exactly once after reload");
  report.checks.persistence = true;

  await page.getByRole("button", { name: `Sửa giao dịch ${note}` }).click();
  const editDialog = page.getByRole("dialog", { name: "Sửa giao dịch" });
  await editDialog.waitFor();
  await editDialog.locator('input[inputmode="decimal"]').fill("234567");
  await editDialog.getByPlaceholder("Ví dụ: Cơm trưa").fill(editedNote);
  await editDialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await editDialog.waitFor({ state: "hidden", timeout: 30_000 });
  row = page.locator(".transaction-row").filter({ hasText: editedNote });
  await row.waitFor({ timeout: 30_000 });
  ensure((await row.count()) === 1, "Edited transaction missing or duplicated");
  ensure((await row.innerText()).includes("234.567"), "Edited amount not rendered correctly");
  report.checks.edit = true;

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: `Xóa giao dịch ${editedNote}` }).click();
  await row.waitFor({ state: "hidden", timeout: 30_000 });
  const undo = page.getByRole("button", { name: "Hoàn tác", exact: true });
  await undo.waitFor({ timeout: 10_000 });
  await undo.click();
  row = page.locator(".transaction-row").filter({ hasText: editedNote });
  await row.waitFor({ timeout: 30_000 });
  report.checks.deleteUndo = true;

  await page.goto(`${base}/settings/export`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { name: "Xuất dữ liệu" }).waitFor();
  const downloadButton = page.locator(".privacy-form-actions button.primary-button");
  await downloadButton.waitFor();
  ensure(await downloadButton.isEnabled(), "Export button is disabled");
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30_000 }),
    downloadButton.click(),
  ]);
  const downloadPath = await download.path();
  ensure(downloadPath, "Export download path missing");
  const csv = await readFile(downloadPath, "utf8");
  ensure(csv.includes(editedNote), "Export does not contain edited transaction note");
  ensure(/234567|234\.567/.test(csv), "Export does not contain edited amount");
  await page.screenshot({ path: "artifacts/04-export.png", fullPage: true });
  report.checks.export = true;

  await page.goto(`${base}/forgot-password`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Gửi liên kết", exact: true }).click();
  await page.getByText(/Nếu email tồn tại/i).waitFor({ timeout: 30_000 });
  report.checks.passwordResetRequest = true;

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const redirectTo = `${base}/auth/callback?next=/insights`;
  const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  ensure(!oauthError && oauthData.url, `Google OAuth URL failed: ${oauthError?.message ?? "no URL"}`);
  ensure(!oauthData.url.includes("localhost"), "OAuth URL contains localhost");
  const oauthResponse = await fetch(oauthData.url, { redirect: "manual" });
  ensure([302, 303].includes(oauthResponse.status), `OAuth authorize HTTP ${oauthResponse.status}`);
  const oauthLocation = oauthResponse.headers.get("location") ?? "";
  ensure(!oauthLocation.includes("localhost"), "OAuth redirect location contains localhost");
  report.checks.productionAuthRedirect = true;
  report.oauthLocationOrigin = oauthLocation ? new URL(oauthLocation).origin : null;

  await page.goto(`${base}/settings/delete-account`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await page.getByRole("heading", { name: "Xóa tài khoản" }).waitFor();
  await page.getByPlaceholder("XÓA").fill("XÓA");
  await page.locator("button.delete-account-submit").click();
  await page.waitForURL(
    (url) => url.origin === base && url.pathname === "/login" && url.searchParams.get("deleted") === "1",
    { timeout: 60_000 },
  );
  report.urls.push(page.url());
  await page.screenshot({ path: "artifacts/05-account-deleted.png", fullPage: true });

  const fresh = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: deletedLoginError } = await fresh.auth.signInWithPassword({ email, password });
  ensure(Boolean(deletedLoginError), "Deleted account can still sign in");
  report.checks.accountCleanup = true;

  ensure(report.urls.every((url) => !url.includes("localhost")), "A browser flow used localhost");
  report.status = "pass";
} catch (error) {
  report.status = "fail";
  report.failure = error instanceof Error ? error.stack ?? error.message : String(error);
  await page.screenshot({ path: "artifacts/failure.png", fullPage: true }).catch(() => {});
  throw error;
} finally {
  report.finalUrl = page.url();
  await writeFile("artifacts/readiness-report.json", JSON.stringify(report, null, 2));
  await browser.close();
}
