import assert from "node:assert/strict";
import test from "node:test";
import { validateWorkPacket } from "./work-packet-contract.mjs";

const CONTROL_CONTRACT = `## Control contract

### State

- Location: docs/plans/active/example.md
- Writer/owner: scoped coding agent
- Propagation: repository packet gate

### Feedback

- Expected failing signal: traceability fixture fails before parser support
- Success signal: focused traceability tests pass
- Semantic evidence: each criterion can be followed to task evidence

### Removal impact

- What breaks if removed: packet gaps become invisible
- Rollback: revert the bounded checker change and rerun policy tests

### Action safety

- Permissions: branch-only repository writes
- Reversibility: Git revert only
- Escalation: stop for provider or production changes
- Failure containment: CI policy only
`;

function packet({
  state = "planned",
  criteria = [
    "- [ ] AC1: First observable outcome.",
    "- [ ] AC2: Second observable outcome.",
  ],
  tasks = [
    "| T1 | Implement first outcome | AC1 | none | focused test | done |",
    "| T2 | Implement second outcome | AC2 | T1 | browser evidence | done |",
    "| T3 | Record provenance | internal: research provenance | none | research note | done |",
  ],
  evaluation = [
    "| AC1 | focused test | pass |",
    "| AC2 | browser evidence | pass |",
  ],
} = {}) {
  return `# Example

**Status:** ${state}
**Execution state:** ${state}

${CONTROL_CONTRACT}

## Specification

### Acceptance criteria

${criteria.join("\n")}

## Tasks

| ID | Task | Covers | Dependency | Evidence | Status |
|---|---|---|---|---|---|
${tasks.join("\n")}

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
${evaluation.join("\n")}
`;
}

test("accepts complete planned requirement-task-evidence traceability", () => {
  assert.deepEqual(validateWorkPacket(packet()), []);
});

test("rejects an acceptance criterion with no covering task", () => {
  const failures = validateWorkPacket(
    packet({
      tasks: [
        "| T1 | Implement first outcome | AC1 | none | focused test | done |",
        "| T3 | Record provenance | internal: research provenance | none | research note | done |",
      ],
    }),
  );
  assert.ok(
    failures.some(
      (failure) => failure.includes("AC2") && failure.includes("cover"),
    ),
  );
});

test("rejects a task that references an unknown acceptance criterion", () => {
  const failures = validateWorkPacket(
    packet({
      tasks: [
        "| T1 | Implement first outcome | AC1 | none | focused test | done |",
        "| T2 | Implement unknown outcome | AC99 | T1 | focused test | done |",
        "| T3 | Implement second outcome | AC2 | T2 | browser evidence | done |",
      ],
    }),
  );
  assert.ok(
    failures.some(
      (failure) => failure.includes("AC99") && failure.includes("unknown"),
    ),
  );
});

test("rejects duplicate acceptance criterion identifiers", () => {
  const failures = validateWorkPacket(
    packet({
      criteria: [
        "- [ ] AC1: First observable outcome.",
        "- [ ] AC1: Duplicate identifier.",
      ],
      tasks: [
        "| T1 | Implement first outcome | AC1 | none | focused test | done |",
      ],
      evaluation: ["| AC1 | focused test | pass |"],
    }),
  );
  assert.ok(
    failures.some(
      (failure) => failure.includes("duplicate") && failure.includes("AC1"),
    ),
  );
});

test("requires an internal task to explain why it has no acceptance criterion", () => {
  const failures = validateWorkPacket(
    packet({
      tasks: [
        "| T1 | Implement first outcome | AC1 | none | focused test | done |",
        "| T2 | Implement second outcome | AC2 | T1 | browser evidence | done |",
        "| T3 | Record provenance | internal: | none | research note | done |",
      ],
    }),
  );
  assert.ok(
    failures.some(
      (failure) => failure.includes("T3") && failure.includes("internal"),
    ),
  );
});

test("requires every planned task to name evidence", () => {
  const failures = validateWorkPacket(
    packet({
      tasks: [
        "| T1 | Implement first outcome | AC1 | none |  | done |",
        "| T2 | Implement second outcome | AC2 | T1 | browser evidence | done |",
      ],
    }),
  );
  assert.ok(
    failures.some(
      (failure) => failure.includes("T1") && failure.includes("Evidence"),
    ),
  );
});

test("requires ready-for-review packets to record evidence for every criterion", () => {
  const failures = validateWorkPacket(
    packet({
      state: "ready_for_review",
      evaluation: ["| AC1 | focused test | pass |"],
    }),
  );
  assert.ok(
    failures.some(
      (failure) => failure.includes("AC2") && failure.includes("acceptance evidence"),
    ),
  );
});

test("rejects ready-for-review criterion evidence that is still pending", () => {
  const failures = validateWorkPacket(
    packet({
      state: "ready_for_review",
      evaluation: [
        "| AC1 | pending | pending |",
        "| AC2 | browser evidence | pass |",
      ],
    }),
  );
  assert.ok(
    failures.some(
      (failure) => failure.includes("AC1") && failure.includes("resolved"),
    ),
  );
});

test("does not force task traceability before the planned state", () => {
  const earlyPacket = `# Early discovery

**Status:** specified
**Execution state:** specified

${CONTROL_CONTRACT}

## Specification

### Acceptance criteria

- [ ] Observable outcome still being refined.

## Tasks

Not generated yet.
`;
  assert.deepEqual(validateWorkPacket(earlyPacket), []);
});
