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
