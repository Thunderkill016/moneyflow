import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const base = "https://mfvn.vercel.app";
const userId = process.env.READINESS_USER_ID;
const email = process.env.READINESS_EMAIL;
const password = userId ? `Mf!${userId.replaceAll("-", "").slice(0, 24)}` : "";
const expenseAmount = 123_456;
const transferAmount = 50_000;
const expenseNote = "MFVN totals readiness expense";
const transferNote = "MFVN totals readiness transfer";
const secondAccountName = "Quỹ kiểm thử";
const report = {
  base,
  checks: {},
  metrics: {},
  accountBalances: {},
  consoleErrors: [],
  urls: [],
};

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function parseMoneyLabel(label, signed = false) {
  const digits = label.replace(/[^0-9]/g, "");
  const value = digits ? Number.parseInt(digits, 10) : 0;
  if (!signed) return value;
  return /[-−]/.test(label) ? -value : value;
}

async function readMetrics(page) {
  const balanceLabel = await page.getByLabel(/^Số dư tổng /).getAttribute("aria-label");
  const incomeLabel = await page.getByLabel(/^Thu tháng cộng /).getAttribute("aria-label");
  const expenseLabel = await page.getByLabel(/^Chi tháng trừ /).getAttribute("aria-label");
  const netLabel = await page.getByLabel(/^Ròng /).getAttribute("aria-label");
  ensure(balanceLabel && incomeLabel && expenseLabel && netLabel, "Dashboard KPI labels missing");
  return {
    balance: parseMoneyLabel(balanceLabel, true),
    income: parseMoneyLabel(incomeLabel),
    expense: parseMoneyLabel(expenseLabel),
    net: parseMoneyLabel(netLabel, true),
  };
}

async function readCategoryAmount(page, categoryName) {
  const row = page.locator(".insights-category-row").filter({ hasText: categoryName });
  await row.waitFor({ timeout: 30_000 });
  ensure((await row.count()) === 1, `${categoryName} category row missing or duplicated`);
  const label = await row.getByLabel(/^Chi /).getAttribute("aria-label");
  ensure(label, `${categoryName} category amount label missing`);
  return parseMoneyLabel(label);
}

async function readAccountBalance(page, accountName) {
  const card = page.locator(".account-card").filter({ has: page.getByRole("heading", { name: accountName }) });
  await card.waitFor({ timeout: 30_000 });
  ensure((await card.count()) === 1, `Account card ${accountName} missing or duplicated`);
  const text = await card.locator(".account-card-title strong.font-mono").innerText();
  return parseMoneyLabel(text, true);
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
  await page.getByText(/Có thể chi hôm nay/i).first().waitFor({ timeout: 30_000 });
  report.urls.push(page.url());
  report.checks.passwordLogin = true;

  // Establish a deterministic 1,000,000 ₫ baseline and a second VND account.
  await page.goto(`${base}/accounts`, { waitUntil: "networkidle", timeout: 60_000 });
  const firstCard = page.locator(".account-card").first();
  await firstCard.waitFor({ timeout: 30_000 });
  const defaultAccountName = (await firstCard.getByRole("heading", { level: 3 }).innerText()).trim();
  report.defaultAccountName = defaultAccountName;

  await firstCard.getByRole("button", { name: `Sửa ${defaultAccountName}` }).click();
  const editAccountDialog = page.getByRole("dialog", { name: "Sửa tài khoản" });
  await editAccountDialog.waitFor();
  await editAccountDialog.locator('input[name="initialBalance"]').fill("1000000");
  await editAccountDialog.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await editAccountDialog.waitFor({ state: "hidden", timeout: 30_000 });

  const addAccountButton = page.locator('button:visible').filter({ hasText: "Thêm tài khoản" }).first();
  await addAccountButton.click();
  const addAccountDialog = page.getByRole("dialog", { name: "Thêm tài khoản" });
  await addAccountDialog.waitFor();
  await addAccountDialog.getByLabel("Tên tài khoản").fill(secondAccountName);
  await addAccountDialog.getByLabel("Loại tài khoản").selectOption("savings");
  await addAccountDialog.locator('input[name="initialBalance"]').fill("0");
  await addAccountDialog.getByRole("button", { name: "Thêm tài khoản", exact: true }).click();
  await addAccountDialog.waitFor({ state: "hidden", timeout: 30_000 });
  ensure((await page.locator(".account-card").count()) === 2, "Second account was not created exactly once");
  report.checks.accountSetup = true;

  await page.goto(`${base}/insights`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByText(/Có thể chi hôm nay/i).first().waitFor({ timeout: 30_000 });
  const beforeExpense = await readMetrics(page);
  report.metrics.beforeExpense = beforeExpense;
  ensure(beforeExpense.balance === 1_000_000, `Unexpected baseline balance: ${beforeExpense.balance}`);
  ensure(beforeExpense.income === 0 && beforeExpense.expense === 0 && beforeExpense.net === 0, "Baseline monthly totals are not zero");

  // Use the visible primary/FAB action rather than navigating directly to /capture/quick.
  const ghiChiButton = page.locator('button:visible').filter({ hasText: "Ghi chi tiêu" }).first();
  await ghiChiButton.click();
  const transactionDialog = page.getByRole("dialog", { name: "Ghi chi tiêu" });
  await transactionDialog.waitFor({ timeout: 30_000 });
  await transactionDialog.locator("#add-tx-amount").fill(String(expenseAmount));
  await transactionDialog.getByRole("button", { name: /Ăn uống/ }).click();
  await transactionDialog.getByPlaceholder("Ví dụ: Cơm trưa").fill(expenseNote);
  await transactionDialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await transactionDialog.waitFor({ state: "hidden", timeout: 30_000 });
  await page.getByText(/Đã ghi khoản chi/).waitFor({ timeout: 30_000 });

  const expenseRow = page.locator(".transaction-row").filter({ hasText: expenseNote });
  await expenseRow.waitFor({ timeout: 30_000 });
  ensure((await expenseRow.count()) === 1, "Expense row missing or duplicated after save");
  const afterExpense = await readMetrics(page);
  const categoryAfterExpense = await readCategoryAmount(page, "Ăn uống");
  report.metrics.afterExpense = afterExpense;
  report.metrics.categoryAfterExpense = categoryAfterExpense;
  ensure(afterExpense.balance === beforeExpense.balance - expenseAmount, "Balance did not decrease exactly once");
  ensure(afterExpense.income === beforeExpense.income, "Income changed after expense");
  ensure(afterExpense.expense === beforeExpense.expense + expenseAmount, "Monthly expense did not increase exactly once");
  ensure(afterExpense.net === beforeExpense.net - expenseAmount, "Net did not decrease exactly once");
  ensure(categoryAfterExpense === expenseAmount, "Category total did not increase exactly once");
  report.checks.dashboardTotalsExactlyOnce = true;
  report.checks.primaryActionPath = true;
  await page.screenshot({ path: "artifacts/01-after-expense.png", fullPage: true });

  await page.reload({ waitUntil: "networkidle" });
  const afterReload = await readMetrics(page);
  const categoryAfterReload = await readCategoryAmount(page, "Ăn uống");
  ensure(JSON.stringify(afterReload) === JSON.stringify(afterExpense), "Dashboard totals changed after reload");
  ensure(categoryAfterReload === categoryAfterExpense, "Category total changed after reload");
  ensure((await page.locator(".transaction-row").filter({ hasText: expenseNote }).count()) === 1, "Expense duplicated after reload");
  report.metrics.afterReload = afterReload;
  report.checks.noDuplicateAfterReload = true;

  // Transfer 50,000 ₫ between the two VND accounts.
  await page.goto(`${base}/accounts`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("button", { name: "Chuyển tiền", exact: true }).click();
  const transferDialog = page.getByRole("dialog", { name: "Chuyển tiền" });
  await transferDialog.waitFor({ timeout: 30_000 });
  await transferDialog.getByLabel("Từ tài khoản").selectOption({ label: defaultAccountName });
  await transferDialog.getByLabel("Đến tài khoản").selectOption({ label: secondAccountName });
  await transferDialog.getByLabel("Số tiền chuyển").fill(String(transferAmount));
  await transferDialog.getByPlaceholder("Ví dụ: Chuyển sang quỹ tiết kiệm").fill(transferNote);
  await transferDialog.getByRole("button", { name: "Xác nhận chuyển tiền", exact: true }).click();
  await transferDialog.waitFor({ state: "hidden", timeout: 30_000 });
  await page.getByText(/Đã chuyển/).waitFor({ timeout: 30_000 });

  const sourceBalance = await readAccountBalance(page, defaultAccountName);
  const destinationBalance = await readAccountBalance(page, secondAccountName);
  report.accountBalances.afterTransfer = { sourceBalance, destinationBalance };
  ensure(sourceBalance === 1_000_000 - expenseAmount - transferAmount, "Source account did not decrease by transfer amount");
  ensure(destinationBalance === transferAmount, "Destination account did not increase by transfer amount");
  ensure(sourceBalance + destinationBalance === afterExpense.balance, "Transfer changed total account balance");

  await page.goto(`${base}/insights`, { waitUntil: "networkidle", timeout: 60_000 });
  const afterTransfer = await readMetrics(page);
  const categoryAfterTransfer = await readCategoryAmount(page, "Ăn uống");
  const transferRow = page.locator(".transaction-row").filter({ hasText: transferNote });
  await transferRow.waitFor({ timeout: 30_000 });
  ensure((await transferRow.count()) === 1, "Transfer row missing or duplicated");
  ensure(JSON.stringify(afterTransfer) === JSON.stringify(afterExpense), "Transfer altered dashboard income/expense/net/balance totals");
  ensure(categoryAfterTransfer === categoryAfterExpense, "Transfer altered expense category total");
  report.metrics.afterTransfer = afterTransfer;
  report.metrics.categoryAfterTransfer = categoryAfterTransfer;
  report.checks.transferExcludedFromIncomeExpense = true;
  await page.screenshot({ path: "artifacts/02-after-transfer.png", fullPage: true });

  await page.reload({ waitUntil: "networkidle" });
  ensure(JSON.stringify(await readMetrics(page)) === JSON.stringify(afterExpense), "Transfer totals changed after reload");
  ensure((await page.locator(".transaction-row").filter({ hasText: transferNote }).count()) === 1, "Transfer duplicated after reload");
  report.checks.transferPersistence = true;

  await deleteAccountViaUi(page);
  accountDeleted = true;
  report.urls.push(page.url());
  report.checks.accountDeleted = true;
  await page.screenshot({ path: "artifacts/03-account-deleted.png", fullPage: true });

  const fresh = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: deletedLoginError } = await fresh.auth.signInWithPassword({ email, password });
  ensure(Boolean(deletedLoginError), "Deleted fixture can still sign in");
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
  await writeFile("artifacts/dashboard-transfer-report.json", JSON.stringify(report, null, 2));
  await browser.close();
}
