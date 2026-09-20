import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { run } from "./ledger-summary.ts";
import { FIXED_CONTEXT, fixtureDeps, fixtureWorkspace } from "./capability-test-helpers.test.ts";

test("ledger.summary returns explainable VND totals with range exclusions", async () => {
  const output = await run(
    FIXED_CONTEXT,
    { period: "month" },
    fixtureDeps(),
  );

  const workspace = fixtureWorkspace();
  const outside = workspace.transactions.filter(
    (item) => item.occurredOn < output.range.currentStart || item.occurredOn > output.range.currentEnd,
  ).length;
  const totalRows = workspace.transactions.length;

  assert.equal(output.totalBalance.amount, workspace.totalBalance);
  assert.equal(output.income.amount, 15_000_000);
  assert.equal(output.expense.amount, 391_000);
  assert.equal(output.net.amount, 14_609_000);
  assert.equal(
    output.income.basis.included.count +
      output.income.basis.excluded.reduce((sum, item) => sum + item.count, 0),
    totalRows,
  );
  assert.equal(
    output.expense.basis.included.count +
      output.expense.basis.excluded.reduce((sum, item) => sum + item.count, 0),
    totalRows,
  );
  assert.equal(
    output.income.basis.excluded.find((item) => item.reason === "transfer")?.count,
    1,
  );
  assert.equal(
    output.income.basis.excluded.find((item) => item.reason === "outside_range")?.count ?? 0,
    outside,
  );
  assert.ok(Number.isSafeInteger(output.net.amount));
});

test("ledger.summary rejects invalid custom ranges", async () => {
  await assert.rejects(
    () => run(FIXED_CONTEXT, { period: "custom", from: "2026-02-31", to: "2026-03-01" }, fixtureDeps()),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "invalid_input",
  );
});

test("ledger.summary golden output stays deterministic", async () => {
  const output = await run(FIXED_CONTEXT, { period: "month" }, fixtureDeps());
  const golden = JSON.parse(
    await readFile(new URL("./__golden__/ledger-summary.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(output, golden);
});
