import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const failures = [];

const requiredFiles = [
  "AGENTS.md",
  "CLAUDE.md",
  "ARCHITECTURE.md",
  "README.md",
  "docs/product/PRINCIPLES.md",
  "docs/product/PRODUCT_DEVELOPMENT_PLAN.md",
  "docs/research/06_GLOBAL_EXPENSE_WEB_UX_BENCHMARK.md",
  "docs/engineering/AI_DELIVERY_WORKFLOW.md",
  "docs/engineering/DEVELOPMENT_SEQUENCE.md",
  "docs/templates/FEATURE_WORK_PACKET.md",
  "docs/plans/README.md",
  "docs/plans/active/README.md",
  "docs/plans/completed/README.md",
  ".github/pull_request_template.md",
  ".claude/skills/next-initiative/SKILL.md",
];

function read(path) {
  return readFileSync(join(root, path), "utf8");
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
  "docs/product/PRODUCT_DEVELOPMENT_PLAN.md",
  "docs/engineering/AI_DELIVERY_WORKFLOW.md",
  "docs/engineering/DEVELOPMENT_SEQUENCE.md",
];

try {
  const readme = read("README.md");
  for (const link of requiredReadmeLinks) {
    if (!readme.includes(link)) failures.push(`README.md must link to ${link}`);
  }
} catch {
  // Missing file already reported above.
}

for (const path of ["AGENTS.md", "CLAUDE.md"]) {
  try {
    const content = read(path);
    if (!content.includes("docs/product/PRODUCT_DEVELOPMENT_PLAN.md")) {
      failures.push(`${path} must link to docs/product/PRODUCT_DEVELOPMENT_PLAN.md`);
    }
    if (!content.includes("docs/engineering/DEVELOPMENT_SEQUENCE.md")) {
      failures.push(`${path} must link to docs/engineering/DEVELOPMENT_SEQUENCE.md`);
    }
  } catch {
    // Missing file already reported above.
  }
}

for (const path of [
  "docs/MVP_DEFINITION.md",
  ".agents/skills/ship-feature/SKILL.md",
]) {
  try {
    if (!read(path).includes("docs/product/PRODUCT_DEVELOPMENT_PLAN.md")) {
      failures.push(`${path} must link to docs/product/PRODUCT_DEVELOPMENT_PLAN.md`);
    }
  } catch {
    // Existing repository requirements report missing files elsewhere.
  }
}

try {
  const claude = read("CLAUDE.md");
  if (!claude.includes("/next-initiative")) {
    failures.push("CLAUDE.md must name /next-initiative for unnamed continuation work");
  }
} catch {
  // Missing file already reported above.
}

const liveSelectionFiles = [
  "AGENTS.md",
  "CLAUDE.md",
  ".claude/skills/next-initiative/SKILL.md",
  ".agents/skills/ship-feature/SKILL.md",
];

try {
  const skill = read(".claude/skills/next-initiative/SKILL.md");
  if (!skill.includes("docs/product/PRODUCT_DEVELOPMENT_PLAN.md")) {
    failures.push(".claude/skills/next-initiative/SKILL.md must use the product development plan");
  }
  if (!skill.includes("current product feature")) {
    failures.push(".claude/skills/next-initiative/SKILL.md must select a product feature before a technical slice");
  }
  if (!skill.includes("docs/research/06_GLOBAL_EXPENSE_WEB_UX_BENCHMARK.md")) {
    failures.push(".claude/skills/next-initiative/SKILL.md must read current web evidence for F01-F12");
  }
} catch {
  // Missing file already reported above.
}

try {
  const productPlan = read("docs/product/PRODUCT_DEVELOPMENT_PLAN.md");
  for (const marker of [
    "### 4.1 Feature-first development law",
    "#### F01 - Quick Entry 2.0 and first value",
    "#### F12 - Commercial Packaging",
    "### 4.4 Immediate feature queue for Claude",
    "### 4.5 Web evidence map",
  ]) {
    if (!productPlan.includes(marker)) {
      failures.push(`product development plan is missing feature-roadmap marker: ${marker}`);
    }
  }
} catch {
  // Missing file already reported above.
}

try {
  const benchmark = read("docs/research/06_GLOBAL_EXPENSE_WEB_UX_BENCHMARK.md");
  for (const marker of [
    "## 13. Evidence map cho feature roadmap F01-F12",
    "### 13.1 F01-F03",
    "### 13.4 F11-F12",
    "import không undo",
    "recurring duplicate",
  ]) {
    if (!benchmark.includes(marker)) {
      failures.push(`web feature benchmark is missing evidence marker: ${marker}`);
    }
  }
} catch {
  // Missing file already reported above.
}

try {
  if (!read("docs/engineering/DEVELOPMENT_SEQUENCE.md").includes("next user-facing feature outcome")) {
    failures.push("development sequence must prioritize the next user-facing feature after release blockers");
  }
} catch {
  // Missing file already reported above.
}

for (const path of liveSelectionFiles) {
  let content;
  try {
    content = read(path);
  } catch {
    continue;
  }
  if (/IDEA\.md/u.test(content)) {
    failures.push(`${path} must not reference retired IDEA.md`);
  }
}

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
