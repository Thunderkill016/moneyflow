import { readFileSync } from "node:fs";
import { join } from "node:path";

export const PROJECT_KNOWLEDGE_CONTRACT_PATH =
  "docs/research/PROJECT_KNOWLEDGE_CONTRACT.json";

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isNonEmptyStringArray(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

export function validateProjectKnowledgeContract(contract) {
  const failures = [];

  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    return ["project knowledge contract must be a JSON object"];
  }

  if (contract.schemaVersion !== 1) {
    failures.push("project knowledge contract schemaVersion must equal 1");
  }

  const memory = contract.currentProjectMemory;
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    failures.push("currentProjectMemory must be an object");
    return failures;
  }

  if (typeof memory.path !== "string" || memory.path.trim().length === 0) {
    failures.push("currentProjectMemory.path must be a non-empty string");
  }

  if (!isNonEmptyStringArray(memory.requiredHeadings)) {
    failures.push("currentProjectMemory.requiredHeadings must be a non-empty string array");
  }

  if (!isNonEmptyStringArray(memory.requiredReferences)) {
    failures.push("currentProjectMemory.requiredReferences must be a non-empty string array");
  }

  const budget = memory.budget;
  if (!budget || typeof budget !== "object" || Array.isArray(budget)) {
    failures.push("currentProjectMemory.budget must be an object");
    return failures;
  }

  for (const key of [
    "targetMinLines",
    "targetMaxLines",
    "softMaxLines",
    "softMaxBytes",
    "hardMaxLines",
    "hardMaxBytes",
  ]) {
    if (!isPositiveInteger(budget[key])) {
      failures.push(`currentProjectMemory.budget.${key} must be a positive integer`);
    }
  }

  if (
    isPositiveInteger(budget.targetMinLines) &&
    isPositiveInteger(budget.targetMaxLines) &&
    budget.targetMinLines > budget.targetMaxLines
  ) {
    failures.push("memory targetMinLines must not exceed targetMaxLines");
  }

  if (
    isPositiveInteger(budget.targetMaxLines) &&
    isPositiveInteger(budget.softMaxLines) &&
    budget.targetMaxLines > budget.softMaxLines
  ) {
    failures.push("memory targetMaxLines must not exceed softMaxLines");
  }

  if (
    isPositiveInteger(budget.softMaxLines) &&
    isPositiveInteger(budget.hardMaxLines) &&
    budget.softMaxLines > budget.hardMaxLines
  ) {
    failures.push("memory softMaxLines must not exceed hardMaxLines");
  }

  if (
    isPositiveInteger(budget.softMaxBytes) &&
    isPositiveInteger(budget.hardMaxBytes) &&
    budget.softMaxBytes > budget.hardMaxBytes
  ) {
    failures.push("memory softMaxBytes must not exceed hardMaxBytes");
  }

  const assertions = contract.statusAssertions;
  if (!assertions || typeof assertions !== "object" || Array.isArray(assertions)) {
    failures.push("statusAssertions must be an object");
  } else {
    if (assertions.validationRequiredPerWorkstream !== true) {
      failures.push("statusAssertions.validationRequiredPerWorkstream must equal true");
    }
    if (assertions.globalFeatureFreeze !== false) {
      failures.push("statusAssertions.globalFeatureFreeze must equal false");
    }
  }

  if (!isNonEmptyStringArray(contract.supersededClaimIds)) {
    failures.push("supersededClaimIds must be a non-empty string array");
  } else if (new Set(contract.supersededClaimIds).size !== contract.supersededClaimIds.length) {
    failures.push("supersededClaimIds must not contain duplicates");
  }

  return failures;
}

export function loadProjectKnowledgeContract(root) {
  let contract;
  try {
    contract = JSON.parse(
      readFileSync(join(root, PROJECT_KNOWLEDGE_CONTRACT_PATH), "utf8"),
    );
  } catch (error) {
    return {
      contract: null,
      failures: [
        `${PROJECT_KNOWLEDGE_CONTRACT_PATH} could not be parsed: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      ],
    };
  }

  return {
    contract,
    failures: validateProjectKnowledgeContract(contract),
  };
}

export function validateCurrentProjectMemory(root, contract) {
  const failures = [];
  const warnings = [];
  const memoryContract = contract.currentProjectMemory;
  let snapshot;

  try {
    snapshot = readFileSync(join(root, memoryContract.path), "utf8");
  } catch (error) {
    return {
      failures: [
        `${memoryContract.path} could not be read: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      ],
      warnings,
      metrics: null,
    };
  }

  for (const heading of memoryContract.requiredHeadings) {
    if (!snapshot.includes(heading)) {
      failures.push(`${memoryContract.path} is missing required heading: ${heading}`);
    }
  }

  for (const reference of memoryContract.requiredReferences) {
    if (!snapshot.includes(reference)) {
      failures.push(`${memoryContract.path} must reference ${reference}`);
    }
  }

  const lines = snapshot.split(/\r?\n/u).length;
  const bytes = Buffer.byteLength(snapshot, "utf8");
  const budget = memoryContract.budget;

  if (lines > budget.hardMaxLines || bytes > budget.hardMaxBytes) {
    failures.push(
      `${memoryContract.path} exceeds the hard hot-memory budget (${lines} lines, ${bytes} bytes; maximum ${budget.hardMaxLines} lines and ${budget.hardMaxBytes} bytes)`,
    );
  } else if (lines > budget.softMaxLines || bytes > budget.softMaxBytes) {
    warnings.push(
      `${memoryContract.path} exceeds the soft compaction threshold (${lines} lines, ${bytes} bytes; target ${budget.targetMinLines}-${budget.targetMaxLines} lines, soft threshold ${budget.softMaxLines} lines or ${budget.softMaxBytes} bytes)`,
    );
  }

  return {
    failures,
    warnings,
    metrics: { lines, bytes },
  };
}
