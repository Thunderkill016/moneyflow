import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const tool = readFileSync(join(process.cwd(), "public/capture-bench.html"), "utf8");

test("capture-bench tool measures TTLT for both existing capture routes", () => {
  for (const id of ["A1", "A2", "A3", "A4", "D1", "D2", "D3"]) {
    assert.match(tool, new RegExp(`id: "${id}"`), `missing task ${id}`);
  }
  assert.match(tool, /\/capture\/quick/);
  assert.match(tool, /\/capture\/paste/);
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
