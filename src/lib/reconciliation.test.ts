import assert from "node:assert/strict";
import test from "node:test";
import type { AccountRegisterEntry } from "./account-register.ts";
import type {
  CategoryOption,
  Transaction,
} from "./transactions/contracts.ts";
import {
  buildDemoReconciliationRows,
  calculateOpenSessionSnapshot,
  completeDemoAccountReconciliation,
  emptyReconciliationState,
  mergeAccountReconciliationWorkspace,
  reconciliationAdjustmentNote,
  reopenDemoAccountReconciliation,
  setDemoAccountEntryReconciliationState,
  startDemoAccountReconciliation,
} from "./reconciliation.ts";

const incomeCategory: CategoryOption = {
  id: "demo-category-income-Tiền lương",
  name: "Tiền lương",
  kind: "income",
  icon: null,
  color: null,
};
const expenseCategory: CategoryOption = {
  id: "demo-category-expense-Phí ngân hàng",
  name: "Phí ngân hàng",
  kind: "expense",
  icon: null,
  color: null,
};

function transaction(
  id: string,
  impact: number,
  occurredOn = "2026-07-14",
): AccountRegisterEntry {
  const kind = impact >= 0 ? "income" : "expense";
  const row: Transaction = {
    id,
    kind,
    categoryId: `category-${id}`,
    category: "Danh mục",
    note: id,
    accountId: "account-a",
    account: "Tài khoản A",
    amount: Math.abs(impact),
    occurredOn,
    occurredAt: `${occurredOn}T01:00:00.000Z`,
    relativeDate: occurredOn,
  };
  return {
    transaction: row,
    impact,
    direction: impact >= 0 ? "in" : "out",
    transferCounterparty: null,
  };
}

const entries = [
  transaction("income", 1_000_000, "2026-07-10"),
  transaction("expense", -250_000, "2026-07-14"),
  transaction("later", -99_000, "2026-08-01"),
];

function demoState() {
  return {
    ...emptyReconciliationState(),
    rows: buildDemoReconciliationRows(entries, "account-a"),
  };
}

test("open snapshot counts only eligible cleared or reconciled account legs", () => {
  const state = demoState();
  state.rows[0] = { ...state.rows[0]!, state: "reconciled", reconciliationId: "older", clearedAt: "now" };
  state.rows[1] = { ...state.rows[1]!, state: "cleared", clearedAt: "now" };
  state.rows[2] = { ...state.rows[2]!, state: "cleared", clearedAt: "now" };
  const workspace = mergeAccountReconciliationWorkspace(entries, state);

  assert.deepEqual(
    calculateOpenSessionSnapshot(100_000, workspace.entries, "2026-07-31"),
    {
      clearedBalance: 850_000,
      pendingAccountLegCount: 0,
      clearedAccountLegCount: 1,
      reconciledAccountLegCount: 1,
    },
  );
});

test("demo flow completes only at exact zero and preserves a completed snapshot", () => {
  const started = startDemoAccountReconciliation({
    stateData: demoState(),
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    statementDate: "2026-07-31",
    statementBalance: 850_000,
    today: "2026-08-03",
    now: "2026-08-03T10:00:00.000Z",
    reconciliationId: "session-one",
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  const first = setDemoAccountEntryReconciliationState({
    stateData: started.stateData,
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    entryId: started.stateData.rows[0]!.entryId,
    state: "cleared",
    now: "2026-08-03T10:01:00.000Z",
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;

  const blocked = completeDemoAccountReconciliation({
    stateData: first.stateData,
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    reconciliationId: "session-one",
    now: "2026-08-03T10:02:00.000Z",
  });
  assert.deepEqual(blocked, {
    ok: false,
    message: "Chênh lệch phải bằng 0 trước khi hoàn tất.",
  });

  const second = setDemoAccountEntryReconciliationState({
    stateData: first.stateData,
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    entryId: first.stateData.rows[1]!.entryId,
    state: "cleared",
    now: "2026-08-03T10:03:00.000Z",
  });
  assert.equal(second.ok, true);
  if (!second.ok) return;

  const completed = completeDemoAccountReconciliation({
    stateData: second.stateData,
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    reconciliationId: "session-one",
    now: "2026-08-03T10:04:00.000Z",
  });
  assert.equal(completed.ok, true);
  if (!completed.ok) return;

  const session = completed.stateData.sessions[0]!;
  assert.equal(session.status, "completed");
  assert.equal(session.clearedBalance, 850_000);
  assert.equal(session.difference, 0);
  assert.deepEqual(
    completed.stateData.rows.map((row) => row.state),
    ["reconciled", "reconciled", "pending"],
  );
});

test("demo completion with a positive difference posts an income adjustment", () => {
  const started = startDemoAccountReconciliation({
    stateData: demoState(),
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    statementDate: "2026-07-31",
    statementBalance: 900_000,
    today: "2026-08-03",
    now: "2026-08-03T10:00:00.000Z",
    reconciliationId: "session-adj",
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;
  // Clearing only the expense leg leaves the statement above the cleared
  // ledger — a positive difference, so the adjustment must be income.
  const cleared = setDemoAccountEntryReconciliationState({
    stateData: started.stateData,
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    entryId: started.stateData.rows[1]!.entryId,
    state: "cleared",
    now: "2026-08-03T10:01:00.000Z",
  });
  assert.equal(cleared.ok, true);
  if (!cleared.ok) return;
  // cleared = 100_000 - 250_000 = -150_000; difference = 900_000 - (-150_000) = 1_050_000
  const completed = completeDemoAccountReconciliation({
    stateData: cleared.stateData,
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    reconciliationId: "session-adj",
    now: "2026-08-03T10:02:00.000Z",
    adjustment: {
      category: incomeCategory,
      accountName: "Tài khoản A",
      transactionId: "adjustment-tx",
      payee: "  Ngân hàng MB  ",
      today: "2026-08-03",
    },
  });
  assert.equal(completed.ok, true);
  if (!completed.ok) return;

  const adjustment = completed.adjustmentTransaction!;
  assert.equal(adjustment.kind, "income");
  assert.equal(adjustment.amount, 1_050_000);
  assert.equal(adjustment.occurredOn, "2026-07-31");
  assert.equal(adjustment.note, "Điều chỉnh đối soát — sao kê 31/07/2026");
  assert.equal(adjustment.payee, "Ngân hàng MB");
  assert.equal(adjustment.categoryId, incomeCategory.id);
  assert.equal(adjustment.accountId, "account-a");

  const session = completed.stateData.sessions[0]!;
  assert.equal(session.status, "completed");
  assert.equal(session.calculatedBalance, 900_000);
  assert.equal(session.difference, 0);
  assert.equal(session.reconciledAccountLegCount, 2);

  const adjustmentRow = completed.stateData.rows.find(
    (row) => row.transactionId === "adjustment-tx",
  );
  assert.ok(adjustmentRow);
  assert.equal(adjustmentRow.state, "reconciled");
  assert.equal(adjustmentRow.reconciliationId, "session-adj");
  assert.equal(adjustmentRow.clearedAt, "2026-08-03T10:02:00.000Z");
});

test("demo completion with a negative difference posts an expense adjustment", () => {
  const started = startDemoAccountReconciliation({
    stateData: demoState(),
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    statementDate: "2026-07-31",
    statementBalance: 800_000,
    today: "2026-08-03",
    now: "2026-08-03T10:00:00.000Z",
    reconciliationId: "session-adj",
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;
  const cleared = setDemoAccountEntryReconciliationState({
    stateData: started.stateData,
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    entryId: started.stateData.rows[0]!.entryId,
    state: "cleared",
    now: "2026-08-03T10:01:00.000Z",
  });
  assert.equal(cleared.ok, true);
  if (!cleared.ok) return;
  // cleared = 100_000 + 1_000_000 = 1_100_000; difference = 800_000 - 1_100_000 = -300_000
  const completed = completeDemoAccountReconciliation({
    stateData: cleared.stateData,
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    reconciliationId: "session-adj",
    now: "2026-08-03T10:02:00.000Z",
    adjustment: {
      category: expenseCategory,
      accountName: "Tài khoản A",
      transactionId: "adjustment-tx",
      today: "2026-08-03",
    },
  });
  assert.equal(completed.ok, true);
  if (!completed.ok) return;
  assert.equal(completed.adjustmentTransaction!.kind, "expense");
  assert.equal(completed.adjustmentTransaction!.amount, 300_000);
  assert.equal(completed.adjustmentTransaction!.payee, undefined);
  assert.equal(completed.stateData.sessions[0]!.calculatedBalance, 800_000);
});

test("demo adjustment rejects a category whose kind does not match the difference", () => {
  const started = startDemoAccountReconciliation({
    stateData: demoState(),
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    statementDate: "2026-07-31",
    statementBalance: 900_000,
    today: "2026-08-03",
    now: "2026-08-03T10:00:00.000Z",
    reconciliationId: "session-adj",
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;
  // difference positive → income required; an expense category must fail
  const rejected = completeDemoAccountReconciliation({
    stateData: started.stateData,
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    reconciliationId: "session-adj",
    now: "2026-08-03T10:02:00.000Z",
    adjustment: {
      category: expenseCategory,
      accountName: "Tài khoản A",
      transactionId: "adjustment-tx",
      today: "2026-08-03",
    },
  });
  assert.deepEqual(rejected, {
    ok: false,
    message:
      "Danh mục điều chỉnh phải cùng loại thu hoặc chi với khoản chênh lệch.",
  });
});

test("demo reopen returns the adjustment leg to cleared", () => {
  const started = startDemoAccountReconciliation({
    stateData: demoState(),
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    statementDate: "2026-07-31",
    statementBalance: 900_000,
    today: "2026-08-03",
    now: "2026-08-03T10:00:00.000Z",
    reconciliationId: "session-adj",
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;
  const cleared = setDemoAccountEntryReconciliationState({
    stateData: started.stateData,
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    entryId: started.stateData.rows[1]!.entryId,
    state: "cleared",
    now: "2026-08-03T10:01:00.000Z",
  });
  assert.equal(cleared.ok, true);
  if (!cleared.ok) return;
  const completed = completeDemoAccountReconciliation({
    stateData: cleared.stateData,
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    reconciliationId: "session-adj",
    now: "2026-08-03T10:02:00.000Z",
    adjustment: {
      category: incomeCategory,
      accountName: "Tài khoản A",
      transactionId: "adjustment-tx",
      today: "2026-08-03",
    },
  });
  assert.equal(completed.ok, true);
  if (!completed.ok) return;

  const reopened = reopenDemoAccountReconciliation({
    stateData: completed.stateData,
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    reconciliationId: "session-adj",
    now: "2026-08-03T11:00:00.000Z",
  });
  assert.equal(reopened.ok, true);
  if (!reopened.ok) return;
  const adjustmentRow = reopened.stateData.rows.find(
    (row) => row.transactionId === "adjustment-tx",
  );
  assert.ok(adjustmentRow);
  assert.equal(adjustmentRow.state, "cleared");
  assert.equal(adjustmentRow.reconciliationId, null);
});

test("demo adjustment note renders the statement date dd/mm/yyyy", () => {
  assert.equal(
    reconciliationAdjustmentNote("2026-09-05"),
    "Điều chỉnh đối soát — sao kê 05/09/2026",
  );
});

test("demo reopen restores only the latest session-owned rows", () => {
  const completedState = demoState();
  completedState.rows[0] = {
    ...completedState.rows[0]!,
    state: "reconciled",
    reconciliationId: "session-one",
    clearedAt: "2026-08-03T10:00:00.000Z",
  };
  completedState.rows[1] = {
    ...completedState.rows[1]!,
    state: "reconciled",
    reconciliationId: "older-session",
    clearedAt: "2026-08-02T10:00:00.000Z",
  };
  completedState.sessions = [
    {
      id: "session-one",
      accountId: "account-a",
      statementDate: "2026-07-31",
      statementBalance: 1_100_000,
      status: "completed",
      calculatedBalance: 1_100_000,
      clearedBalance: 1_100_000,
      difference: 0,
      pendingAccountLegCount: 1,
      clearedAccountLegCount: 0,
      reconciledAccountLegCount: 1,
      startedAt: "2026-08-03T09:00:00.000Z",
      completedAt: "2026-08-03T10:00:00.000Z",
      lastReopenedAt: null,
      createdAt: "2026-08-03T09:00:00.000Z",
      updatedAt: "2026-08-03T10:00:00.000Z",
    },
  ];

  const reopened = reopenDemoAccountReconciliation({
    stateData: completedState,
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 100_000,
    reconciliationId: "session-one",
    now: "2026-08-03T11:00:00.000Z",
  });
  assert.equal(reopened.ok, true);
  if (!reopened.ok) return;

  assert.equal(reopened.stateData.sessions[0]!.status, "open");
  assert.equal(reopened.stateData.rows[0]!.state, "cleared");
  assert.equal(reopened.stateData.rows[1]!.state, "reconciled");
});

test("a second open demo session is rejected", () => {
  const started = startDemoAccountReconciliation({
    stateData: demoState(),
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 0,
    statementDate: "2026-07-31",
    statementBalance: 0,
    today: "2026-08-03",
    now: "now",
    reconciliationId: "open",
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  const duplicate = startDemoAccountReconciliation({
    stateData: started.stateData,
    registerEntries: entries,
    accountId: "account-a",
    initialBalance: 0,
    statementDate: "2026-08-01",
    statementBalance: 0,
    today: "2026-08-03",
    now: "later",
    reconciliationId: "other",
  });
  assert.equal(duplicate.ok, false);
});
