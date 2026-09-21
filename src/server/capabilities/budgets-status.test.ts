import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { BudgetsWorkspace } from "./types.ts";
import {
  FIXED_CONTEXT,
  fixtureBudgetsWorkspace,
} from "./capability-test-helpers.test.ts";
import { budgetsStatusInputSchema, run } from "./budgets-status.ts";

function deps(workspace: BudgetsWorkspace = fixtureBudgetsWorkspace()) {
  return { loadBudgetsWorkspace: async () => workspace };
}

test("budgets.status validates the month input format", () => {
  assert.doesNotThrow(() => budgetsStatusInputSchema.parse({}));
  assert.doesNotThrow(() => budgetsStatusInputSchema.parse({ month: "2026-07" }));
  assert.throws(() => budgetsStatusInputSchema.parse({ month: "07-2026" }));
  assert.throws(() => budgetsStatusInputSchema.parse({ month: "2026-13" }));
});

test("budgets.status forwards the requested month to the workspace loader", async () => {
  let requested: string | null | undefined = "unset";
  await run(FIXED_CONTEXT, { month: "2026-05" }, {
    loadBudgetsWorkspace: async (month) => {
      requested = month;
      return fixtureBudgetsWorkspace();
    },
  });
  assert.equal(requested, "2026-05");
});

test("budgets.status reports per-category limits with honest arithmetic", async () => {
  const output = await run(FIXED_CONTEXT, {}, deps());
  assert.equal(output.monthStart, "2026-07-01");
  assert.equal(output.monthEnd, "2026-07-31");
  assert.equal(output.monthIncome.amount, 12_000_000);

  const food = output.budgets[0]!;
  assert.equal(food.categoryName, "Ăn uống");
  assert.equal(food.limit.amount, 4_000_000);
  assert.equal(food.spent.amount, 2_760_000);
  assert.equal(food.remaining.amount, 1_240_000);
  assert.equal(food.spent.basis.capabilityVersion, "budgets.status@1");
});

test("budgets.status fails loudly when the workspace cannot load", async () => {
  await assert.rejects(
    () =>
      run(FIXED_CONTEXT, {}, deps({ ...fixtureBudgetsWorkspace(), budgets: [], dataError: "x" })),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "internal",
  );
});

test("budgets.status golden output stays deterministic", async () => {
  const output = await run(FIXED_CONTEXT, { month: "2026-07" }, deps());
  const golden = JSON.parse(
    await readFile(new URL("./__golden__/budgets-status.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(output, golden);
});
