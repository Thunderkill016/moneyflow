import { expect, test } from "@playwright/test";
import { demoLedger, demoSalary } from "./support/demo-ledger.ts";

const CANDIDATE_KEY = "moneyflow-inbox-candidates-v1";
const TRANSACTION_KEY = "moneyflow-demo-transactions-v1";
const OCCURRENCE_KEY = "moneyflow-demo-commitment-occurrences-v1";

/*
 * The demo workspace injects due commitment suggestions into Inbox. Marking
 * every unpaid seed paid for the current Vietnam month keeps suggestion rows
 * out of these tests so row-level assertions stay deterministic.
 */
function vietnamMonthStart(): string {
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  return `${month}-01`;
}

function paidDemoCommitments(monthStart: string) {
  return {
    [monthStart]: {
      "demo-internet": "txn-e2e-internet",
      "demo-electricity": "txn-e2e-electricity",
    },
  };
}

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
  // Ready count is dynamic: a due unpaid demo commitment adds a reviewable
  // suggestion row on top of the seeded candidates (e.g. Internet due day 18).
  const selectReady = page.getByRole("button", {
    name: /Chọn Sẵn sàng \(\d+\)/,
  });
  await expect(selectReady).toBeEnabled();
  const readyCount = Number(
    (await selectReady.textContent())?.match(/\((\d+)\)/)?.[1],
  );
  expect(readyCount).toBeGreaterThanOrEqual(3);

  // The pre-#511 UI already had a three-activation bulk path via Chọn tất cả.
  // This test proves the same explicit-review path now selects only deterministic
  // Ready rows; it does not claim a general click-count or manual-entry reduction.
  await selectReady.click();

  const bulkBar = page.locator('[data-slot="inbox-bulk-review"]');
  await expect(
    bulkBar.getByText(`Đã chọn ${readyCount} ứng viên`, { exact: true }),
  ).toBeVisible();
  await bulkBar.getByRole("button", { name: "Xem lại", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Xác nhận hành động hàng loạt",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(`${readyCount} giao dịch`)).toBeVisible();
  await expect(dialog.getByText("0 ứng viên")).toBeVisible();

  await dialog.getByRole("button", { name: "Duyệt vào sổ" }).click();
  await expect(
    page.getByText(new RegExp(`Đã duyệt ${readyCount}`)),
  ).toBeVisible();

  const state = await page.evaluate(
    ({ candidateKey, transactionKey }) => {
      const savedCandidates = JSON.parse(
        localStorage.getItem(candidateKey) ?? "[]",
      ) as Array<{
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
  await expect(page.locator('[data-slot="inbox-candidate-row"]')).toHaveCount(
    3,
  );
});

test("a Ready row confirms in one tap; Cần xem lại rows keep review only", async ({
  page,
}) => {
  await page.addInitScript(
    ({ candidateKey, transactionKey, occurrenceKey, occurrences, seed }) => {
      localStorage.setItem(candidateKey, JSON.stringify(seed));
      localStorage.removeItem(transactionKey);
      localStorage.setItem(occurrenceKey, JSON.stringify(occurrences));
    },
    {
      candidateKey: CANDIDATE_KEY,
      transactionKey: TRANSACTION_KEY,
      occurrenceKey: OCCURRENCE_KEY,
      occurrences: paidDemoCommitments(vietnamMonthStart()),
      seed: [candidates[0], candidates[3]],
    },
  );

  await page.goto("/inbox");

  const confirm = page.getByRole("button", { name: "Xác nhận Ready Coffee" });
  await expect(confirm).toBeVisible();
  await expect(confirm).toBeEnabled();
  // One-tap confirm never appears on rows that still need review — the
  // review dialog stays their single door.
  await expect(
    page.getByRole("button", { name: "Xác nhận Low Confidence" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Duyệt Low Confidence" }),
  ).toBeVisible();

  await confirm.click();

  await expect(page.getByText(/Đã duyệt .+ vào sổ\./)).toBeVisible();

  const state = await page.evaluate(
    ({ candidateKey, transactionKey }) => {
      const savedCandidates = JSON.parse(
        localStorage.getItem(candidateKey) ?? "[]",
      ) as Array<{ id: string; status: string }>;
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
  expect(state.statuses["attention-low"]).toBe("pending");
  expect(state.notes).toContain("READY_ONE");
  expect(state.notes).not.toContain("ATTENTION_LOW");
});

test("an unresolved account cannot be posted until the reviewer selects it", async ({
  page,
}) => {
  await page.addInitScript(
    ({ candidateKey, transactionKey, occurrenceKey, occurrences, seed }) => {
      localStorage.setItem(candidateKey, JSON.stringify(seed));
      localStorage.removeItem(transactionKey);
      localStorage.setItem(occurrenceKey, JSON.stringify(occurrences));
    },
    {
      candidateKey: CANDIDATE_KEY,
      transactionKey: TRANSACTION_KEY,
      occurrenceKey: OCCURRENCE_KEY,
      occurrences: paidDemoCommitments(vietnamMonthStart()),
      seed: [
        {
          ...candidates[0],
          id: "unresolved-account",
          accountId: undefined,
          account: undefined,
        },
      ],
    },
  );

  await page.goto("/inbox");
  await page.getByRole("button", { name: "Duyệt Ready Coffee" }).click();
  const dialog = page.getByRole("dialog", { name: "Duyệt giao dịch" });
  const account = dialog.getByLabel("Tài khoản", { exact: true });
  await expect(account).toHaveValue("");
  await expect(account).toBeFocused();
  await expect(
    dialog.getByText("Chọn tài khoản trước khi duyệt vào sổ."),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Duyệt vào sổ" }).click();
  await expect(
    dialog.getByText("Chọn tài khoản trước khi duyệt."),
  ).toBeVisible();
  const pending = await page.evaluate(
    ({ candidateKey, transactionKey }) => ({
      candidates: JSON.parse(
        localStorage.getItem(candidateKey) ?? "[]",
      ) as Array<{
        status: string;
      }>,
      transactions: JSON.parse(
        localStorage.getItem(transactionKey) ?? "[]",
      ) as Array<{
        accountId: string;
        note: string;
      }>,
    }),
    { candidateKey: CANDIDATE_KEY, transactionKey: TRANSACTION_KEY },
  );
  expect(pending.candidates[0]?.status).toBe("pending");
  expect(pending.transactions).toHaveLength(0);

  await account.selectOption("demo-account-cash");
  await dialog.getByRole("button", { name: "Duyệt vào sổ" }).click();
  await expect(page.getByText(/Đã duyệt .+ vào sổ\./)).toBeVisible();
  const posted = await page.evaluate(
    ({ candidateKey, transactionKey }) => ({
      candidates: JSON.parse(
        localStorage.getItem(candidateKey) ?? "[]",
      ) as Array<{
        status: string;
      }>,
      transactions: JSON.parse(
        localStorage.getItem(transactionKey) ?? "[]",
      ) as Array<{
        accountId: string;
        note: string;
      }>,
    }),
    { candidateKey: CANDIDATE_KEY, transactionKey: TRANSACTION_KEY },
  );
  expect(posted.candidates[0]?.status).toBe("approved");
  expect(
    posted.transactions.find((item) => item.note === "READY_ONE")?.accountId,
  ).toBe("demo-account-cash");
});

test("an unresolved category stays blank until the reviewer selects it", async ({
  page,
}) => {
  await page.addInitScript(
    ({ candidateKey, transactionKey, occurrenceKey, occurrences, seed }) => {
      localStorage.setItem(candidateKey, JSON.stringify(seed));
      localStorage.removeItem(transactionKey);
      localStorage.setItem(occurrenceKey, JSON.stringify(occurrences));
    },
    {
      candidateKey: CANDIDATE_KEY,
      transactionKey: TRANSACTION_KEY,
      occurrenceKey: OCCURRENCE_KEY,
      occurrences: paidDemoCommitments(vietnamMonthStart()),
      seed: [
        {
          ...candidates[0],
          id: "unresolved-category",
          categoryId: undefined,
          category: undefined,
        },
      ],
    },
  );

  await page.goto("/inbox");
  await page.getByRole("button", { name: "Duyệt Ready Coffee" }).click();
  const dialog = page.getByRole("dialog", { name: "Duyệt giao dịch" });
  const category = dialog.getByLabel("Danh mục", { exact: true });
  await expect(category).toHaveValue("");
  await expect(category).toBeFocused();
  await expect(dialog.getByLabel("Tài khoản", { exact: true })).toHaveValue(
    "demo-account-cash",
  );

  await dialog.getByRole("button", { name: "Duyệt vào sổ" }).click();
  await expect(
    dialog.getByText("Chọn danh mục khớp loại thu/chi."),
  ).toBeVisible();
  await category.selectOption("demo-category-expense-Ăn uống");
  await dialog.getByRole("button", { name: "Duyệt vào sổ" }).click();
  await expect(page.getByText(/Đã duyệt .+ vào sổ\./)).toBeVisible();
});

for (const candidateId of [
  "attention-transfer",
  "9a20255a-1882-480d-aea1-a07e10b6dc27",
]) {
  test(`a demo transfer keeps explicit destination and retry identity (${candidateId})`, async ({
    page,
  }) => {
    await page.addInitScript(
      ({ candidateKey, transactionKey, occurrenceKey, occurrences, seed }) => {
        localStorage.setItem(candidateKey, JSON.stringify(seed));
        localStorage.removeItem(transactionKey);
        localStorage.setItem(occurrenceKey, JSON.stringify(occurrences));
      },
      {
        candidateKey: CANDIDATE_KEY,
        transactionKey: TRANSACTION_KEY,
        occurrenceKey: OCCURRENCE_KEY,
        occurrences: paidDemoCommitments(vietnamMonthStart()),
        seed: [{ ...candidates[5], id: candidateId }],
      },
    );

    await page.goto("/inbox");
    await page.getByRole("button", { name: "Duyệt Internal Transfer" }).click();
    const dialog = page.getByRole("dialog", { name: "Duyệt giao dịch" });
    await expect(dialog.getByLabel("Từ tài khoản")).toHaveValue(
      "demo-account-mb",
    );
    const destination = dialog.getByLabel("Đến tài khoản");
    await expect(destination).toHaveValue("");
    await expect(destination).toBeFocused();

    await destination.selectOption("demo-account-cash");
    await expect(destination).toHaveValue("demo-account-cash");
    const stored = await page.evaluate(
      ({ candidateKey, transactionKey }) => ({
        candidates: JSON.parse(
          localStorage.getItem(candidateKey) ?? "[]",
        ) as Array<{
          status: string;
        }>,
        transactions: localStorage.getItem(transactionKey),
      }),
      { candidateKey: CANDIDATE_KEY, transactionKey: TRANSACTION_KEY },
    );
    expect(stored.candidates[0]?.status).toBe("pending");
    expect(stored.transactions).toBeNull();
    await dialog.getByRole("button", { name: "Duyệt vào sổ" }).click();
    await expect(page.getByText(/Đã duyệt .+ vào sổ\./)).toBeVisible();
    const posted = await page.evaluate(
      (key) =>
        JSON.parse(localStorage.getItem(key) ?? "[]") as Array<{
          id: string;
          kind: string;
          accountId: string;
          destinationAccountId: string;
          amount: number;
        }>,
      TRANSACTION_KEY,
    );
    expect(posted.filter((item) => item.id === candidateId)).toEqual([
      expect.objectContaining({
        kind: "transfer",
        accountId: "demo-account-mb",
        destinationAccountId: "demo-account-cash",
        amount: 75_000,
      }),
    ]);
    // Simulate a lost candidate-status write after the ledger save. A new page
    // avoids this test's initial seed script and exercises the persisted retry.
    await page.evaluate((key) => {
      const rows = JSON.parse(localStorage.getItem(key) ?? "[]");
      rows[0].status = "pending";
      localStorage.setItem(key, JSON.stringify(rows));
    }, CANDIDATE_KEY);
    const retryPage = await page.context().newPage();
    await retryPage.goto("/inbox");
    await retryPage
      .getByRole("button", { name: "Duyệt Internal Transfer" })
      .click();
    const retryDialog = retryPage.getByRole("dialog", {
      name: "Duyệt giao dịch",
    });
    await retryDialog
      .getByLabel("Đến tài khoản")
      .selectOption("demo-account-cash");
    await retryDialog.getByRole("button", { name: "Duyệt vào sổ" }).click();
    await expect(retryPage.getByText(/Đã duyệt .+ vào sổ\./)).toBeVisible();
    const retryIds = await retryPage.evaluate(
      (key) =>
        (
          JSON.parse(localStorage.getItem(key) ?? "[]") as Array<{ id: string }>
        ).map((item) => item.id),
      TRANSACTION_KEY,
    );
    expect(retryIds.filter((id) => id === candidateId)).toHaveLength(1);
    await retryPage.close();
  });
}

test("a fully cleared inbox shows the done state, not a bare empty list", async ({
  page,
}) => {
  await page.addInitScript(
    ({ candidateKey, transactionKey, occurrenceKey, occurrences }) => {
      localStorage.setItem(candidateKey, JSON.stringify([]));
      localStorage.removeItem(transactionKey);
      localStorage.setItem(occurrenceKey, JSON.stringify(occurrences));
    },
    {
      candidateKey: CANDIDATE_KEY,
      transactionKey: TRANSACTION_KEY,
      occurrenceKey: OCCURRENCE_KEY,
      occurrences: paidDemoCommitments(vietnamMonthStart()),
    },
  );

  await page.goto("/inbox");

  await expect(
    page.getByRole("heading", { name: "Đã xử lý hết" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Không còn ứng viên nào chờ duyệt/),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Dán nội dung" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Nạp dữ liệu mẫu" }),
  ).toBeVisible();
});

// One persistent synthetic book: the source upload, reviewer decision, replay
// warning and reconciliation must agree without resetting state between tasks.
test("statement upload, exception review, re-import and reconciliation share one ledger", async ({
  page,
}) => {
  const merchant = "PHASE_A_SYNTHETIC_CAFE";
  const amount = 45_000;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
  // Freeze the represented statement's starting book; historical demo rows
  // outside this salary period must not be cleared against its opening snapshot.
  const baseline = demoLedger().filter(
    (row) =>
      row.accountId !== "demo-account-mb" ||
      row.occurredOn >= demoSalary().occurredOn,
  );
  const openingBalance = 1_126_000; // MB demo opening snapshot in src/server/accounts.ts.
  const baselineBalance =
    openingBalance +
    baseline
      .filter((row) => row.accountId === "demo-account-mb")
      .reduce(
        (sum, row) => sum + (row.kind === "income" ? row.amount : -row.amount),
        0,
      );
  await page.addInitScript(
    ({ key, paid, occurrences, ledgerKey, baseline }) => {
      if (localStorage.getItem("__mf_statement_journey_seeded")) return;
      localStorage.clear();
      localStorage.setItem(key, "[]");
      localStorage.setItem(ledgerKey, JSON.stringify(baseline));
      localStorage.setItem(paid, JSON.stringify(occurrences));
      localStorage.setItem("moneyflow-onboarding-done", "1");
      localStorage.setItem("__mf_statement_journey_seeded", "1");
    },
    {
      key: CANDIDATE_KEY,
      ledgerKey: TRANSACTION_KEY,
      baseline,
      paid: OCCURRENCE_KEY,
      occurrences: paidDemoCommitments(vietnamMonthStart()),
    },
  );

  async function uploadStatement() {
    await page.goto("/capture/upload");
    await page.locator('input[type="file"]').setInputFiles({
      name: "phase-a-synthetic.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `Ngày,Mô tả,Số tiền\n${today},${merchant},-${amount}`,
        "utf8",
      ),
    });
    await expect(page).toHaveURL(/\/imports\/.+\/preview$/);
    await page
      .getByLabel("Sao kê này thuộc tài khoản")
      .selectOption("demo-account-mb");
    await page.getByRole("button", { name: "Xem lại đưa vào Inbox" }).click();
    const confirm = page.getByRole("dialog", { name: "Đưa batch vào Inbox?" });
    await confirm
      .getByRole("button", { name: "Đưa vào Inbox", exact: true })
      .click();
    await expect(page).toHaveURL(/\/inbox$/);
  }

  await uploadStatement();
  await page.getByRole("button", { name: `Duyệt ${merchant}` }).click();
  const review = page.getByRole("dialog", { name: "Duyệt giao dịch" });
  await expect(review.getByLabel("Tài khoản", { exact: true })).toHaveValue(
    "demo-account-mb",
  );
  await expect(review.getByLabel("Danh mục", { exact: true })).toHaveValue("");
  await review
    .getByLabel("Danh mục", { exact: true })
    .selectOption("demo-category-expense-Ăn uống");
  await review.getByRole("button", { name: "Duyệt vào sổ" }).click();
  await expect(page.getByText(/Đã duyệt .+ vào sổ\./)).toBeVisible();

  async function importedRows() {
    return page.evaluate(
      ({ key, merchant }) => {
        const rows = JSON.parse(localStorage.getItem(key) ?? "[]") as Array<{
          id: string;
          note: string;
          amount: number;
          accountId: string;
        }>;
        return rows.filter((row) => row.note.includes(merchant));
      },
      { key: TRANSACTION_KEY, merchant },
    );
  }
  const confirmed = await importedRows();
  expect(confirmed).toHaveLength(1);
  expect(confirmed[0]).toMatchObject({ amount, accountId: "demo-account-mb" });

  await uploadStatement();
  await expect(
    page.getByText("Có thể trùng", { exact: true }).first(),
  ).toBeVisible();
  expect(await importedRows()).toEqual(confirmed);
  await page.reload();
  expect(await importedRows()).toEqual(confirmed);

  await page.goto("/accounts/demo-account-mb/reconcile");
  // Independent synthetic statement truth: frozen opening + baseline - imported debit.
  const statementBalance = baselineBalance - amount;
  const balance = page.getByLabel("Số dư cuối kỳ");
  // The SSR field appears before its controlled client handler hydrates; use
  // the established reconciliation harness contract to wait for retained input.
  await expect
    .poll(async () => {
      await balance.fill(String(statementBalance));
      return balance.inputValue();
    })
    .toBe("15.732.000");
  await page.getByLabel("Ngày kết thúc sao kê").fill(today);
  await page.getByRole("button", { name: "Mở kỳ đối soát" }).click();
  const clear = page.getByRole("button", { name: /^Đánh dấu đã khớp / });
  const expectedRows =
    baseline.filter((row) => row.accountId === "demo-account-mb").length +
    confirmed.length;
  await expect(clear).toHaveCount(expectedRows);
  for (let index = 0; index < expectedRows; index += 1)
    await clear.first().click();
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
  await expect(
    page.getByRole("heading", { name: "Các kỳ đã hoàn tất" }),
  ).toBeVisible();
  expect(await importedRows()).toEqual(confirmed);
});
