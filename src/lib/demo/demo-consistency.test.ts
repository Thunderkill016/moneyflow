import assert from "node:assert/strict";
import test from "node:test";
import { calculateDashboardSummary, topExpenseCategories } from "../finance.ts";
import { sampleTransactionsFor } from "./transaction-fixtures.ts";

/*
 * The demo is the first thing a stranger sees, and it was demonstrating the
 * opposite of this product's central claim: a month figure with no rows behind
 * it, a row labelled "Hôm nay" that was six weeks old, and three panels on one
 * screen disagreeing about whether anything had been recorded.
 *
 * These pin the two properties that stop it happening again — the demo agrees
 * with itself, and it agrees on any day it is opened.
 */

const DAYS = ["2026-08-27", "2026-01-01", "2026-02-28", "2026-12-31", "2028-02-29"];

test("a row labelled Hôm nay is actually today, on any day", () => {
  for (const today of DAYS) {
    const rows = sampleTransactionsFor(today);
    for (const row of rows) {
      if (row.relativeDate === "Hôm nay") {
        assert.equal(row.occurredOn, today, `${today}: "Hôm nay" must be today`);
      }
    }
    // Not vacuous: the fixture really does contain rows labelled Hôm nay.
    assert.ok(rows.some((row) => row.relativeDate === "Hôm nay"));
  }
});

test("Hôm qua is the day before, across month and year boundaries", () => {
  assert.equal(
    sampleTransactionsFor("2026-01-01").find((r) => r.relativeDate === "Hôm qua")?.occurredOn,
    "2025-12-31",
  );
  assert.equal(
    sampleTransactionsFor("2028-03-01").find((r) => r.relativeDate === "Hôm qua")?.occurredOn,
    "2028-02-29",
  );
});

test("the month figure equals the rows behind it", () => {
  for (const today of DAYS) {
    const rows = sampleTransactionsFor(today);
    const summary = calculateDashboardSummary(rows, { isDemo: true, today });
    const monthExpense = rows
      .filter((row) => row.kind === "expense" && row.occurredOn.startsWith(today.slice(0, 7)))
      .reduce((total, row) => total + row.amount, 0);

    assert.equal(
      summary.expense,
      monthExpense,
      `${today}: the statement must open to the rows it claims`,
    );
  }
});

test("the statement and the category panel never disagree about an empty month", () => {
  /*
   * The visible symptom: the statement said 4.209.000 ₫ went out while the
   * category panel said nothing had been spent. Either both have something or
   * neither does.
   */
  for (const today of DAYS) {
    const rows = sampleTransactionsFor(today);
    const summary = calculateDashboardSummary(rows, { isDemo: true, today });
    const categories = topExpenseCategories(rows, { today });

    assert.equal(
      summary.expense > 0,
      categories.length > 0,
      `${today}: statement and categories must agree on whether the month is empty`,
    );
  }
});

test("no date or label is frozen into the fixture", () => {
  const august = sampleTransactionsFor("2026-08-27");
  const december = sampleTransactionsFor("2026-12-31");

  assert.notDeepEqual(
    august.map((row) => row.occurredOn),
    december.map((row) => row.occurredOn),
  );
  // The salary note names the month it falls in rather than a fixed one.
  assert.match(august.find((row) => row.kind === "income")!.note, /tháng 8/u);
  assert.match(december.find((row) => row.kind === "income")!.note, /tháng 12/u);
});

test("occurredAt stays consistent with occurredOn", () => {
  for (const row of sampleTransactionsFor("2026-08-27")) {
    assert.ok(
      row.occurredAt.startsWith(row.occurredOn),
      `${row.id}: timestamp must sit on its own date`,
    );
  }
});
