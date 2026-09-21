import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const tool = readFileSync(join(process.cwd(), "public/rrb-08.html"), "utf8");

test("rrb-08 tool covers all six runbook checkpoints with verdict options", () => {
  for (const step of [
    "Mở & shell",
    "Auth surface",
    "Core ledger",
    "Amount / keyboard",
    "Accounts / transactions",
    "Theme",
  ]) {
    assert.match(tool, new RegExp(step.replace(/[ &/]/g, ".{0,3}"), "i"));
  }
  assert.match(tool, /value="PASS"/);
  assert.match(tool, /value="FAIL"/);
  assert.match(tool, /value="N\/A"/);
  assert.match(tool, /value="BLOCKED"/);
});

test("rrb-08 tool emits the runbook evidence template fields", () => {
  for (const field of [
    "Date/time:",
    "Release candidate / commit if known:",
    "Origin:",
    "Mode:",
    "Device model:",
    "OS + version:",
    "Browser + version:",
    "Network context:",
    "Observed defects:",
    "Overall RRB-08 verdict:",
  ]) {
    assert.ok(tool.includes(field), `missing template field: ${field}`);
  }
});

test("rrb-08 tool is self-contained, privacy-safe and not indexable", () => {
  assert.match(tool, /name="robots" content="noindex,nofollow"/);
  assert.doesNotMatch(tool, /<script src=/);
  assert.doesNotMatch(tool, /<link/);
  assert.doesNotMatch(tool, /https?:\/\/(?!mfvn)/); // no external calls except comments
  assert.match(tool, /fetch\("\/api\/health"\)/); // same-origin build identity only
  assert.doesNotMatch(tool, /XMLHttpRequest|sendBeacon|gtag|analytics/i);
});
