import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  loadProjectKnowledgeContract,
  PROJECT_KNOWLEDGE_CONTRACT_PATH,
  validateProjectKnowledgeContract,
} from "./project-knowledge-contract.mjs";
import {
  validateActivePacketRegistry,
  validateActivePacketReferences,
} from "./active-packet-registry.mjs";

function validContract() {
  return {
    schemaVersion: 2,
    statusAssertions: {
      validationRequiredPerWorkstream: true,
      globalFeatureFreeze: false,
    },
    supersededClaimIds: [
      "reports-no-comparison-or-trends",
      "import-integrity-future-work",
    ],
  };
}

function withFixture(files, run) {
  const root = mkdtempSync(join(tmpdir(), "moneyflow-knowledge-"));
  try {
    for (const [path, content] of Object.entries(files)) {
      const target = join(root, path);
      mkdirSync(join(target, ".."), { recursive: true });
      writeFileSync(target, content);
    }
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("accepts the durable project knowledge contract", () => {
  const contract = validContract();
  withFixture(
    { [PROJECT_KNOWLEDGE_CONTRACT_PATH]: `${JSON.stringify(contract, null, 2)}\n` },
    (root) => {
      const loaded = loadProjectKnowledgeContract(root);
      assert.deepEqual(loaded.failures, []);
      assert.deepEqual(loaded.contract, contract);
    },
  );
});

test("rejects malformed or contradictory contract values", () => {
  const contract = validContract();
  contract.statusAssertions.globalFeatureFreeze = true;
  contract.supersededClaimIds.push(contract.supersededClaimIds[0]);

  const failures = validateProjectKnowledgeContract(contract);
  assert.ok(failures.some((failure) => failure.includes("globalFeatureFreeze")));
  assert.ok(failures.some((failure) => failure.includes("duplicates")));
});

test("rejects the removed schema rather than silently accepting stale tracking state", () => {
  const contract = { ...validContract(), schemaVersion: 1, currentProjectMemory: {} };
  const failures = validateProjectKnowledgeContract(contract);
  assert.ok(failures.some((failure) => failure.includes("schemaVersion must equal 2")));
});

test("active packet directory cannot silently regain queue semantics", () => {
  withFixture(
    {
      "docs/plans/active/README.md": [
        "# MoneyFlow — active plan packets",
        "**Status:** packet directory, not a queue or authority source",
        "",
      ].join("\n"),
    },
    (root) => assert.deepEqual(validateActivePacketRegistry(root), []),
  );

  withFixture(
    {
      "docs/plans/active/README.md": "# Current Work Board\n| NOW | NEXT |\n",
    },
    (root) => {
      assert.ok(validateActivePacketRegistry(root).length > 0);
    },
  );
});

test("active packet references must resolve without selecting execution authority", () => {
  withFixture(
    {
      "docs/plans/active/README.md": "**Status:** packet directory, not a queue or authority source\n",
      "docs/plans/active/example.md": "# Example\n",
      "README.md": "See docs/plans/active/example.md.\n",
    },
    (root) => assert.deepEqual(validateActivePacketReferences(root, ["README.md"]), []),
  );

  withFixture(
    {
      "docs/plans/active/README.md": "**Status:** packet directory, not a queue or authority source\n",
      "README.md": "See docs/plans/active/missing.md.\n",
    },
    (root) => {
      assert.deepEqual(validateActivePacketReferences(root, ["README.md"]), [
        "README.md references missing active packet: missing.md",
      ]);
    },
  );
});
