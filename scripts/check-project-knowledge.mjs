import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const failures = [];

const requiredFiles = [
  "AGENTS.md",
  "ARCHITECTURE.md",
  "README.md",
  "docs/product/PRINCIPLES.md",
  "docs/engineering/RISK_PROPORTIONAL_DELIVERY.md",
  "docs/engineering/AI_DELIVERY_WORKFLOW.md",
  "docs/engineering/AGENT_OPERATING_MODEL.md",
  "docs/research/README.md",
  "docs/research/CURRENT_PROJECT_MEMORY.md",
  "docs/research/PR_MEMORY_LOG.md",
  "docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md",
  "docs/research/PRODUCT_COMPETITIVE_MEMORY.md",
  "docs/research/REPOSITORY_REFERENCE_MAP.md",
  "docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md",
  "docs/templates/FEATURE_WORK_PACKET.md",
  "docs/plans/README.md",
  "docs/plans/active/README.md",
  "docs/plans/completed/README.md",
  ".github/pull_request_template.md",
  ".github/workflows/ci.yml",
];

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function requireMarkers(path, markers) {
  let content;
  try {
    content = read(path);
  } catch {
    return;
  }

  for (const marker of markers) {
    if (!content.includes(marker)) {
      failures.push(`${path} must include project-contract marker: ${marker}`);
    }
  }
}

for (const path of requiredFiles) {
  try {
    if (!statSync(join(root, path)).isFile()) {
      failures.push(`${path} must be a file`);
    }
  } catch {
    failures.push(`missing required project-knowledge file: ${path}`);
  }
}

function enforcePullRequestMemoryUpdate() {
  if (process.env.GITHUB_EVENT_NAME !== "pull_request") return;

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    failures.push("pull-request memory check requires GITHUB_EVENT_PATH");
    return;
  }

  try {
    const event = JSON.parse(readFileSync(eventPath, "utf8"));
    const baseSha = event.pull_request?.base?.sha;
    const headSha = event.pull_request?.head?.sha;
    if (!baseSha || !headSha) {
      failures.push("pull-request memory check could not resolve base/head SHA");
      return;
    }

    const changedFiles = execFileSync(
      "git",
      ["diff", "--name-only", "--diff-filter=ACMRD", `${baseSha}...${headSha}`],
      { cwd: root, encoding: "utf8" },
    )
      .split(/\r?\n/u)
      .filter(Boolean);

    if (!changedFiles.includes("docs/research/PR_MEMORY_LOG.md")) {
      failures.push(
        "every pull request must update docs/research/PR_MEMORY_LOG.md; use Status impact: none when implementation status did not change",
      );
    }
  } catch (error) {
    failures.push(
      `pull-request memory check failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

enforcePullRequestMemoryUpdate();

const currentTruthFiles = [
  "AGENTS.md",
  "README.md",
  "docs/product/PRINCIPLES.md",
];

const staleClaims = [
  {
    pattern: /có thể chi hôm nay/iu,
    label: "retired daily-spending claim",
  },
  {
    pattern: /dashboard[^\n]*safe[- ]to[- ]spend/iu,
    label: "retired safe-to-spend dashboard claim",
  },
];

for (const path of currentTruthFiles) {
  let content;
  try {
    content = read(path);
  } catch {
    continue;
  }
  for (const { pattern, label } of staleClaims) {
    if (pattern.test(content)) {
      failures.push(`${path} contains ${label}; keep historical discussion outside current product truth`);
    }
  }
}

try {
  const agentsLines = read("AGENTS.md").split(/\r?\n/u).length;
  if (agentsLines > 165) {
    failures.push(`AGENTS.md has ${agentsLines} lines; keep it as a concise map (maximum 165)`);
  }
} catch {
  // Missing file already reported above.
}

const requiredReadmeLinks = [
  "ARCHITECTURE.md",
  "docs/product/PRINCIPLES.md",
  "docs/research/CURRENT_PROJECT_MEMORY.md",
  "docs/research/PR_MEMORY_LOG.md",
  "docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md",
  "docs/research/PRODUCT_COMPETITIVE_MEMORY.md",
  "docs/engineering/RISK_PROPORTIONAL_DELIVERY.md",
  "docs/engineering/AI_DELIVERY_WORKFLOW.md",
];

try {
  const readme = read("README.md");
  for (const link of requiredReadmeLinks) {
    if (!readme.includes(link)) failures.push(`README.md must link to ${link}`);
  }
} catch {
  // Missing file already reported above.
}

requireMarkers("docs/research/README.md", [
  "CURRENT_PROJECT_MEMORY.md",
  "PR_MEMORY_LOG.md",
  "PRODUCT_CAPABILITY_GAP_MATRIX.md",
  "PRODUCT_COMPETITIVE_MEMORY.md",
  "REPOSITORY_REFERENCE_MAP.md",
  "ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md",
]);

requireMarkers("docs/research/CURRENT_PROJECT_MEMORY.md", [
  "# MoneyFlow — current project memory",
  "## 5. Current capability inventory",
  "## 8. Reconciled issue status",
  "## 9. Open pull-request memory",
  "## 10. True gaps after this audit",
  "## 12. Superseded-status register",
  "validation is required inside each workstream but is not a global feature freeze",
  "Reports lack previous-period comparison or trends",
  "Import provenance/dry-run/atomic approval are future work",
]);

requireMarkers("docs/research/PR_MEMORY_LOG.md", [
  "# MoneyFlow — pull request memory log",
  "Every pull request must add one entry",
  "Status impact: none",
  "CURRENT_PROJECT_MEMORY.md",
  "### PR #215",
]);

requireMarkers("docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md", [
  "# MoneyFlow — competitive capability gap matrix",
  "## 2. Corrected current position",
  "## 3. Capability matrix",
  "## 6. Delivery waves",
  "## 8. Superseded claims",
  "Reports | **Implemented, moderate depth**",
  "Recurring commitments | **Implemented, partial occurrence model**",
]);

requireMarkers("docs/research/PRODUCT_COMPETITIVE_MEMORY.md", [
  "# MoneyFlow — product competitive memory",
  "# 4. MoneyFlow current capability snapshot",
  "# 6. Capability comparison",
  "# 8. Cumulative synthesis",
  "# 10. Prioritized roadmap",
  "# 11. Durable decision register",
  "Account reconciliation is the next major product capability",
  "External products are pattern references, not acceptance authorities",
]);

requireMarkers("AGENTS.md", [
  "docs/engineering/RISK_PROPORTIONAL_DELIVERY.md",
  "docs/engineering/AGENT_OPERATING_MODEL.md",
  "docs/research/CURRENT_PROJECT_MEMORY.md",
  "docs/research/PR_MEMORY_LOG.md",
  "docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md",
  "docs/research/PRODUCT_COMPETITIVE_MEMORY.md",
  "docs/research/REPOSITORY_REFERENCE_MAP.md",
  "docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md",
  "Every PR must append one truthful entry",
  "current execution state",
  "Hidden chat context is not a handoff artifact",
  "two to four focused sources",
]);

requireMarkers(".github/workflows/ci.yml", [
  "types: [opened, synchronize, reopened, ready_for_review]",
  "github.event.action == 'ready_for_review'",
]);

requireMarkers("docs/engineering/RISK_PROPORTIONAL_DELIVERY.md", [
  "## Change classes",
  "Class 0",
  "Class 1",
  "Class 2",
  "Class 3",
  "## CI selection contract",
  "## Stable required checks",
  "## Work-packet decision test",
  "scripts/classify-ci-changes.mjs",
]);

requireMarkers("docs/engineering/AI_DELIVERY_WORKFLOW.md", [
  "docs/engineering/AGENT_OPERATING_MODEL.md",
  "docs/research/REPOSITORY_REFERENCE_MAP.md",
  "docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md",
  "two to four focused sources",
  "Tool, dependency and architecture adoption gate",
  "discovery → specified → planned → implementing → evaluating",
  "Hidden chat context is not a valid project artifact",
  "Sentry and Trigger.dev",
]);

requireMarkers("docs/engineering/AGENT_OPERATING_MODEL.md", [
  "ruvnet/ruflo",
  "crewAIInc/crewAI",
  "openai/swarm",
  "OpenHands/OpenHands",
  "langchain-ai/langgraph",
  "microsoft/autogen",
  "getsentry/sentry",
  "triggerdotdev/trigger.dev",
  "ready_for_review",
  "## Handoff contract",
  "provider_write_approved",
  "## Runtime operations adoption decisions",
]);

requireMarkers("docs/templates/FEATURE_WORK_PACKET.md", [
  "**Execution state:**",
  "**Active role:**",
  "**Permission scope:**",
  "docs/engineering/AGENT_OPERATING_MODEL.md",
  "### Research scope and source selection",
  "Authority/type",
  "### Adoption review",
  "docs/research/REPOSITORY_REFERENCE_MAP.md",
  "docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md",
  "## Handoff record",
  "### Current permission boundary",
]);

requireMarkers(".github/pull_request_template.md", [
  "## Risk and plan",
  "Change class:",
  "Planning artifact:",
  "Permission scope used:",
  "## Project memory update",
  "docs/research/PR_MEMORY_LOG.md",
  "Status impact:",
  "docs/research/CURRENT_PROJECT_MEMORY.md",
  "## Research or adoption evidence",
  "Selected sources and what they establish:",
  "License, security, privacy, ownership and rollback review",
  "## Verification selection",
  "Mandatory PR memory update",
  "Affected production verification",
]);

const requiredActiveHeadings = [
  "## Repository reconnaissance",
  "## Research",
  "## Specification",
  "## Implementation plan",
  "## Tasks",
  "## Evaluation",
];

const activeDir = join(root, "docs/plans/active");
try {
  for (const entry of readdirSync(activeDir)) {
    if (entry === "README.md" || !entry.endsWith(".md")) continue;
    const absolute = join(activeDir, entry);
    if (!statSync(absolute).isFile()) continue;
    const content = readFileSync(absolute, "utf8");
    for (const heading of requiredActiveHeadings) {
      if (!content.includes(heading)) {
        failures.push(`${relative(root, absolute)} is missing required heading: ${heading}`);
      }
    }
  }
} catch {
  failures.push("docs/plans/active must exist");
}

if (failures.length > 0) {
  console.error("Project knowledge contract failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Project knowledge contract passed.");
