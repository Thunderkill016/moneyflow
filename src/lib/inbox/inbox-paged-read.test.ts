import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import type { InboxPageReader } from "./inbox-paged-read.ts";
import {
  INBOX_PAGED_READ_PAGE_SIZE,
  readInboxRowsPaged,
} from "./inbox-paged-read.ts";

const RULE_COLUMNS = "id,occurred_on,applied_rule_id";
const BASE_COLUMNS = "id,occurred_on";

type FakeRow = { id: string; occurred_on: string; created_at: string };

/** Build rows already in the export's display order (newest first). */
function fixtureRows(count: number): FakeRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${String(count - index).padStart(5, "0")}`,
    occurred_on: `2026-10-${String((index % 28) + 1).padStart(2, "0")}`,
    created_at: `2026-10-06T00:${String(index % 60).padStart(2, "0")}:00Z`,
  }));
}

/**
 * Simulates a PostgREST table read: slices the sorted source by the
 * requested offset range, like `.range(from, to)` does.
 */
function fakeTable(source: FakeRow[]): {
  reader: InboxPageReader;
  ranges: Array<[number, number]>;
  columnsSeen: string[];
} {
  const ranges: Array<[number, number]> = [];
  const columnsSeen: string[] = [];
  return {
    reader: (from, to, columns) => {
      ranges.push([from, to]);
      columnsSeen.push(columns);
      return Promise.resolve({
        data: source.slice(from, to + 1),
        error: null,
      });
    },
    ranges,
    columnsSeen,
  };
}

const neverMissingColumn = () => false;

test("export past the old 1000-row ceiling: pages until a short page and keeps order", async () => {
  const source = fixtureRows(2301);
  const { reader, ranges, columnsSeen } = fakeTable(source);

  const result = await readInboxRowsPaged(
    reader,
    RULE_COLUMNS,
    BASE_COLUMNS,
    neverMissingColumn,
  );

  assert.equal(result.error, null);
  assert.deepEqual(result.data, source);
  assert.deepEqual(ranges, [
    [0, 999],
    [1000, 1999],
    [2000, 2999],
  ]);
  // Rule (current-schema) columns used throughout.
  assert.ok(columnsSeen.every((columns) => columns === RULE_COLUMNS));
});

test("<=1000 rows resolve in a single request, identical to the old one-shot read", async () => {
  const source = fixtureRows(999);
  const { reader, ranges } = fakeTable(source);

  const result = await readInboxRowsPaged(
    reader,
    RULE_COLUMNS,
    BASE_COLUMNS,
    neverMissingColumn,
  );

  assert.equal(result.error, null);
  assert.deepEqual(ranges, [[0, 999]]);
  // Same rows, same order, same content as the old `.limit(1000)` read.
  assert.deepEqual(result.data, source);
});

test("exactly 1000 rows: full page plus the terminating empty page", async () => {
  const source = fixtureRows(1000);
  const { reader, ranges } = fakeTable(source);

  const result = await readInboxRowsPaged(
    reader,
    RULE_COLUMNS,
    BASE_COLUMNS,
    neverMissingColumn,
  );

  assert.equal(result.error, null);
  assert.deepEqual(ranges, [
    [0, 999],
    [1000, 1999],
  ]);
  assert.deepEqual(result.data, source);
});

test("missing provenance column on the first page retries the whole read with base columns", async () => {
  const source = fixtureRows(1500);
  const ranges: Array<[number, number]> = [];
  const columnsSeen: string[] = [];
  const missingColumnError = { code: "42703", message: "applied_rule_id" };

  const reader: InboxPageReader = (from, to, columns) => {
    ranges.push([from, to]);
    columnsSeen.push(columns);
    if (columns === RULE_COLUMNS) {
      return Promise.resolve({ data: null, error: missingColumnError });
    }
    return Promise.resolve({ data: source.slice(from, to + 1), error: null });
  };

  const result = await readInboxRowsPaged(
    reader,
    RULE_COLUMNS,
    BASE_COLUMNS,
    (error) => (error as { code?: string }).code === "42703",
  );

  assert.equal(result.error, null);
  assert.deepEqual(result.data, source);
  assert.deepEqual(columnsSeen, [
    RULE_COLUMNS,
    BASE_COLUMNS,
    BASE_COLUMNS,
  ]);
  assert.deepEqual(ranges, [
    [0, 999],
    [0, 999],
    [1000, 1999],
  ]);
});

test("a non-schema error on a later page aborts the read, like before", async () => {
  const source = fixtureRows(2500);
  const transient = new Error("transient");

  const result = await readInboxRowsPaged(
    (from, to) => {
      if (from === 1000) return Promise.resolve({ data: null, error: transient });
      return Promise.resolve({ data: source.slice(from, to + 1), error: null });
    },
    RULE_COLUMNS,
    BASE_COLUMNS,
    neverMissingColumn,
  );

  assert.equal(result.data, null);
  assert.equal(result.error, transient);
});

test("page width matches the old ceiling: one request per <=1000 rows", () => {
  assert.equal(INBOX_PAGED_READ_PAGE_SIZE, 1000);
});

// Structural evidence: the server Inbox read no longer caps rows, still
// pages through the viewer's own client (RLS does the tenant isolation), and
// orders by a unique key so pages are stable.
const inboxServerSource = readFileSync(
  join(process.cwd(), "src/server/inbox.ts"),
  "utf8",
);

test("server inbox read pages every row instead of capping at 1000", () => {
  assert.doesNotMatch(inboxServerSource, /\.limit\(/);
  assert.doesNotMatch(inboxServerSource, /INBOX_LIST_LIMIT/);
  assert.match(inboxServerSource, /readInboxRowsPaged/);
  assert.match(inboxServerSource, /\.range\(from, to\)/);
});

test("server inbox read keeps RLS tenant isolation: no service-role bypass", () => {
  assert.doesNotMatch(inboxServerSource, /serviceRole|SERVICE_ROLE_KEY/);
  assert.match(inboxServerSource, /createClient\(\)/);
  // Stable pagination tiebreaker on the unique id.
  assert.match(inboxServerSource, /\.order\("id", \{ ascending: false \}\)/);
});
