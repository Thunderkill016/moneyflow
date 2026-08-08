import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hook = readFileSync("src/hooks/use-transactions.ts", "utf8");

test("demo ledger mutations persist before reporting success", () => {
  assert.match(
    hook,
    /function commitDemoTransactions\(next: Transaction\[\]\) \{[\s\S]*writeStoredTransactions\(next\);[\s\S]*setTransactions\(next\);[\s\S]*\}/,
  );

  assert.match(
    hook,
    /const current = readStoredTransactions\(\);[\s\S]*commitDemoTransactions\(next\);[\s\S]*return \{ ok: true, transaction \};/,
  );

  assert.match(
    hook,
    /async function deleteTransaction[\s\S]*const next = readStoredTransactions\(\)\.filter[\s\S]*commitDemoTransactions\(next\);[\s\S]*return \{ ok: true \};/,
  );

  assert.match(
    hook,
    /async function restoreTransaction[\s\S]*restoreTransactionInList\([\s\S]*readStoredTransactions\(\),[\s\S]*transaction,[\s\S]*\);[\s\S]*commitDemoTransactions\(next\);/,
  );

  assert.match(
    hook,
    /async function addSplitExpense[\s\S]*const current = readStoredTransactions\(\);[\s\S]*commitDemoTransactions\(next\);[\s\S]*return \{ ok: true, transaction: reviewed \};/,
  );

  assert.match(
    hook,
    /async function updateTransaction[\s\S]*const current = readStoredTransactions\(\);[\s\S]*commitDemoTransactions\(next\);[\s\S]*return \{ ok: true, transaction \};/,
  );
});

test("demo persistence is never hidden inside a React state updater", () => {
  assert.doesNotMatch(
    hook,
    /setTransactions\(\(current\) => \{[\s\S]{0,500}?writeStoredTransactions\(/,
  );
});
