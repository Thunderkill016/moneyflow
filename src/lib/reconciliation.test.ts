import assert from "node:assert/strict";
import test from "node:test";
import type { AccountRegisterEntry } from "./account-register.ts";
import type { Transaction } from "./transactions/contracts.ts";
import {
  buildDemoReconciliationRows,
  calculateOpenSessionSnapshot,
  completeDemoAccountReconciliation,
  emptyReconciliationState,
  mergeAccountReconciliationWorkspace,
  reopenDemoAccountReconciliation,
  setDemoAccountEntryReconciliationState,
  startDemoAccountReconciliation,
} from "./reconciliation.ts";

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
