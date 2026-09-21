import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { GoalsWorkspace } from "./types.ts";
import {
  FIXED_CONTEXT,
  fixtureGoalsWorkspace,
} from "./capability-test-helpers.test.ts";
import { run } from "./goals-status.ts";

function deps(workspace: GoalsWorkspace = fixtureGoalsWorkspace()) {
  return { loadGoalsWorkspace: async () => workspace };
}

test("goals.status returns goal progress with explained money", async () => {
  const output = await run(FIXED_CONTEXT, {}, deps());
  assert.equal(output.goals.length, 2);

  const emergency = output.goals[0]!;
  assert.equal(emergency.name, "Quỹ khẩn cấp");
  assert.equal(emergency.target.amount, 6_000_000);
  assert.equal(emergency.allocated.amount, 2_400_000);
  assert.equal(emergency.remaining.amount, 3_600_000);
  assert.equal(emergency.deadline, "2026-09-30");
  assert.equal(emergency.isArchived, false);

  assert.equal(output.allocatedTotal.amount, 3_400_000);
  assert.equal(output.plannedDaily.amount, 20_000);
  assert.equal(output.reserve?.unreserved.amount, 10_293_000);
});

test("goals.status exposes reserve:null rather than inventing a figure", async () => {
  const output = await run(
    FIXED_CONTEXT,
    {},
    deps({ ...fixtureGoalsWorkspace(), reserve: null }),
  );
  assert.equal(output.reserve, null);
});

test("goals.status fails loudly when the workspace cannot load", async () => {
  await assert.rejects(
    () => run(FIXED_CONTEXT, {}, deps({ ...fixtureGoalsWorkspace(), dataError: "x" })),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "internal",
  );
});

test("goals.status golden output stays deterministic", async () => {
  const output = await run(FIXED_CONTEXT, {}, deps());
  const golden = JSON.parse(
    await readFile(new URL("./__golden__/goals-status.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(output, golden);
});
