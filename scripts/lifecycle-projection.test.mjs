import assert from "node:assert/strict";
import test from "node:test";

import {
  packetRecordsPr,
  validateLifecycleTransition,
} from "./lifecycle-projection.mjs";

const currentPath = "docs/plans/active/442-source-lineage-lifecycle.md";

function manifest(current = currentPath) {
  return {
    schemaVersion: 2,
    master: {
      path: "docs/plans/active/master.md",
      introducedByPr: 433,
      supersedes: [],
    },
    current: current
      ? {
          path: current,
          introducedByPr: 442,
        }
      : null,
  };
}

function record(impact) {
  return `# PR\n\n- Lifecycle impact: ${impact}\n`;
}

const closeoutChanges = [
  { status: "M", path: "docs/plans/PLAN_AUTHORITY.json" },
  { status: "D", path: currentPath },
  {
    status: "A",
    path: "docs/plans/completed/2026-08-23-442-source-lineage-lifecycle.md",
  },
  { status: "M", path: "docs/research/CURRENT_PROJECT_MEMORY.md" },
];

test("a planning or recovery PR can select one current slice through the manifest", () => {
  const result = validateLifecycleTransition({
    baseManifest: manifest(null),
    manifest: manifest(),
    prRecord: record("authority transition"),
    prNumber: 529,
    changes: [
      { status: "M", path: "docs/plans/PLAN_AUTHORITY.json" },
      { status: "M", path: "docs/research/CURRENT_PROJECT_MEMORY.md" },
    ],
  });

  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("selecting current authority must update current memory", () => {
  const result = validateLifecycleTransition({
    baseManifest: manifest(null),
    manifest: manifest(),
    prRecord: record("authority transition"),
    prNumber: 529,
    changes: [{ status: "M", path: "docs/plans/PLAN_AUTHORITY.json" }],
  });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("CURRENT_PROJECT_MEMORY")));
});

test("one PR can complete its current slice to zero-current", () => {
  const result = validateLifecycleTransition({
    baseManifest: manifest(),
    manifest: manifest(null),
    prRecord: record("completes current slice"),
    prNumber: 445,
    changes: closeoutChanges,
  });

  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("a completing PR cannot directly preselect follow-on work", () => {
  const result = validateLifecycleTransition({
    baseManifest: manifest(),
    manifest: manifest("docs/plans/active/next.md"),
    prRecord: record("completes current slice"),
    prNumber: 445,
    changes: [{ status: "M", path: "docs/plans/PLAN_AUTHORITY.json" }],
  });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("may not swap")));
});

test("completion must archive the current packet in the same PR", () => {
  const result = validateLifecycleTransition({
    baseManifest: manifest(),
    manifest: manifest(null),
    prRecord: record("completes current slice"),
    prNumber: 445,
    changes: closeoutChanges.filter(
      (change) => !change.path.startsWith("docs/plans/completed/"),
    ),
  });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("must archive")));
});

test("a ready PR that owns current work cannot avoid convergence with metadata", () => {
  const result = validateLifecycleTransition({
    baseManifest: manifest(),
    manifest: manifest(),
    prRecord: record("none"),
    prNumber: 445,
    changes: [],
    readyCurrentOwnedByPr: true,
  });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) =>
      failure.includes("same-PR lifecycle convergence"),
    ),
  );
});

test("current packet ownership is read only from packet metadata", () => {
  assert.equal(
    packetRecordsPr(
      "# Packet\n\n**PR:** #445\n\nResearch mentions PR #999 elsewhere.\n",
      445,
    ),
    true,
  );
  assert.equal(
    packetRecordsPr(
      "# Packet\n\n**Issue/PR:** #442 / PR #445\n\nResearch mentions PR #999.\n",
      445,
    ),
    true,
  );
  assert.equal(
    packetRecordsPr(
      "# Packet\n\n**PR:** #444\n\nResearch mentions PR #445 but does not own it.\n",
      445,
    ),
    false,
  );
});

test("completion wording without a manifest transition fails closed", () => {
  const result = validateLifecycleTransition({
    baseManifest: manifest(),
    manifest: manifest(),
    prRecord: record("completes current slice"),
    prNumber: 445,
    changes: [],
  });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) =>
      failure.includes("does not transition current"),
    ),
  );
});
