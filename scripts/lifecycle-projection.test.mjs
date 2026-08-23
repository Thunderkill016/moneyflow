import assert from "node:assert/strict";
import test from "node:test";

import { validateLifecycleProjection } from "./lifecycle-projection.mjs";

function board({ projectionPr = null, current = true } = {}) {
  return [
    "# Board",
    "**Current main baseline:** `abc1234`",
    projectionPr ? `**Post-merge projection:** PR #${projectionPr}` : "",
    "| Packet | Role now | Authority boundary |",
    "|---|---|---|",
    current
      ? "| `442-source-lineage-lifecycle.md` | current agent-executable Class 3 slice | bounded |"
      : "",
    "| `master.md` | master product program | sequencing |",
    "",
  ].join("\n");
}

function memory(projectionPr = null) {
  return [
    "# Memory",
    projectionPr ? `**Post-merge projection:** PR #${projectionPr}` : "",
    "",
  ].join("\n");
}

function record(impact) {
  return `# PR\n\n- Lifecycle impact: ${impact}\n`;
}

const closeoutChanges = [
  { status: "M", path: "docs/plans/active/README.md" },
  {
    status: "D",
    path: "docs/plans/active/442-source-lineage-lifecycle.md",
  },
  {
    status: "A",
    path: "docs/plans/completed/2026-08-23-442-source-lineage-lifecycle.md",
  },
  { status: "M", path: "docs/research/CURRENT_PROJECT_MEMORY.md" },
];

test("one PR can converge its completed current slice before merge", () => {
  const result = validateLifecycleProjection({
    baseBoard: board(),
    board: board({ projectionPr: 445, current: false }),
    currentMemory: memory(445),
    prRecord: record("completes current slice"),
    prNumber: 445,
    changes: closeoutChanges,
  });

  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("a completion cannot defer board convergence to a later PR", () => {
  const result = validateLifecycleProjection({
    baseBoard: board(),
    board: board(),
    currentMemory: memory(),
    prRecord: record("completes current slice"),
    prNumber: 445,
    changes: [],
  });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("must carry")));
});

test("a ready PR that owns the current slice cannot avoid convergence with metadata", () => {
  const result = validateLifecycleProjection({
    baseBoard: board(),
    board: board(),
    currentMemory: memory(),
    prRecord: record("none"),
    prNumber: 445,
    changes: [],
    readyCurrentOwnedByPr: true,
  });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) =>
      failure.includes("must enter same-PR post-merge convergence"),
    ),
  );
});

test("a projection cannot pre-promote follow-on work", () => {
  const result = validateLifecycleProjection({
    baseBoard: board(),
    board: board({ projectionPr: 445, current: true }),
    currentMemory: memory(445),
    prRecord: record("completes current slice"),
    prNumber: 445,
    changes: closeoutChanges,
  });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) =>
      failure.includes("zero current agent-executable slices"),
    ),
  );
});

test("a projection must converge current memory in the same PR", () => {
  const result = validateLifecycleProjection({
    baseBoard: board(),
    board: board({ projectionPr: 445, current: false }),
    currentMemory: memory(),
    prRecord: record("completes current slice"),
    prNumber: 445,
    changes: closeoutChanges.filter(
      (change) => change.path !== "docs/research/CURRENT_PROJECT_MEMORY.md",
    ),
  });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) => failure.includes("CURRENT_PROJECT_MEMORY")),
  );
});

test("a projection must archive the current packet in the same PR", () => {
  const result = validateLifecycleProjection({
    baseBoard: board(),
    board: board({ projectionPr: 445, current: false }),
    currentMemory: memory(445),
    prRecord: record("completes current slice"),
    prNumber: 445,
    changes: closeoutChanges.filter(
      (change) => !change.path.startsWith("docs/plans/completed/"),
    ),
  });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("must archive")));
});

test("a copied projection number is rejected when this PR changes the board", () => {
  const result = validateLifecycleProjection({
    baseBoard: board(),
    board: board({ projectionPr: 444, current: false }),
    currentMemory: memory(444),
    prRecord: record("completes current slice"),
    prNumber: 445,
    changes: closeoutChanges,
  });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) => failure.includes("current PR is #445")),
  );
});

test("removing the current packet without a projection fails closed", () => {
  const result = validateLifecycleProjection({
    baseBoard: board(),
    board: board({ current: false }),
    currentMemory: memory(),
    prRecord: record("none"),
    prNumber: 445,
    changes: closeoutChanges,
  });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) =>
      failure.includes("requires a same-PR post-merge projection"),
    ),
  );
});
