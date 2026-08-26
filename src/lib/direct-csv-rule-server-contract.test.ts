import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/app/actions/direct-csv-import.ts", "utf8");

test("Direct CSV submits paired rule evidence only through atomic source preparation", () => {
  assert.match(source, /appliedRuleId: optionalUuidSchema/);
  assert.match(source, /appliedRuleVersion: z\.number\(\)\.int\(\)\.min\(1\)\.optional\(\)/);
  assert.match(source, /invalid_direct_csv_rule_evidence/);
  assert.match(source, /prepare_direct_csv_candidates_with_rules/);
  assert.match(source, /p_batch:/);
  assert.match(source, /p_candidates:/);
  assert.doesNotMatch(source, /\.from\("import_batches"\)\s*\.insert/);
  assert.doesNotMatch(source, /\.from\("inbox_candidates"\)\s*\.insert/);
});
