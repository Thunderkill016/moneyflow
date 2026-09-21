import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { run } from "./reports-financial.ts";
import { runCapability } from "./registry.ts";
import { FIXED_CONTEXT, fixtureDeps, fixtureWorkspace } from "./capability-test-helpers.test.ts";

test("reports.financial wraps financial amounts with basis without changing report fields", async () => {
  const output = await run(FIXED_CONTEXT, { period: "month" }, fixtureDeps());
  const totalRows = fixtureWorkspace().transactions.length;

  assert.equal(output.totals.income.amount, 15_000_000);
  assert.equal(output.totals.expense.amount, 391_000);
  assert.equal(output.totals.net.amount, 14_609_000);
  assert.equal(output.totals.transactions, 5);
  assert.ok(output.categories.every((category) => category.amount.basis));
  assert.deepEqual(
    output.categories.find((category) => category.name === "Mua sắm")?.amount.basis.included.transactionIds,
    ["sample-3"],
  );
  assert.equal(
    output.totals.income.basis.included.count +
      output.totals.income.basis.excluded.reduce((sum, item) => sum + item.count, 0),
    totalRows,
  );
  assert.ok(output.categories.every((category) => Number.isSafeInteger(category.amount.amount)));
});

test("reports.financial rejects invalid periods and custom ranges", async () => {
  await assert.rejects(
    () => runCapability("reports.financial", { period: "quarter" }, { context: FIXED_CONTEXT, deps: fixtureDeps() }),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "invalid_input",
  );
  await assert.rejects(
    () => runCapability(
      "reports.financial",
      { period: "custom", from: "2026-02-31", to: "2026-03-01" },
      { context: FIXED_CONTEXT, deps: fixtureDeps() },
    ),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "invalid_input",
  );
});

test("reports.financial golden output stays deterministic", async () => {
  const output = await run(FIXED_CONTEXT, { period: "month" }, fixtureDeps());
  const golden = JSON.parse(
    await readFile(new URL("./__golden__/reports-financial.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(output, golden);
});
