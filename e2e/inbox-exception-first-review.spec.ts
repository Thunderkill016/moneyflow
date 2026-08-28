import { expect, test } from "@playwright/test";

const CANDIDATE_KEY = "moneyflow-inbox-candidates-v1";
const TRANSACTION_KEY = "moneyflow-demo-transactions-v1";

const candidates = [
  {
    id: "ready-1",
    kind: "expense",
    amount: 41_000,
    merchant: "Ready Coffee",
    note: "READY_ONE",
    occurredOn: "2026-08-28",
    source: "csv",
    confidence: "high",
    status: "pending",
    categoryId: "demo-category-expense-Ăn uống",
    category: "Ăn uống",
    accountId: "demo-account-cash",
    account: "Tiền mặt",
    createdAt: "2026-08-28T01:00:00.000Z",
  },
  {
    id: "ready-2",
    kind: "expense",
    amount: 82_000,
    merchant: "Ready Ride",
    note: "READY_TWO",
    occurredOn: "2026-08-27",
    source: "csv",
    confidence: "medium",
    status: "pending",
    categoryId: "demo-category-expense-Di chuyển",
    category: "Di chuyển",
    accountId: "demo-account-mb",
    account: "MB Bank",
    createdAt: "2026-08-28T01:01:00.000Z",
  },
  {
    id: "ready-3",
    kind: "income",
    amount: 9_123_456,
    merchant: "Ready Salary",
    note: "READY_THREE",
    occurredOn: "2026-08-26",
    source: "csv",
    confidence: "high",
    status: "pending",
    categoryId: "demo-category-income-Lương",
    category: "Lương",
    accountId: "demo-account-mb",
    account: "MB Bank",
    createdAt: "2026-08-28T01:02:00.000Z",
  },
  {
    id: "attention-low",
    kind: "expense",
    amount: 53_000,
    merchant: "Low Confidence",
    note: "ATTENTION_LOW",
    occurredOn: "2026-08-25",
    source: "csv",
    confidence: "low",
    status: "pending",
    categoryId: "demo-category-expense-Ăn uống",
    category: "Ăn uống",
    accountId: "demo-account-cash",
    account: "Tiền mặt",
    createdAt: "2026-08-28T01:03:00.000Z",
  },
  {
    id: "attention-duplicate",
    kind: "expense",
    amount: 64_000,
    merchant: "Possible Duplicate",
    note: "ATTENTION_DUPLICATE",
    occurredOn: "2026-08-24",
    source: "csv",
    confidence: "high",
    status: "pending",
    possibleDuplicate: true,
    categoryId: "demo-category-expense-Ăn uống",
    category: "Ăn uống",
    accountId: "demo-account-cash",
    account: "Tiền mặt",
    createdAt: "2026-08-28T01:04:00.000Z",
  },
  {
    id: "attention-transfer",
    kind: "transfer",
    amount: 75_000,
    merchant: "Internal Transfer",
    note: "ATTENTION_TRANSFER",
    occurredOn: "2026-08-23",
    source: "csv",
    confidence: "high",
    status: "pending",
    accountId: "demo-account-mb",
    account: "MB Bank",
    createdAt: "2026-08-28T01:05:00.000Z",
  },
] as const;

test("mixed batch selects and posts only Ready candidates after explicit confirmation", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, seed }) => {
      localStorage.setItem(key, JSON.stringify(seed));
      localStorage.removeItem("moneyflow-demo-transactions-v1");
    },
    { key: CANDIDATE_KEY, seed: candidates },
  );

  await page.goto("/inbox");

  await expect(page.getByText("Sẵn sàng").first()).toBeVisible();
  await expect(page.getByText("Cần xem lại").first()).toBeVisible();
  const selectReady = page.getByRole("button", { name: "Chọn Sẵn sàng (3)", exact: true });
  await expect(selectReady).toBeEnabled();

  // The pre-#511 UI already had a three-activation bulk path via Chọn tất cả.
  // This test proves the same explicit-review path now selects only deterministic
  // Ready rows; it does not claim a general click-count or manual-entry reduction.
  await selectReady.click();
  await expect(page.getByText("Đã chọn 3 ứng viên")).toBeVisible();

  const bulkBar = page.locator('[data-slot="inbox-bulk-review"]');
  await bulkBar.getByRole("button", { name: "Xem lại", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Xác nhận hành động hàng loạt" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("3 giao dịch")).toBeVisible();
  await expect(dialog.getByText("0 ứng viên")).toBeVisible();

  await dialog.getByRole("button", { name: "Duyệt vào sổ" }).click();
  await expect(page.getByText(/Đã duyệt 3/)).toBeVisible();

  const state = await page.evaluate(
    ({ candidateKey, transactionKey }) => {
      const savedCandidates = JSON.parse(localStorage.getItem(candidateKey) ?? "[]") as Array<{
        id: string;
        status: string;
      }>;
      const savedTransactions = JSON.parse(
        localStorage.getItem(transactionKey) ?? "[]",
      ) as Array<{ note?: string }>;
      return {
        statuses: Object.fromEntries(
          savedCandidates.map((item) => [item.id, item.status]),
        ),
        notes: savedTransactions.map((item) => item.note ?? ""),
      };
    },
    { candidateKey: CANDIDATE_KEY, transactionKey: TRANSACTION_KEY },
  );

  expect(state.statuses["ready-1"]).toBe("approved");
  expect(state.statuses["ready-2"]).toBe("approved");
  expect(state.statuses["ready-3"]).toBe("approved");
  expect(state.statuses["attention-low"]).toBe("pending");
  expect(state.statuses["attention-duplicate"]).toBe("pending");
  expect(state.statuses["attention-transfer"]).toBe("pending");

  expect(state.notes).toContain("READY_ONE");
  expect(state.notes).toContain("READY_TWO");
  expect(state.notes).toContain("READY_THREE");
  expect(state.notes).not.toContain("ATTENTION_LOW");
  expect(state.notes).not.toContain("ATTENTION_DUPLICATE");
  expect(state.notes).not.toContain("ATTENTION_TRANSFER");

  await page.getByRole("button", { name: "Cần xem lại", exact: true }).click();
  await expect(page.locator('[data-slot="inbox-candidate-row"]')).toHaveCount(3);
});
