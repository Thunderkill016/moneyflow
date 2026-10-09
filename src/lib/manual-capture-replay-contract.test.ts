import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const neon = readFileSync("db/neon/migrations/20261009160000_manual_capture_replay_safety.sql", "utf8");
const supabase = readFileSync("supabase/migrations/20261009160000_manual_capture_replay_safety.sql", "utf8");
const actions = readFileSync("src/app/actions/transactions.ts", "utf8");

test("both provider migrations use the same replay contract", () => {
  assert.equal(neon, supabase);
  assert.match(neon, /pg_advisory_xact_lock/);
  assert.match(neon, /creation_intent/);
  assert.match(neon, /idempotency_intent_mismatch/);
  assert.match(neon, /idempotency_intent_unavailable/);
});

test("manual capture exposes actionable mismatch/replay errors", () => {
  assert.match(actions, /detail\.includes\("idempotency_intent_mismatch"\)/);
  assert.match(actions, /detail\.includes\("idempotency_intent_unavailable"\)/);
});
