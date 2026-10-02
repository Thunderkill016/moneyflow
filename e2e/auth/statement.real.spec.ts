import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { localStatementEnvironment } from "./local-statement-env.mjs";

const local = localStatementEnvironment();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
// Independent synthetic statement truth, not a value read from MoneyFlow totals.
const OPENING_BALANCE = 100_000;
const EXPENSE = 45_000;
const CLOSING_BALANCE = OPENING_BALANCE - EXPENSE;
const STATEMENT_DATE = "2026-09-30";

test("real authenticated CSV posting, re-import and reconciliation preserve one book", async ({
  page,
  context,
}) => {
  const admin = createClient(local.url, local.serviceRoleKey, options);
  async function newTenant() {
    const email = `statement-${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(created.error).toBeNull();
    const client = createClient(local.url, local.anonKey, options);
    const signedIn = await client.auth.signInWithPassword({ email, password });
    expect(signedIn.error).toBeNull();
    expect(created.data.user).not.toBeNull();
    return { email, password, client, id: created.data.user!.id };
  }
  const owner = await newTenant();
  const other = await newTenant();
  const account = await owner.client.rpc("create_financial_account", {
    p_name: "Synthetic statement bank",
    p_kind: "bank",
    p_initial_balance_minor: OPENING_BALANCE,
    p_currency_code: "VND",
  });
  expect(account.error).toBeNull();
  const accountId = account.data as string;
  const category = await owner.client
    .from("categories")
    .select("id")
    .eq("kind", "expense")
    .limit(1)
    .single();
  expect(category.error).toBeNull();
  const merchant = "SYNTHETIC_STATEMENT_CAFE";
  await context.addInitScript(() => {
    localStorage.setItem("moneyflow-onboarding-done", "1");
    localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
    localStorage.setItem("moneyflow-demo-transactions-v1", "[]");
  });
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(owner.email);
  await page.locator('input[name="password"]').fill(owner.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  await expect(page.getByText("Chế độ demo", { exact: false })).toHaveCount(0);

  async function upload() {
    await page.goto("/capture/upload");
    // File selection needs the client change handler, not only its SSR input.
    await expect(page.locator("html")).toHaveAttribute(
      "data-moneyflow-shell",
      "mounted",
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "synthetic-statement.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `Ngày,Mô tả,Số tiền\n2026-09-09,${merchant},-${EXPENSE}`,
        "utf8",
      ),
    });
    await expect(page).toHaveURL(/\/imports\/.+\/preview$/);
    await page.getByLabel("Sao kê này thuộc tài khoản").selectOption(accountId);
    await page.getByRole("button", { name: "Xem lại đưa vào Inbox" }).click();
    await page
      .getByRole("dialog", { name: "Đưa batch vào Inbox?" })
      .getByRole("button", { name: "Đưa vào Inbox", exact: true })
      .click();
    await expect(page).toHaveURL(/\/inbox$/);
  }
  await upload();
  const before = await owner.client.from("financial_transactions").select("id");
  expect(before.error).toBeNull();
  expect(before.data).toEqual([]);
  await page.getByRole("button", { name: `Duyệt ${merchant}` }).click();
  const review = page.getByRole("dialog", { name: "Duyệt giao dịch" });
  await expect(review.getByLabel("Tài khoản", { exact: true })).toHaveValue(
    accountId,
  );
  await expect(review.getByLabel("Danh mục", { exact: true })).toHaveValue("");
  await review
    .getByLabel("Danh mục", { exact: true })
    .selectOption(category.data!.id);
  await review.getByRole("button", { name: "Duyệt vào sổ" }).click();
  await expect(page.getByText(/Đã duyệt .+ vào sổ\./)).toBeVisible();

  async function readFacts() {
    const result = await owner.client
      .from("financial_transactions")
      .select("id,kind,occurred_on,note");
    expect(result.error).toBeNull();
    return result.data!;
  }
  const facts = await readFacts();
  expect(facts).toHaveLength(1);
  expect(facts[0]).toMatchObject({
    kind: "expense",
    occurred_on: "2026-09-09",
  });
  const legs = await owner.client
    .from("transaction_entries")
    .select("id,amount_minor,account_id,category_id")
    .eq("transaction_id", facts[0].id);
  expect(legs.error).toBeNull();
  expect(legs.data).toHaveLength(1);
  expect(legs.data![0]).toMatchObject({
    amount_minor: -EXPENSE,
    account_id: accountId,
    category_id: category.data!.id,
  });
  const provenance = await owner.client
    .from("transaction_import_provenance")
    .select("transaction_id,candidate_id,import_batch_id")
    .eq("transaction_id", facts[0].id);
  expect(provenance.error).toBeNull();
  expect(provenance.data).toHaveLength(1);

  await upload();
  await expect(
    page.getByText("Có thể trùng", { exact: true }).first(),
  ).toBeVisible();
  expect(await readFacts()).toEqual(facts);
  await page.reload();
  expect(await readFacts()).toEqual(facts);

  await page.goto(`/accounts/${accountId}/reconcile`);
  const balance = page.getByLabel("Số dư cuối kỳ");
  // Wait for the existing controlled SSR field to retain input after hydration.
  await expect
    .poll(async () => {
      await balance.fill(String(CLOSING_BALANCE));
      return balance.inputValue();
    })
    .toBe("55.000");
  await page.getByLabel("Ngày kết thúc sao kê").fill(STATEMENT_DATE);
  await page.getByRole("button", { name: "Mở kỳ đối soát" }).click();
  const clear = page.getByRole("button", { name: /^Đánh dấu đã khớp / });
  await expect(clear).toHaveCount(1);
  await clear.click();
  await expect(
    page.getByText("Đã khớp chính xác. Có thể hoàn tất."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Hoàn tất đối soát", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hoàn tất đối soát", exact: true })
    .click();
  // The completed-period heading exists even while the server action is pending.
  await expect(
    page.getByText("Đã hoàn tất kỳ đối soát.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Các kỳ đã hoàn tất" }),
  ).toBeVisible();
  const session = await owner.client
    .from("account_reconciliation_summaries")
    .select("id,status,difference_minor,cleared_balance_minor")
    .eq("account_id", accountId)
    .single();
  expect(session.error).toBeNull();
  expect(session.data).toMatchObject({
    status: "completed",
    difference_minor: 0,
    cleared_balance_minor: CLOSING_BALANCE,
  });
  const locked = await owner.client
    .from("transaction_entries")
    .select("reconciliation_state,reconciliation_id")
    .eq("id", legs.data![0].id)
    .single();
  expect(locked.error).toBeNull();
  expect(locked.data).toMatchObject({
    reconciliation_state: "reconciled",
    reconciliation_id: session.data!.id,
  });
  expect(await readFacts()).toEqual(facts);

  for (const table of [
    "financial_transactions",
    "transaction_import_provenance",
    "account_reconciliations",
  ]) {
    const foreign = await other.client
      .from(table)
      .select(
        table === "transaction_import_provenance" ? "transaction_id" : "id",
      )
      .eq("user_id", owner.id);
    expect(foreign.error).toBeNull();
    expect(foreign.data).toEqual([]);
  }
  const denied = await other.client.rpc("plan_inbox_candidate", {
    p_candidate_id: provenance.data![0].candidate_id,
  });
  expect(denied.error?.message).toContain("candidate_not_found");
  const deniedWrite = await other.client.rpc("approve_inbox_candidate", {
    p_candidate_id: provenance.data![0].candidate_id,
    p_kind: "expense",
    p_account_id: accountId,
    p_category_id: category.data!.id,
    p_destination_account_id: null,
    p_amount_minor: EXPENSE,
    p_occurred_on: "2026-09-09",
    p_note: "Synthetic foreign write must fail",
    p_idempotency_key: randomUUID(),
    p_payee: null,
    p_allow_heuristic_duplicate: false,
  });
  expect(deniedWrite.error?.message).toContain("candidate_not_found");
  expect(await readFacts()).toEqual(facts);
});
