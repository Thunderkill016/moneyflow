import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const failures = [];

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      out.push(...listFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function realImportsFrom(filePath, forbiddenPrefixes) {
  const content = readFileSync(filePath, "utf8");
  const hits = [];
  for (const line of content.split("\n")) {
    const match = line.match(/from\s+["']([^"']+)["']/);
    if (!match) continue;
    const source = match[1];
    if (!forbiddenPrefixes.some((prefix) => source.startsWith(prefix))) continue;
    if (/^\s*import\s+type\s/.test(line)) continue;
    hits.push({ line: line.trim(), source });
  }
  return hits;
}

const rules = [
  {
    dir: join(root, "src", "lib"),
    label: "src/lib",
    forbiddenPrefixes: ["@/app", "@/components", "@/server"],
    reason:
      "src/lib holds financial domain rules and must not depend on presentation (app/components) or repository/use-case (server) code.",
  },
  {
    dir: join(root, "src", "components"),
    label: "src/components",
    forbiddenPrefixes: ["@/lib/supabase", "@/server"],
    reason:
      "src/components must go through hooks/server actions, not call Supabase or server modules directly.",
  },
];

for (const rule of rules) {
  let files;
  try {
    files = listFiles(rule.dir);
  } catch {
    continue;
  }
  for (const file of files) {
    const hits = realImportsFrom(file, rule.forbiddenPrefixes);
    for (const hit of hits) {
      failures.push(
        `${relative(root, file)}: forbidden import in ${rule.label} — ${hit.line}\n  ${rule.reason}`,
      );
    }
  }
}

const transactionAuthorityFiles = [
  "src/lib/transactions/contracts.ts",
  "src/lib/transactions/category-presentation.ts",
  "src/lib/demo/transaction-fixtures.ts",
];
for (const path of transactionAuthorityFiles) {
  try {
    if (!statSync(join(root, path)).isFile()) {
      failures.push(`${path} must be a file`);
    }
  } catch {
    failures.push(`missing transaction authority file: ${path}`);
  }
}

const legacySamplePath = join(root, "src", "lib", "sample-data.ts");
try {
  const legacySample = readFileSync(legacySamplePath, "utf8");
  if (legacySample.includes("demo/transaction-fixtures")) {
    failures.push(
      "src/lib/sample-data.ts must not export demo fixtures; runtime demo values belong only to src/lib/demo/transaction-fixtures.ts.",
    );
  }
  if (/export\s+const\s/u.test(legacySample)) {
    failures.push(
      "src/lib/sample-data.ts is a deprecated compatibility surface and must not own runtime constants.",
    );
  }
} catch {
  // The compatibility surface may be removed after all old imports migrate.
}

const allowedDemoFixtureImporters = new Set([
  "src/lib/transaction-store.ts",
  "src/server/budgets.ts",
  "src/server/categories.ts",
  "src/server/commitments.ts",
  "src/server/finance.ts",
  "src/server/income-templates.ts",
  "src/server/reports.ts",
]);
const srcRoot = join(root, "src");
for (const file of listFiles(srcRoot)) {
  const path = relative(root, file).replaceAll("\\", "/");
  const content = readFileSync(file, "utf8");
  const importsDemoFixtures =
    content.includes("@/lib/demo/transaction-fixtures") ||
    /from\s+["'][^"']*demo\/transaction-fixtures\.ts["']/u.test(content);
  if (!importsDemoFixtures) continue;
  if (path.startsWith("src/lib/demo/") || /\.test\.(ts|tsx)$/u.test(path)) continue;
  if (allowedDemoFixtureImporters.has(path)) continue;
  failures.push(
    `${path}: demo fixture import is not owned by an approved demo boundary.\n  Production/core modules must use transaction contracts or real loaders, not demo values.`,
  );
}

if (failures.length > 0) {
  console.error("Architecture boundary contract failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error(
    "\nSee ARCHITECTURE.md — “Domain boundaries” for the ownership rules this check enforces.",
  );
  process.exit(1);
}

console.log("Architecture boundary contract passed.");
