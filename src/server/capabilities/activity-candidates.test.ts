import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { InboxListResult } from "./types.ts";
import {
  FIXED_CONTEXT,
  fixtureInboxList,
} from "./capability-test-helpers.test.ts";
import { run } from "./activity-candidates.ts";

function deps(result: InboxListResult = fixtureInboxList()) {
  return { listInbox: async () => result };
}

test("activity.candidates lists only pending candidates, newest first", async () => {
  const output = await run(FIXED_CONTEXT, {}, deps());
  assert.equal(output.pendingCount, 1);
  assert.equal(output.candidates.length, 1);

  const candidate = output.candidates[0]!;
  assert.equal(candidate.id, "cand-1");
  assert.equal(candidate.kind, "expense");
  assert.equal(candidate.amount.amount, 45_000);
  assert.equal(candidate.amount.currency, "VND");
  assert.equal(candidate.source, "agent");
  assert.equal(candidate.status, "pending");
});

test("activity.candidates fails loudly when the inbox cannot load", async () => {
  await assert.rejects(
    () => run(FIXED_CONTEXT, {}, deps({ ok: false, message: "x" })),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "internal",
  );
});

test("activity.candidates golden output stays deterministic", async () => {
  const output = await run(FIXED_CONTEXT, {}, deps());
  const golden = JSON.parse(
    await readFile(new URL("./__golden__/activity-candidates.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(output, golden);
});
