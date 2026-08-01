import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const failures = [];

const requiredFiles = [
  "AGENTS.md",
  "ARCHITECTURE.md",
  "README.md",
  "docs/product/PRINCIPLES.md",
  "docs/engineering/AI_DELIVERY_WORKFLOW.md",
  "docs/engineering/AGENT_OPERATING_MODEL.md",
  "docs/research/README.md",
  "docs/research/REPOSITORY_REFERENCE_MAP.md",
  "docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md",
  "docs/templates/FEATURE_WORK_PACKET.md",
  "docs/plans/README.md",
  "docs/plans/active/README.md",
  "docs/plans/completed/README.md",
  ".github/pull_request_template.md",
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
  if (agentsLines > 160) {
    failures.push(`AGENTS.md has ${agentsLines} lines; keep it as a concise map (maximum 160)`);
  }
} catch {
  // Missing file already reported above.
}

const requiredReadmeLinks = [
  "ARCHITECTURE.md",
  "docs/product/PRINCIPLES.md",
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
  "REPOSITORY_REFERENCE_MAP.md",
  "ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md",
]);

requireMarkers("AGENTS.md", [
  "docs/engineering/AGENT_OPERATING_MODEL.md",
  "docs/research/REPOSITORY_REFERENCE_MAP.md",
  "docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md",
  "current execution state",
  "hidden chat context is not a handoff artifact",
  "two to four focused sources",
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
  "## Agent operating evidence",
  "Current execution state:",
  "Permission scope used:",
  "Last handoff artifacts:",
  "Selected sources (two to four by default):",
  "Important source limits or patterns intentionally not copied:",
  "### Tool, dependency or architecture adoption",
  "license, security, ownership and rollback review",
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
