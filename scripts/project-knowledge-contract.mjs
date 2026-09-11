import { readFileSync } from "node:fs";
import { join } from "node:path";

export const PROJECT_KNOWLEDGE_CONTRACT_PATH =
  "docs/research/PROJECT_KNOWLEDGE_CONTRACT.json";

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

  if (contract.schemaVersion !== 2) {
    failures.push("project knowledge contract schemaVersion must equal 2");
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
