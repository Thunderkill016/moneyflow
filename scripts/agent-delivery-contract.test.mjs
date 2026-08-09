import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  validateExecutionPacketSet,
  validatePacket,
  validateTemplateStructure,
} from "./agent-delivery-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function packet({
  state = "implementing",
  risk = 3,
  workstream = "test-workstream",
  role = "execution",
  gate = "G1",
  gateTask = "T1",
  actionKind = "implement",
  nextAction = "implement the bounded change",
  nextActionContinuation = "",
  token = "Go",
  covers = "AC1",
  evidence = "node test",
  implementer = "author-session",
  evaluator = "<pending>",
  overlap = "none",
  reviewArtifact = "<pending>",
  inputs = "<pending>",
  result = "pending",
  duplicateGate = false,
  includeGate = role === "execution",
} = {}) {
  const continuation = nextActionContinuation ? `\n  ${nextActionContinuation}` : "";
  const gateSection = `## Current decision gate

- Gate ID: ${gate}
- Gate task: ${gateTask}
- Action kind: ${actionKind}
- Next allowed action: ${nextAction}${continuation}
- Approval token: \`${token}\`
- Consumes approval: yes
- After action: return to evaluating and record evidence
`;

  return `# Fixture

**Status:** ${state}
**Execution state:** ${state}
**Risk class:** ${risk}
**Workstream:** ${workstream}
**Packet role:** ${role}
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** test
**Issue/PR:** test
**Last updated:** 2026-08-09

${includeGate ? gateSection : ""}${includeGate && duplicateGate ? `\n${gateSection}` : ""}
## Specification

### Acceptance criteria

- [ ] AC1: first requirement

## Tasks

| ID | Task | Covers | Dependency | Evidence | Status |
|---|---|---|---|---|---|
| T1 | implement | ${covers} | none | ${evidence} | todo |

## Evaluation

### Independent evaluation

- Implementer: ${implementer}
- Evaluator: ${evaluator}
- Implementer overlap: ${overlap}
- Review artifact: ${reviewArtifact}
- Inputs reviewed: ${inputs}
- Author summary treated as authority: no

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| AC1 | exact evidence | ${result} |
`;
}

function independentPacket(overrides = {}) {
  return packet({
    state: "ready_for_review",
    evaluator: "fresh-review-session",
    reviewArtifact: "PR #1 review comment",
    inputs: "specification + actual diff + exact evidence",
    result: "pass",
    ...overrides,
  });
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

test("compound next action with then fails closed", () => {
  const errors = validatePacket(
    packet({ nextAction: "obtain independent review then address findings" }),
  );
  assert.ok(errors.some((error) => error.includes("appears compound")));
});

test("compound next action with comma verb chaining fails closed", () => {
  const errors = validatePacket(packet({ nextAction: "review PR #331, fix blockers" }));
  assert.ok(errors.some((error) => error.includes("appears compound")));
});

test("compound next action cannot hide in a continuation line", () => {
  const errors = validatePacket(
    packet({ nextAction: "review PR #331", nextActionContinuation: "then fix blockers" }),
  );
  assert.ok(errors.some((error) => error.includes("continuation lines are not allowed")));
});

test("gate task must reference one known task", () => {
  const errors = validatePacket(packet({ gateTask: "T99" }));
  assert.ok(errors.some((error) => error.includes("Gate task references unknown T99")));
});

test("task coverage cannot reference an unknown acceptance criterion", () => {
  const errors = validatePacket(packet({ covers: "AC99" }));
  assert.ok(errors.some((error) => error.includes("references unknown AC99")));
  assert.ok(errors.some((error) => error.includes("AC1 has no covering task")));
});

test("planned-or-later task must name evidence", () => {
  const errors = validatePacket(packet({ evidence: "pending — run exact test" }));
  assert.ok(errors.some((error) => error.includes("must name an evidence target")));
});

test("supporting packet cannot expose a generic Go gate", () => {
  const errors = validatePacket(packet({ role: "supporting", includeGate: true }));
  assert.ok(errors.some((error) => error.includes("supporting packet must not expose")));
});

test("only one execution packet is allowed per workstream", () => {
  const errors = validateExecutionPacketSet([
    { file: "a.md", markdown: packet({ workstream: "secure" }) },
    { file: "b.md", markdown: packet({ workstream: "secure" }) },
    { file: "c.md", markdown: packet({ workstream: "other" }) },
  ]);
  assert.ok(errors.some((error) => error.includes("workstream secure")));
});

test("Class 3 ready_for_review rejects blocked and pending-prefixed review fields", () => {
  const errors = validatePacket(
    independentPacket({
      evaluator: "blocked — reviewer unavailable",
      reviewArtifact: "pending — attach review",
      inputs: "pending — inspect actual diff + exact evidence",
    }),
  );
  assert.ok(errors.some((error) => error.includes("independent evaluator is unresolved")));
  assert.ok(errors.some((error) => error.includes("review artifact is unresolved")));
  assert.ok(errors.some((error) => error.includes("evaluation inputs are unresolved")));
});

test("Class 3 ready_for_review rejects sentinel review placeholders", () => {
  for (const sentinel of ["none", "N/A", "not applicable", "missing", "unavailable"]) {
    const evaluatorErrors = validatePacket(independentPacket({ evaluator: sentinel }));
    assert.ok(
      evaluatorErrors.some((error) => error.includes("independent evaluator is unresolved")),
      `expected evaluator sentinel ${sentinel} to fail`,
    );

    const artifactErrors = validatePacket(independentPacket({ reviewArtifact: sentinel }));
    assert.ok(
      artifactErrors.some((error) => error.includes("review artifact is unresolved")),
      `expected artifact sentinel ${sentinel} to fail`,
    );
  }
});

test("Class 3 ready_for_review rejects evaluator equal to implementer", () => {
  const errors = validatePacket(
    independentPacket({ implementer: "same-session", evaluator: "same-session" }),
  );
  assert.ok(errors.some((error) => error.includes("must differ from implementer")));
});

test("Class 3 ready_for_review rejects implementer overlap", () => {
  const errors = validatePacket(independentPacket({ overlap: "same primary agent" }));
  assert.ok(errors.some((error) => error.includes("Implementer overlap must be none")));
});

test("Class 3 ready_for_review requires a concrete review artifact", () => {
  const errors = validatePacket(independentPacket({ reviewArtifact: "<pending>" }));
  assert.ok(errors.some((error) => error.includes("review artifact is unresolved")));
});

test("Class 3 ready_for_review inputs must name actual diff and exact evidence", () => {
  const errors = validatePacket(independentPacket({ inputs: "specification only" }));
  assert.ok(errors.some((error) => error.includes("must include actual diff and exact evidence")));
});

test("Class 3 ready_for_review requires passing criterion evidence", () => {
  const errors = validatePacket(independentPacket({ result: "pending" }));
  assert.ok(errors.some((error) => error.includes("acceptance evidence must be pass")));
});

test("Class 3 ready_for_review passes with distinct review identity and artifact", () => {
  assert.deepEqual(validatePacket(independentPacket()), []);
});

test("repository changed active packets satisfy the delivery contract", () => {
  const output = execFileSync(
    process.execPath,
    [path.join(ROOT, "scripts/agent-delivery-contract.mjs")],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.match(output, /Agent delivery contract passed/);
});
