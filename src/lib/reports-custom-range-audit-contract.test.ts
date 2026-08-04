import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const auditConfig = readFileSync("playwright.audit.config.ts", "utf8");
const reportsAudit = readFileSync(
  "e2e/audit/reports-custom-range.audit.spec.ts",
  "utf8",
);

function countMatches(source: string, pattern: RegExp) {
  return [...source.matchAll(pattern)].length;
}

test("custom report range wiring is selected by the cross-device audit", () => {
  assert.match(
    auditConfig,
    /const reportsCustomRangeSpec = \/reports-custom-range\\\.audit\\\.spec\\\.ts\//,
  );
  assert.equal(
    countMatches(auditConfig, /testMatch: reportsCustomRangeSpec/g),
    3,
    "custom reports must run on phone, desktop and WebKit projects",
  );
});

test("custom report audit proves range, totals, reload, repair and export wiring", () => {
  for (const title of [
    "choosing a window changes the heading, the totals and the export link",
    "a reversed window is repaired and the repair is stated",
    "an unusable window falls back to the month preset and says so",
    "the export downloads the chosen window, not the month preset",
  ]) {
    assert.match(reportsAudit, new RegExp(`test\\(\"${title}`));
  }
  assert.match(reportsAudit, /expect\(customCount\)\.not\.toBe\(presetCount\)/);
  assert.match(reportsAudit, /page\.reload\(/);
  assert.match(reportsAudit, /moneyflow-\$\{RANGE\.from\}-\$\{RANGE\.to\}\.csv/);
});
