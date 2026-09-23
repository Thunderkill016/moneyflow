import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatMoney } from "./money.ts";

const attention = readFileSync("src/lib/attention.ts", "utf8");
const statement = readFileSync(
  "src/components/dashboard/statement.tsx",
  "utf8",
);
const overview = readFileSync(
  "src/components/dashboard/dashboard-overview-sections.tsx",
  "utf8",
);
const reports = readFileSync("src/components/reports-page.tsx", "utf8");

const transactionsWorkspace = readFileSync(
  "src/components/transactions/transactions-workspace.tsx",
  "utf8",
);
const reconciliation = readFileSync(
  "src/components/account-reconciliation-page.tsx",
  "utf8",
);
const accountDetail = readFileSync(
  "src/components/account-detail-page.tsx",
  "utf8",
);
const inboxPage = readFileSync("src/components/inbox/inbox-page.tsx", "utf8");

/*
 * Compact VND ("12,5 tr") exists for surfaces where a nowrap
 * "12.500.000 ₫" overflows: dashboard chips/cards and reports chart labels.
 * Everywhere a figure can be cross-checked — ledger rows, totals, balances,
 * reconcile, inbox, export — keeps exact đồng. These tests pin both halves.
 */

const COMPACT_ARG = /\/\* compact \*\/ true\)/g;
const COMPACT_PROP = /\n\s+compact\n/g;

function count(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length;
}

test("formatMoney compact renders 'tr' only at ≥ 1.000.000 ₫ and stays VND", () => {
  assert.equal(formatMoney(12_500_000, true), "12,5 tr");
  assert.equal(formatMoney(1_000_000, true), "1 tr");
  assert.equal(formatMoney(999_999, true), "999.999 ₫");
  assert.equal(formatMoney(12_500_000, false), "12.500.000 ₫");
  // Compact is a VND contract only — other currencies keep full formatting.
  assert.equal(formatMoney(2_000_000, true, "USD"), formatMoney(2_000_000, false, "USD"));
});

test("dashboard attention chips carry compact money, not full đồng", () => {
  // The chip pills are nowrap: one compact formatter feeds both labels.
  assert.match(
    attention,
    /const chipMoney = \(minorUnits: number\) =>\s+formatMoney\(minorUnits, \/\* compact \*\/ true\)/,
  );
  assert.match(attention, /budgetStatusLabel\(budget, chipMoney\)/);
  assert.match(attention, /chipMoney\(c\.amount\)/);
  assert.doesNotMatch(attention, /formatMoney\(c\.amount\)/);
  assert.equal(count(attention, COMPACT_ARG), 1);
});

test("dashboard trend card and category bars render compact", () => {
  // Prior-window compare caption — a single nowrap line on the trend card.
  assert.match(
    statement,
    /amount=\{monthDetail\.prior\.expense\}[^>]*\bcompact\b/,
  );
  assert.equal(count(statement, COMPACT_PROP), 1);

  // Top-category bar rows share one line with the category name.
  assert.match(
    overview,
    /amount=\{item\.amount\}[^>]*\bcompact\b/,
  );
  assert.equal(count(overview, COMPACT_PROP), 1);
});

test("reports chart labels use compact; the summary totals stay exact", () => {
  // Painted chart labels: in-bar peak value, the axis-scale caption, and the
  // two chart-header stat chips.
  assert.match(
    reports,
    /formatMoney\(item\.expense, \/\* compact \*\/ true\)/,
  );
  assert.equal(count(reports, COMPACT_ARG), 5);
  assert.equal(count(reports, COMPACT_PROP), 2);
  assert.match(
    reports,
    /amount=\{netWorthDelta\}[^>]*\bcompact\b/,
  );
  assert.match(
    reports,
    /amount=\{averageExpense\}[^>]*\bcompact\b/,
  );

  // The four summary chips and every breakdown amount are cross-checkable
  // totals — compact must never appear inside their MoneyValue tags.
  for (const field of ["income", "expense", "net"]) {
    assert.doesNotMatch(
      reports,
      new RegExp(`amount=\\{report\\.totals\\.${field}\\}[^>]*compact`),
      `report.totals.${field} must stay exact đồng`,
    );
  }
  assert.doesNotMatch(
    reports,
    /amount=\{report\.previous\.expense\}[^>]*compact/,
    "prior-period total stays exact",
  );
  assert.doesNotMatch(
    reports,
    /amount=\{item\.amount\}[^>]*compact/,
    "category/account/payee totals stay exact",
  );
  assert.doesNotMatch(
    reports,
    /amount=\{endValue\}[^>]*compact/,
    "per-account end balance stays exact",
  );
  assert.match(
    reports,
    /formatSignedMoney\(delta, false, seriesAccount\.currencyCode\)/,
    "per-account period delta stays exact",
  );
});

test("reports chart data surfaces keep exact đồng for on-demand precision", () => {
  // Dot titles, column tooltips and the screen-reader data lists are where a
  // reader verifies a figure — they are not space-constrained, so they keep
  // the full integer value.
  assert.match(reports, /formatMoney\(point\.value\)\}/);
  assert.doesNotMatch(reports, /formatMoney\(point\.value,/);
  assert.match(reports, /formatMoney\(item\.income\)/);
  assert.match(reports, /formatMoney\(month\.amount\)/);
  assert.equal(
    count(reports, COMPACT_ARG),
    5,
    "compact stays limited to the five painted chart labels",
  );
});

test("statement standing figures and recent rows keep exact đồng", () => {
  for (const field of ["balance", "income", "expense", "net"]) {
    assert.doesNotMatch(
      statement,
      new RegExp(`amount=\\{totals\\.${field}\\}[^>]*compact`),
      `totals.${field} is a cross-check total — stays exact`,
    );
  }
  assert.doesNotMatch(
    statement,
    /amount=\{account\.balance\}[^>]*compact/,
    "per-account balance stays exact",
  );
  // The month-shape strip speaks only through tooltips/aria — not painted
  // text — so its values keep full precision (no `true` flag on formatMoney).
  assert.doesNotMatch(
    statement,
    /formatMoney\([^)]*,\s*(?:\/\*[^*]*\*\/\s*)?true/,
  );
  assert.doesNotMatch(
    overview,
    /amount=\{transaction\.amount\}[^>]*compact/,
    "recent transaction rows are ledger rows — exact",
  );
});

test("forbidden surfaces contain no compact usage at all", () => {
  const forbidden = {
    "transactions workspace": transactionsWorkspace,
    "account reconciliation": reconciliation,
    "account detail": accountDetail,
    "inbox": inboxPage,
  };
  for (const [name, source] of Object.entries(forbidden)) {
    assert.equal(
      count(source, /\bcompact\b/g),
      0,
      `${name} must keep exact đồng everywhere`,
    );
  }
});
