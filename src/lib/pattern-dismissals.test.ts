import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

/*
 * Rejected server actions (offline, transport failure) must route through the
 * same revert + notice path as a resolved { ok: false } — a bare .then() would
 * leave the suggestion hidden with no persistence and no error. These read the
 * component sources so the rejection contract cannot silently regress.
 */
const workspaceSource = readFileSync(
  join(process.cwd(), "src/components/transactions/transactions-workspace.tsx"),
  "utf8",
);
const commitmentsSource = readFileSync(
  join(process.cwd(), "src/components/planning/commitments-page.tsx"),
  "utf8",
);

function handlerBody(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const rest = source.slice(start);
  const end = rest.indexOf("\n  }\n");
  assert.notEqual(end, -1, `${name} body must terminate`);
  return rest.slice(0, end);
}

test("dupe dismiss routes action rejection through revert + notice", () => {
  const body = handlerBody(workspaceSource, "dismissDupeGroups");
  assert.match(body, /try \{/);
  assert.match(body, /await dismissPatternKeysAction\("ledger_dupe"/);
  assert.match(body, /catch \{/);
  assert.match(body, /reverted\.delete\(key\)/);
  assert.match(body, /Chưa lưu được trạng thái bỏ qua/);
});

test("recurring dismiss routes action rejection through revert + notice", () => {
  const body = handlerBody(commitmentsSource, "dismissSuggestion");
  assert.match(body, /try \{/);
  assert.match(body, /await dismissPatternKeysAction\("recurring"/);
  assert.match(body, /catch \{/);
  assert.match(body, /reverted\.delete\(key\)/);
});

test("markSuggestionHandled handles dismissal write failure explicitly", () => {
  const body = handlerBody(commitmentsSource, "markSuggestionHandled");
  assert.match(body, /try \{/);
  assert.match(body, /await dismissPatternKeysAction\("recurring"/);
  assert.match(body, /catch \{/);
  assert.match(body, /reverted\.delete\(handledKey\)/);
  assert.match(body, /Chưa lưu được trạng thái bỏ qua/);
});
