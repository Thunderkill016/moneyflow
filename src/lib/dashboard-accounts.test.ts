import assert from "node:assert/strict";
import test from "node:test";
import {
  reconcileAccountBalances,
  type AccountBalanceRow,
} from "./dashboard-accounts.ts";
import type { Transaction } from "./transactions/contracts.ts";

const tx = (over: Partial<Transaction>): Transaction => ({
  id: "t1",
  kind: "expense",
  categoryId: "c1",
  category: "Ăn uống",
  note: "test",
  accountId: "a-cash",
  account: "Tiền mặt",
  amount: 50_000,
  occurredOn: "2026-09-21",
  occurredAt: "2026-09-21T08:00:00Z",
  relativeDate: "Hôm nay",
  ...over,
});

const rows: AccountBalanceRow[] = [
  { id: "a-bank", name: "MB Bank", balance: 15_454_000, currencyCode: "VND" },
  { id: "a-cash", name: "Tiền mặt", balance: 239_000, currencyCode: "VND" },
  { id: "a-momo", name: "MoMo", balance: 42_000, currencyCode: "VND" },
];

test("reconcileAccountBalances applies expense and income deltas per account", () => {
  const live = [
    tx({ id: "e1", accountId: "a-cash", amount: 45_000 }),
    tx({ id: "i1", kind: "income", accountId: "a-bank", amount: 15_000_000 }),
  ];
  const next = reconcileAccountBalances(rows, [], live);
  assert.equal(next.find((r) => r.id === "a-cash")!.balance, 239_000 - 45_000);
  assert.equal(next.find((r) => r.id === "a-bank")!.balance, 15_454_000 + 15_000_000);
  assert.equal(next.find((r) => r.id === "a-momo")!.balance, 42_000);
});

test("reconcileAccountBalances nets transfers between source and destination", () => {
  const live = [
    tx({
      id: "tr1",
      kind: "transfer",
      accountId: "a-cash",
      destinationAccountId: "a-momo",
      amount: 100_000,
    }),
  ];
  const next = reconcileAccountBalances(rows, [], live);
  assert.equal(next.find((r) => r.id === "a-cash")!.balance, 139_000);
  assert.equal(next.find((r) => r.id === "a-momo")!.balance, 142_000);
});

test("reconcileAccountBalances is a no-op when live equals snapshot", () => {
  const snap = [tx({})];
  const next = reconcileAccountBalances(rows, snap, snap);
  assert.deepEqual(
    next.map((r) => r.balance),
    rows.map((r) => r.balance),
  );
});

test("reconcileAccountBalances ignores transactions on unknown accounts", () => {
  const live = [tx({ accountId: "a-ghost" })];
  const next = reconcileAccountBalances(rows, [], live);
  assert.deepEqual(
    next.map((r) => r.balance),
    rows.map((r) => r.balance),
  );
});
