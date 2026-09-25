import assert from "node:assert/strict";
import test from "node:test";

import {
  DISMISSAL_BATCH_MAX,
  DISMISSAL_SCOPES,
  PATTERN_KEY_SHAPE,
  isDismissalScope,
} from "./pattern-dismissals.ts";

test("scope whitelist mirrors the SQL CHECK — only known domains pass", () => {
  assert.equal(isDismissalScope("ledger_dupe"), true);
  assert.equal(isDismissalScope("recurring"), true);
  assert.equal(isDismissalScope("inbox_suppressed"), false);
  assert.equal(isDismissalScope(""), false);
  assert.equal(isDismissalScope(null), false);
  assert.equal(isDismissalScope(42), false);
});

test("scopes stay in sync with the dismissal domains the app writes", () => {
  // The SQL CHECK and this list are the same contract — if one changes the
  // other must follow, and this assertion makes drift loud at test time.
  assert.deepEqual([...DISMISSAL_SCOPES].sort(), ["ledger_dupe", "recurring"]);
});

test("pattern key shape matches the fnv1a-hex keys both modules produce", () => {
  assert.equal(PATTERN_KEY_SHAPE.test("abcd1234"), true);
  assert.equal(PATTERN_KEY_SHAPE.test("00000000"), true);
  assert.equal(PATTERN_KEY_SHAPE.test("ABCDEF12"), false);
  assert.equal(PATTERN_KEY_SHAPE.test("abcd123"), false);
  assert.equal(PATTERN_KEY_SHAPE.test("abcd12345"), false);
  assert.equal(PATTERN_KEY_SHAPE.test("not-a-key"), false);
});

test("batch bound is a real cap, above any realistic dismiss-all", () => {
  assert.equal(DISMISSAL_BATCH_MAX, 500);
});
