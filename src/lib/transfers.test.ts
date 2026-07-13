import assert from "node:assert/strict";
import test from "node:test";
import type { AccountSummary } from "./accounts.ts";
import { applyTransferBalances } from "./transfers.ts";

const accounts: AccountSummary[] = [
  { id: "source", name: "Ngân hàng", kind: "bank", currencyCode: "VND", initialBalance: 0, balance: 2_000_000, isArchived: false },
  { id: "destination", name: "Tiết kiệm", kind: "savings", currencyCode: "VND", initialBalance: 0, balance: 500_000, isArchived: false },
];

test("transfer changes both accounts while preserving total assets", () => {
  const next = applyTransferBalances(accounts, "source", "destination", 750_000);
  assert.equal(next[0].balance, 1_250_000);
  assert.equal(next[1].balance, 1_250_000);
  assert.equal(next.reduce((sum, item) => sum + item.balance, 0), accounts.reduce((sum, item) => sum + item.balance, 0));
});

test("invalid or same-account transfers do not change balances", () => {
  assert.equal(applyTransferBalances(accounts, "source", "source", 100_000), accounts);
  assert.equal(applyTransferBalances(accounts, "source", "destination", 0), accounts);
});
