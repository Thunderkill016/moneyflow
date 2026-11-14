import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix } from "node:path";

const REQUIRED_CORE_FILES = [
  "src/core/schema/account.schema.ts",
  "src/core/schema/transaction.schema.ts",
  "src/core/schema/budget.schema.ts",
  "src/core/engine/ledger.engine.ts",
  "src/core/engine/cashflow.engine.ts",
  "src/core/engine/parser.engine.ts",
  "src/core/storage/db.local.ts",
  "src/core/storage/sync.service.ts",
];

const LAYER_RULES = [
  {
    root: "src/core",
    label: "src/core (Pure Core Engine & Storage)",
    forbiddenSpecifiers: [
      /^react(?:\/|$)/u,
      /^react-dom(?:\/|$)/u,
      /^next(?:\/|$)/u,
      /^lucide-react(?:\/|$)/u,
      /^@\/features(?:\/|$)/u,
      /^@\/views(?:\/|$)/u,
      /^@\/app(?:\/|$)/u,
      /^(?:\.\.\/)+(?:features|views|app)(?:\/|$)/u,
    ],
    reason:
      "src/core must stay 100% pure TypeScript with zero React, Next.js, feature hooks, or UI dependencies.",
  },
  {
    root: "src/features",
    label: "src/features (Headless Feature Controllers)",
    forbiddenSpecifiers: [
      /^@\/views(?:\/|$)/u,
      /^@\/app(?:\/|$)/u,
      /^(?:\.\.\/)+(?:views|app)(?:\/|$)/u,
    ],
    reason:
      "src/features provides UI-agnostic hooks and feature helpers; it must not depend on views or app routes.",
  },
  {
    root: "src/shared",
    label: "src/shared (Design System & Utilities)",
    forbiddenSpecifiers: [
      /^@\/features(?:\/|$)/u,
      /^@\/views(?:\/|$)/u,
      /^@\/app(?:\/|$)/u,
      /^(?:\.\.\/)+(?:features|views|app)(?:\/|$)/u,
    ],
    reason:
      "src/shared contains reusable UI primitives and formatters; it must not depend on features, views, or app routes.",
  },
];

function collectSourceFiles(dir) {
  if (!existsSync(dir)) return [];
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx|js|jsx|mjs)$/u.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

function extractImports(source) {
  const specs = [];
  const staticRe = /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/gu;
  const dynamicRe = /import\(\s*["']([^"']+)["']\s*\)/gu;
  for (const re of [staticRe, dynamicRe]) {
    let match;
    while ((match = re.exec(source)) !== null) {
      specs.push(match[1]);
    }
  }
  return specs;
}

const failures = [];

for (const requiredFile of REQUIRED_CORE_FILES) {
  if (!existsSync(requiredFile)) {
    failures.push(`missing required core file: ${requiredFile}`);
  }
}

for (const rule of LAYER_RULES) {
  const files = collectSourceFiles(rule.root);
  if (files.length === 0) {
    failures.push(`no source files found under ${rule.root}`);
    continue;
  }

  for (const file of files) {
    const relPath = posix.normalize(file.replace(/\\/gu, "/"));
    const source = readFileSync(file, "utf8");
    const imports = extractImports(source);

    for (const specifier of imports) {
      if (rule.forbiddenSpecifiers.some((pattern) => pattern.test(specifier))) {
        failures.push(
          `${relPath} imports forbidden module "${specifier}" (${rule.label}: ${rule.reason})`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error("architecture check — FAILED");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log(
  `architecture check — PASSED (${REQUIRED_CORE_FILES.length} core files verified, ${LAYER_RULES.length} layer boundaries clean)`,
);
