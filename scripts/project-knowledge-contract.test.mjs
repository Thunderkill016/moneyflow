import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  loadProjectKnowledgeContract,
  PROJECT_KNOWLEDGE_CONTRACT_PATH,
  validateCurrentProjectMemory,
  validateProjectKnowledgeContract,
} from "./project-knowledge-contract.mjs";

function validContract() {
  return {
    schemaVersion: 1,
    currentProjectMemory: {
      path: "docs/research/CURRENT_PROJECT_MEMORY.md",
      requiredHeadings: [
        "# MoneyFlow — current project memory",
        "## 12. Superseded-status register",
      ],
      requiredReferences: ["docs/context/README.md"],
      budget: {
        targetMinLines: 2,
        targetMaxLines: 8,
        softMaxLines: 10,
        softMaxBytes: 512,
        hardMaxLines: 20,
        hardMaxBytes: 1024,
      },
    },
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

function withFixture(contract, memory, run) {
  const root = mkdtempSync(join(tmpdir(), "moneyflow-knowledge-"));
  try {
    const contractPath = join(root, PROJECT_KNOWLEDGE_CONTRACT_PATH);
    const memoryPath = join(root, contract.currentProjectMemory.path);
    mkdirSync(join(contractPath, ".."), { recursive: true });
    mkdirSync(join(memoryPath, ".."), { recursive: true });
    writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`);
    writeFileSync(memoryPath, memory);
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("accepts a structured contract and valid current-memory shape", () => {
  const contract = validContract();
  const memory = [
    "# MoneyFlow — current project memory",
    "See docs/context/README.md for routing.",
    "Reports now include comparison and trend views.",
    "## 12. Superseded-status register",
    "The old reports-gap statement is historical only.",
    "",
  ].join("\n");

  withFixture(contract, memory, (root) => {
    const loaded = loadProjectKnowledgeContract(root);
    assert.deepEqual(loaded.failures, []);
    const result = validateCurrentProjectMemory(root, loaded.contract);
    assert.deepEqual(result.failures, []);
    assert.deepEqual(result.warnings, []);
  });
});

test("does not turn superseded prose wording into a machine API", () => {
  const contract = validContract();
  const first = [
    "# MoneyFlow — current project memory",
    "See docs/context/README.md.",
    "## 12. Superseded-status register",
    "Reports lack previous-period comparison or trends.",
    "",
  ].join("\n");
  const paraphrased = first.replace(
    "Reports lack previous-period comparison or trends.",
    "Historical claim: report comparison and trend views were once absent.",
  );

  withFixture(contract, first, (root) => {
    const baseline = validateCurrentProjectMemory(root, contract);
    assert.deepEqual(baseline.failures, []);
  });
  withFixture(contract, paraphrased, (root) => {
    const result = validateCurrentProjectMemory(root, contract);
    assert.deepEqual(result.failures, []);
  });
});

test("fails when a required structural heading disappears", () => {
  const contract = validContract();
  const memory = "# MoneyFlow — current project memory\nSee docs/context/README.md.\n";

  withFixture(contract, memory, (root) => {
    const result = validateCurrentProjectMemory(root, contract);
    assert.ok(
      result.failures.some((failure) =>
        failure.includes("## 12. Superseded-status register"),
      ),
    );
  });
});

test("fails when hard memory budgets are exceeded", () => {
  const contract = validContract();
  contract.currentProjectMemory.budget.hardMaxLines = 4;
  const memory = [
    "# MoneyFlow — current project memory",
    "See docs/context/README.md.",
    "one",
    "two",
    "## 12. Superseded-status register",
    "",
  ].join("\n");

  withFixture(contract, memory, (root) => {
    const result = validateCurrentProjectMemory(root, contract);
    assert.ok(result.failures.some((failure) => failure.includes("hard hot-memory budget")));
  });
});

test("rejects malformed or contradictory contract values", () => {
  const contract = validContract();
  contract.currentProjectMemory.budget.targetMinLines = 12;
  contract.currentProjectMemory.budget.targetMaxLines = 8;
  contract.statusAssertions.globalFeatureFreeze = true;
  contract.supersededClaimIds.push(contract.supersededClaimIds[0]);

  const failures = validateProjectKnowledgeContract(contract);
  assert.ok(failures.some((failure) => failure.includes("targetMinLines")));
  assert.ok(failures.some((failure) => failure.includes("globalFeatureFreeze")));
  assert.ok(failures.some((failure) => failure.includes("duplicates")));
});
