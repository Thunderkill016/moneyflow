import assert from "node:assert/strict";
import test from "node:test";
import type { AccountSummary } from "./accounts.ts";
import {
  canTransferSameCurrency,
  currencyFractionDigits,
  normalizeCurrencyCode,
  totalsByCurrency,
  vndTotalBalance,
} from "./currency.ts";

const base = (partial: Partial<AccountSummary> & Pick<AccountSummary, "id" | "currencyCode" | "balance">): AccountSummary => ({
  name: partial.name ?? partial.id,
  kind: partial.kind ?? "cash",
  initialBalance: partial.initialBalance ?? partial.balance,
  isArchived: partial.isArchived ?? false,
  ...partial,
});

test("normalizeCurrencyCode defaults and uppercases", () => {
  assert.equal(normalizeCurrencyCode(undefined), "VND");
  assert.equal(normalizeCurrencyCode("usd"), "USD");
  assert.equal(normalizeCurrencyCode("nope"), "VND");
  assert.equal(normalizeCurrencyCode(""), "VND");
});

test("currencyFractionDigits follows ISO 4217 for supported codes", () => {
  assert.equal(currencyFractionDigits("VND"), 0);
  assert.equal(currencyFractionDigits("JPY"), 0);
  assert.equal(currencyFractionDigits("USD"), 2);
  assert.equal(currencyFractionDigits("EUR"), 2);
});

test("totalsByCurrency never mixes VND with FX", () => {
  const accounts = [
    base({ id: "v1", currencyCode: "VND", balance: 1_000_000 }),
    base({ id: "v2", currencyCode: "VND", balance: 500_000 }),
    base({ id: "u1", currencyCode: "USD", balance: 20_000 }),
  ];
  const totals = totalsByCurrency(accounts);
  assert.deepEqual(totals, [
    { currencyCode: "VND", total: 1_500_000, count: 2 },
    { currencyCode: "USD", total: 20_000, count: 1 },
  ]);
  assert.equal(vndTotalBalance(accounts), 1_500_000);
});

test("canTransferSameCurrency blocks cross-currency and same account", () => {
  const vnd = base({ id: "a", currencyCode: "VND", balance: 1 });
  const usd = base({ id: "b", currencyCode: "USD", balance: 1 });
  const vnd2 = base({ id: "c", currencyCode: "VND", balance: 1 });
  assert.equal(canTransferSameCurrency(vnd, usd), false);
  assert.equal(canTransferSameCurrency(vnd, vnd), false);
  assert.equal(canTransferSameCurrency(vnd, vnd2), true);
  assert.equal(canTransferSameCurrency({ ...vnd, isArchived: true }, vnd2), false);
});
