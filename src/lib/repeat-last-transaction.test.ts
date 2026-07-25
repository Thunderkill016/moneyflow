/**
 * Post-MVP quick-entry contract: repeat the last successful money transaction
 * without persisting raw transaction details outside the current component session.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(
  join(process.cwd(), "src/components/add-transaction-dialog.tsx"),
  "utf8",
);

test("captures the last transaction before clearing the quick-add form", () => {
  const captureIndex = source.indexOf("setLastTransaction({");
  const clearIndex = source.indexOf('setAmount("");', captureIndex);

  assert.ok(captureIndex >= 0, "expected successful save to capture a repeatable draft");
  assert.ok(clearIndex > captureIndex, "expected capture before amount and note are cleared");
  assert.match(source, /amount: parsedAmount/);
  assert.match(source, /note: note\.trim\(\)/);
});

test("repeating restores fields but uses today and a fresh idempotency key", () => {
  const start = source.indexOf("function applyLastTransaction()");
  const end = source.indexOf("function persistPrefs", start);
  const block = source.slice(start, end);

  assert.ok(start >= 0 && end > start, "expected applyLastTransaction helper");
  assert.match(block, /setKind\(lastTransaction\.kind\)/);
  assert.match(block, /setCategoryId\(lastTransaction\.categoryId\)/);
  assert.match(block, /setAccountId\(lastTransaction\.accountId\)/);
  assert.match(block, /setOccurredOn\(todayInVietnam\(\)\)/);
  assert.match(block, /idempotencyKeyRef\.current = null/);
  assert.match(block, /focusAmount\(\)/);
});

test("repeat control is explicit and last transaction stays session-only", () => {
  assert.match(source, /data-repeat-last="true"/);
  assert.match(source, /Ghi lại khoản trước/);

  const start = source.indexOf("function persistPrefs");
  const end = source.indexOf("async function handleSubmit", start);
  const prefsBlock = source.slice(start, end);
  assert.doesNotMatch(
    prefsBlock,
    /lastTransaction/,
    "raw amount and note must not be added to quick-add localStorage preferences",
  );
});
