import assert from "node:assert/strict";
import test from "node:test";
import type { AccountOption, Transaction } from "./transactions/contracts.ts";
import {
  buildRunningBalance,
  resolveRegisterBalanceScope,
  type RegisterBalanceScope,
} from "./running-balance.ts";

function transaction(
  overrides: Partial<Transaction> & Pick<Transaction, "id" | "kind" | "amount">,
): Transaction {
  return {
    id: overrides.id,
    kind: overrides.kind,
    amount: overrides.amount,
    categoryId: overrides.categoryId ?? "category",
    category:
      overrides.category ??
      (overrides.kind === "transfer" ? "Chuyển tiền" : "Danh mục"),
    note: overrides.note ?? "Giao dịch",
    accountId: overrides.accountId ?? "account-a",
    account: overrides.account ?? "Tài khoản A",
    destinationAccountId: overrides.destinationAccountId,
    destinationAccount: overrides.destinationAccount,
    occurredOn: overrides.occurredOn ?? "2026-08-02",
    occurredAt: overrides.occurredAt ?? "2026-08-02T10:00:00.000Z",
    relativeDate: overrides.relativeDate ?? "Hôm nay",
  };
}

function account(
  overrides: Partial<AccountOption> & Pick<AccountOption, "id" | "name">,
): AccountOption {
  return {
    id: overrides.id,
    name: overrides.name,
    currencyCode: overrides.currencyCode ?? "VND",
    balance: overrides.balance ?? 0,
  };
}

const ACCOUNTS: AccountOption[] = [
  account({ id: "account-a", name: "Tài khoản A", balance: 1_000_000 }),
  account({ id: "account-b", name: "Tài khoản B", balance: 500_000 }),
  account({ id: "account-usd", name: "USD", currencyCode: "USD", balance: 200 }),
];

function scope(overrides: Partial<RegisterBalanceScope> = {}): RegisterBalanceScope {
  return {
    accountId: overrides.accountId ?? "account-a",
    accountName: overrides.accountName ?? "Tài khoản A",
    currencyCode: overrides.currencyCode ?? "VND",
    snapshotBalance: overrides.snapshotBalance ?? 1_000_000,
  };
}

test("scope resolves only when the selected name maps to exactly one account with a known balance", () => {
  assert.equal(resolveRegisterBalanceScope("all", ACCOUNTS), null);
  assert.equal(resolveRegisterBalanceScope("Không có", ACCOUNTS), null);
  assert.equal(
    resolveRegisterBalanceScope("Tài khoản A", [
      account({ id: "a1", name: "Tài khoản A" }),
      account({ id: "a2", name: "Tài khoản A" }),
    ]),
    null,
    "a shared name would mix two ledgers into one total",
  );
  assert.equal(
    resolveRegisterBalanceScope("Tài khoản A", [
      { id: "a1", name: "Tài khoản A", currencyCode: "VND" },
    ]),
    null,
    "an unknown balance is not a zero balance",
  );

  assert.deepEqual(resolveRegisterBalanceScope("Tài khoản A", ACCOUNTS), {
    accountId: "account-a",
    accountName: "Tài khoản A",
    currencyCode: "VND",
    snapshotBalance: 1_000_000,
  });
  assert.equal(
    resolveRegisterBalanceScope("USD", ACCOUNTS)?.currencyCode,
    "USD",
  );
});

test("balance-after walks the newest-first display order from the reconciled anchor", () => {
  // Baseline and live lists match, so the anchor is the snapshot itself.
  const ledger = [
    transaction({
      id: "newest-expense",
      kind: "expense",
      amount: 120_000,
      occurredOn: "2026-08-02",
      occurredAt: "2026-08-02T12:00:00.000Z",
    }),
    transaction({
      id: "newest-income",
      kind: "income",
      amount: 500_000,
      occurredOn: "2026-08-02",
      occurredAt: "2026-08-02T08:00:00.000Z",
    }),
    transaction({
      id: "older-expense",
      kind: "expense",
      amount: 50_000,
      occurredOn: "2026-07-31",
    }),
  ];

  const result = buildRunningBalance(ledger, ledger, scope(), ACCOUNTS);
  assert.ok(result);

  // Anchor 1_000_000: newest row = current balance, then unwind downward.
  assert.equal(result.balanceAfter.get("newest-expense"), 1_000_000);
  assert.equal(result.balanceAfter.get("newest-income"), 1_120_000);
  assert.equal(result.balanceAfter.get("older-expense"), 620_000);
});

test("transfer legs move the scoped account in both directions without becoming income or expense", () => {
  const ledger = [
    transaction({
      id: "transfer-in",
      kind: "transfer",
      amount: 80_000,
      accountId: "account-b",
      account: "Tài khoản B",
      destinationAccountId: "account-a",
      destinationAccount: "Tài khoản A",
      occurredAt: "2026-08-02T12:00:00.000Z",
    }),
    transaction({
      id: "transfer-out",
      kind: "transfer",
      amount: 100_000,
      accountId: "account-a",
      account: "Tài khoản A",
      destinationAccountId: "account-b",
      destinationAccount: "Tài khoản B",
      occurredAt: "2026-08-02T08:00:00.000Z",
    }),
  ];

  const result = buildRunningBalance(ledger, ledger, scope(), ACCOUNTS);
  assert.ok(result);

  // In-leg newest: 1_000_000 after it; unwind +80_000 → 920_000 before it;
  // out-leg: balance after = 920_000 (its −100_000 lands on the row below).
  assert.equal(result.balanceAfter.get("transfer-in"), 1_000_000);
  assert.equal(result.balanceAfter.get("transfer-out"), 920_000);
});

test("rows outside the scoped account are absent and never touch the total", () => {
  const ledger = [
    transaction({ id: "mine", kind: "income", amount: 300_000 }),
    transaction({
      id: "other-account",
      kind: "expense",
      amount: 999_999,
      accountId: "account-b",
      account: "Tài khoản B",
      occurredAt: "2026-08-02T09:00:00.000Z",
    }),
  ];

  const result = buildRunningBalance(ledger, ledger, scope(), ACCOUNTS);
  assert.ok(result);
  assert.equal(result.balanceAfter.has("other-account"), false);
  assert.equal(result.balanceAfter.get("mine"), 1_000_000);
});

test("session delta reconciles the snapshot so new and edited rows stay consistent", () => {
  const baseline = [
    transaction({ id: "seed-income", kind: "income", amount: 100_000 }),
  ];
  // Live ledger gained a 40_000 expense the snapshot never saw.
  const live = [
    transaction({
      id: "new-expense",
      kind: "expense",
      amount: 40_000,
      occurredAt: "2026-08-02T11:00:00.000Z",
    }),
    ...baseline,
  ];

  const result = buildRunningBalance(live, baseline, scope(), ACCOUNTS);
  assert.ok(result);

  // Anchor: 1_000_000 + (100_000 − 40_000) − 100_000 = 960_000.
  assert.equal(result.balanceAfter.get("new-expense"), 960_000);
  assert.equal(result.balanceAfter.get("seed-income"), 1_000_000);
});

test("a filtered-out row keeps its register balance — the column is ledger truth, not visible-sum", () => {
  const ledger = [
    transaction({
      id: "visible-new",
      kind: "expense",
      amount: 10_000,
      occurredAt: "2026-08-02T12:00:00.000Z",
    }),
    transaction({
      id: "hidden-middle",
      kind: "income",
      amount: 400_000,
      occurredAt: "2026-08-02T09:00:00.000Z",
    }),
    transaction({
      id: "visible-old",
      kind: "expense",
      amount: 20_000,
      occurredAt: "2026-08-02T07:00:00.000Z",
    }),
  ];

  const result = buildRunningBalance(ledger, ledger, scope(), ACCOUNTS);
  assert.ok(result);

  // Even if "hidden-middle" is filtered out of view, the shown rows still
  // carry their true balance-after: 1_000_000 and 610_000.
  assert.equal(result.balanceAfter.get("visible-new"), 1_000_000);
  assert.equal(result.balanceAfter.get("visible-old"), 610_000);
});

test("a cross-currency transfer leg voids only the rows below it", () => {
  const ledger = [
    transaction({
      id: "after-fx",
      kind: "income",
      amount: 10_000,
      occurredAt: "2026-08-02T12:00:00.000Z",
    }),
    transaction({
      id: "fx-transfer",
      kind: "transfer",
      amount: 50_000,
      accountId: "account-a",
      destinationAccountId: "account-usd",
      destinationAccount: "USD",
      occurredAt: "2026-08-02T10:00:00.000Z",
    }),
    transaction({
      id: "before-fx",
      kind: "expense",
      amount: 30_000,
      occurredAt: "2026-08-02T08:00:00.000Z",
    }),
  ];

  const result = buildRunningBalance(ledger, ledger, scope(), ACCOUNTS);
  assert.ok(result);

  assert.equal(result.balanceAfter.get("after-fx"), 1_000_000);
  // The leg itself is still exact: its own impact is not yet subtracted.
  assert.equal(result.balanceAfter.get("fx-transfer"), 990_000);
  // Older rows would have to subtract an amount in an unknown currency.
  assert.equal(result.balanceAfter.get("before-fx"), null);
});

test("an unknown counterparty stays trusted — the ledger enforces same-currency at write time", () => {
  const ledger = [
    transaction({
      id: "to-archived",
      kind: "transfer",
      amount: 25_000,
      accountId: "account-a",
      destinationAccountId: "account-archived",
      destinationAccount: "Ví cũ",
    }),
  ];

  const result = buildRunningBalance(ledger, ledger, scope(), ACCOUNTS);
  assert.ok(result);
  assert.equal(result.balanceAfter.get("to-archived"), 1_000_000);
});

test("unsafe snapshot arithmetic fails closed instead of printing a wrong balance", () => {
  assert.equal(
    buildRunningBalance(
      [],
      [],
      scope({ snapshotBalance: Number.MAX_SAFE_INTEGER + 5 }),
      ACCOUNTS,
    ),
    null,
  );

  // Snapshot valid but reconciliation overflows: baseline net movement is
  // beyond integer range, so the whole column refuses rather than guesses.
  const huge = [
    transaction({
      id: "huge",
      kind: "income",
      amount: Number.MAX_SAFE_INTEGER - 10,
    }),
  ];
  assert.equal(buildRunningBalance(huge, [], scope(), ACCOUNTS), null);
});

test("an empty register produces an empty column, not a fabricated balance", () => {
  const result = buildRunningBalance([], [], scope(), ACCOUNTS);
  assert.ok(result);
  assert.equal(result.balanceAfter.size, 0);
  assert.equal(result.currencyCode, "VND");
});
