import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const tool = readFileSync(join(process.cwd(), "public/capture-bench.html"), "utf8");

test("capture-bench tool measures TTLT for both existing capture routes", () => {
  for (const id of ["A1", "A2", "A3", "A4", "D1", "D2", "D3", "P1", "P2", "P3"]) {
    assert.match(tool, new RegExp(`id: "${id}"`), `missing task ${id}`);
  }
  assert.match(tool, /\/capture\/quick/);
  assert.match(tool, /\/capture\/paste/);
});

test("capture-bench tool can seed and clear a reviewed pattern cohort", () => {
  // The seed writes reviewed demo rows the pattern deriver accepts, tagged so
  // ledger-write detection never mistakes them for a task's save.
  assert.match(tool, /bench-seed-/);
  assert.match(tool, /reviewStatus: "reviewed"/);
  assert.match(tool, /id="seed"/);
  assert.match(tool, /id="unseed"/);
  // Seeded history must resolve against real demo account/category ids —
  // otherwise eligibility drops the rows and no chip appears.
  assert.match(tool, /demo-account-cash/);
  assert.match(tool, /demo-category-expense-/);
  // Pattern usage is reported per task, not folded into the note.
  assert.match(tool, /fu-pattern/);
  assert.match(tool, /group: "pattern"/);
  // P-tasks verify the saved row's context too — picking the wrong chip must
  // read as "khác-kỳ-vọng", not silently pass on kind+amount alone.
  assert.match(tool, /expect\.accountId/);
  assert.match(tool, /expect\.categoryId/);
});

test("capture-bench tool observes demo-mode storage keys without touching product code", () => {
  assert.match(tool, /moneyflow-demo-transactions-v1/);
  assert.match(tool, /moneyflow-inbox-candidates-v1/);
  assert.match(tool, /addEventListener\("storage"/);
  assert.match(tool, /performance\.now\(\)/);
});

test("capture-bench report emits the evidence fields needed for hypothesis evaluation", () => {
  for (const field of [
    "CAPTURE V2 BENCHMARK",
    "Date/time:",
    "Release candidate / commit if known:",
    "Origin:",
    "Mode:",
    "Cohort:",
    "Device/OS/browser:",
    "Network context:",
    "Median total",
  ]) {
    assert.ok(tool.includes(field), `missing report field: ${field}`);
  }
});

test("capture-bench tool is self-contained, privacy-safe and not indexable", () => {
  assert.match(tool, /name="robots" content="noindex,nofollow"/);
  assert.doesNotMatch(tool, /<script src=/);
  assert.doesNotMatch(tool, /<link/);
  assert.doesNotMatch(tool, /https?:\/\/(?!mfvn)/); // no external calls
  assert.match(tool, /fetch\("\/api\/health"\)/); // same-origin build identity only
  assert.doesNotMatch(tool, /XMLHttpRequest|sendBeacon|gtag|analytics/i);
});
