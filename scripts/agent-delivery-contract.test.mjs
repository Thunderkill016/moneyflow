import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  validatePacket,
  validateTemplateStructure,
} from "./agent-delivery-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function packet({
  state = "implementing",
  risk = 3,
  gate = "G1",
  token = "Go",
  covers = "AC1",
  evidence = "node test",
  independent = false,
  result = "pending",
  duplicateGate = false,
} = {}) {
  const gateSection = `## Current decision gate

- Gate ID: ${gate}
- Next allowed action: implement the bounded change
- Approval token: \`${token}\`
- Consumes approval: yes
- After action: return to evaluating and record evidence
`;

  return `# Fixture

**Status:** ${state}
**Execution state:** ${state}
**Risk class:** ${risk}
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** test
**Issue/PR:** test
**Last updated:** 2026-08-09

${gateSection}${duplicateGate ? `\n${gateSection}` : ""}
## Specification

### Acceptance criteria

- [ ] AC1: first requirement

## Tasks

| ID | Task | Covers | Dependency | Evidence | Status |
|---|---|---|---|---|---|
| T1 | implement | ${covers} | none | ${evidence} | todo |

## Evaluation

### Independent evaluation

- Evaluator: ${independent ? "independent-reviewer" : "<pending>"}
- Implementer overlap: none
- Inputs reviewed: ${independent ? "specification + actual diff + exact evidence" : "<pending>"}
- Author summary treated as authority: no

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| AC1 | exact evidence | ${result} |
`;
}

test("canonical work-packet template contains the structural contract", () => {
  const markdown = readFileSync(
    path.join(ROOT, "docs/templates/FEATURE_WORK_PACKET.md"),
    "utf8",
  );
  assert.deepEqual(validateTemplateStructure(markdown), []);
});

test("valid implementing Class 3 packet passes", () => {
  assert.deepEqual(validatePacket(packet()), []);
});

test("duplicate current decision gates fail closed", () => {
  const errors = validatePacket(packet({ duplicateGate: true }));
  assert.ok(errors.some((error) => error.includes("exactly one Current decision gate")));
});

test("generic approval token is fixed to Go", () => {
  const errors = validatePacket(packet({ token: "finish-everything" }));
  assert.ok(errors.some((error) => error.includes("Approval token must be Go")));
});

test("task coverage cannot reference an unknown acceptance criterion", () => {
  const errors = validatePacket(packet({ covers: "AC99" }));
  assert.ok(errors.some((error) => error.includes("references unknown AC99")));
  assert.ok(errors.some((error) => error.includes("AC1 has no covering task")));
});

test("planned-or-later task must name evidence", () => {
  const errors = validatePacket(packet({ evidence: "<pending>" }));
  assert.ok(errors.some((error) => error.includes("must name an evidence target")));
});

test("Class 3 ready_for_review requires independent evaluation", () => {
  const errors = validatePacket(
    packet({ state: "ready_for_review", independent: false, result: "pass" }),
  );
  assert.ok(errors.some((error) => error.includes("independent evaluator is unresolved")));
  assert.ok(errors.some((error) => error.includes("independent evaluation inputs are unresolved")));
});

test("Class 3 ready_for_review requires passing criterion evidence", () => {
  const errors = validatePacket(
    packet({ state: "ready_for_review", independent: true, result: "pending" }),
  );
  assert.ok(errors.some((error) => error.includes("acceptance evidence must be pass")));
});

test("Class 3 ready_for_review passes with independent review and AC evidence", () => {
  assert.deepEqual(
    validatePacket(
      packet({ state: "ready_for_review", independent: true, result: "pass" }),
    ),
    [],
  );
});

test("repository changed active packets satisfy the delivery contract", () => {
  const output = execFileSync(
    process.execPath,
    [path.join(ROOT, "scripts/agent-delivery-contract.mjs")],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.match(output, /Agent delivery contract passed/);
});
