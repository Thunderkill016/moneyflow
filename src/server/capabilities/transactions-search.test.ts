import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { run } from "./transactions-search.ts";
import {
  FIXED_CONTEXT,
  demoTransactions,
  fixtureDeps,
} from "./capability-test-helpers.test.ts";

test("transactions.search orders deterministically and cursor paging is complete", async () => {
  const deps = fixtureDeps();
  const full = await run(FIXED_CONTEXT, { limit: 200 }, deps);
  const first = await run(FIXED_CONTEXT, { limit: 2 }, deps);
  const second = await run(
    FIXED_CONTEXT,
    { limit: 2, cursor: first.nextCursor ?? "" },
    deps,
  );

  assert.equal(full.items.length, 5);
  assert.equal(first.items.length, 2);
  assert.ok(first.nextCursor);
  assert.equal(second.items.length, 2);
  const ids = [...first.items, ...second.items].map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  let cursor: string | undefined;
  const pagedIds: string[] = [];
  do {
    const page = await run(FIXED_CONTEXT, { limit: 2, ...(cursor ? { cursor } : {}) }, deps);
    pagedIds.push(...page.items.map((item) => item.id));
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  assert.deepEqual(pagedIds, full.items.map((item) => item.id));
  assert.deepEqual(
    [...full.items].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id)).map((item) => item.id),
    full.items.map((item) => item.id),
  );
  assert.equal(
    (await run(FIXED_CONTEXT, { kind: "transfer", limit: 50 }, deps)).items.map((item) => item.kind).join(","),
    "transfer",
  );
});

test("transactions.search applies case-insensitive text and date filters", async () => {
  const output = await run(
    FIXED_CONTEXT,
    { text: "GRAB", from: "2026-07-14", to: "2026-07-14", limit: 50 },
    fixtureDeps(),
  );
  assert.deepEqual(output.items.map((item) => item.id), ["sample-2"]);
  assert.equal("pendingKey" in (output.items[0] ?? {}), false);
});

test("transactions.search folds Vietnamese diacritics on needle and haystack", async () => {
  const deps = fixtureDeps();
  // "an uong" reaches category "Ăn uống" (sample-1); "do dung" reaches note "Đồ dùng cá nhân" (sample-3).
  assert.deepEqual(
    (await run(FIXED_CONTEXT, { text: "an uong", limit: 50 }, deps)).items.map(
      (item) => item.id,
    ),
    ["sample-1"],
  );
  assert.deepEqual(
    (await run(FIXED_CONTEXT, { text: "do dung", limit: 50 }, deps)).items.map(
      (item) => item.id,
    ),
    ["sample-3"],
  );
  // Queries typed WITH diacritics still match after the same fold.
  // "uống" → "uong" is a substring of both "an uong" and "luong thang 7".
  assert.deepEqual(
    (await run(FIXED_CONTEXT, { text: "uống", limit: 50 }, deps)).items.map(
      (item) => item.id,
    ),
    ["sample-1", "sample-4"],
  );
  // Non-matching text still matches nothing.
  assert.equal(
    (await run(FIXED_CONTEXT, { text: "khong ton tai", limit: 50 }, deps)).items
      .length,
    0,
  );
});

test("transactions.search folds đ to d so 'tien dien' finds 'Tiền điện'", async () => {
  const [first, ...rest] = demoTransactions();
  const rows = [{ ...first!, id: "dien-tx", note: "Tiền điện" }, ...rest];
  const output = await run(
    FIXED_CONTEXT,
    { text: "tien dien", limit: 50 },
    fixtureDeps(rows),
  );
  assert.deepEqual(
    output.items.map((item) => item.id),
    ["dien-tx"],
  );
});

test("transactions.search matches payee text", async () => {
  const deps = fixtureDeps();
  // "minh đức" only exists in sample-1's payee — note and category do not carry it.
  assert.deepEqual(
    (await run(FIXED_CONTEXT, { text: "minh đức", limit: 50 }, deps)).items.map(
      (item) => item.id,
    ),
    ["sample-1"],
  );
  assert.equal(
    (await run(FIXED_CONTEXT, { text: "minh đức", limit: 50 }, deps)).items[0]
      ?.payee,
    "Cơm Minh Đức",
  );
});

test("transactions.search rejects malformed cursors", async () => {
  await assert.rejects(
    () => run(FIXED_CONTEXT, { cursor: "not-base64", limit: 50 }, fixtureDeps()),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "invalid_input",
  );
});

test("transactions.search golden output stays deterministic", async () => {
  const output = await run(FIXED_CONTEXT, { limit: 200 }, fixtureDeps());
  const golden = JSON.parse(
    await readFile(new URL("./__golden__/transactions-search.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(output, golden);
});
