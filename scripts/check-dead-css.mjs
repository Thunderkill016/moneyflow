#!/usr/bin/env node
/**
 * Reports class selectors in the legacy global stylesheets that no source file
 * references.
 *
 * Report-only, deliberately. This is not wired as a failing gate because ~200
 * unreferenced classes exist today, so a blocking check would be red from its
 * first commit. Its job is to make the list reproducible, not to enforce.
 *
 * Two things this must get right, both learned the hard way:
 *
 * 1. Class names are assembled at runtime here. `category-kind-${item.kind}` and
 *    `attention-chip-${item.tone}` produce names that appear in no source file as
 *    a literal. A plain token search called five live classes dead. Every prefix
 *    matching `foo-bar-${` is therefore collected first and its whole family is
 *    treated as live.
 * 2. Nothing catches a wrong deletion. Removing a live rule fails no lint, test,
 *    build, database or browser check — the cross-device audit measures overflow,
 *    target size and clipped money, none of which a missing colour or border
 *    affects. The page renders, everything passes, the styling is gone. So treat
 *    this output as a list of *candidates* needing evidence, never as a work
 *    queue, and verify each removal with before/after screenshots.
 *
 * Also note: this does not read `*.module.css`. A `:global(...)` rule there does
 * not put a class in the DOM, so it cannot make a dead class live — but a module
 * may layer on top of a legacy rule it depends on, so grep the modules for a
 * selector before deleting it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();

const STYLESHEETS = [
  "src/app/globals.css",
  "src/app/ui-refresh.css",
  "src/app/benchmark-ux.css",
  "src/app/safe-to-spend-withdrawal.css",
  "src/app/cross-device-stabilization.css",
  "src/app/ai-uiux-refresh.css",
  "src/app/ai-uiux-guardrails.css",
];

const SOURCE_DIRS = ["src", "e2e", "tests", "scripts"];
const SOURCE_EXTENSIONS = new Set([".tsx", ".ts", ".js", ".mjs", ".html", ".md"]);

function readSourceText() {
  const chunks = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (SOURCE_EXTENSIONS.has(extname(path))) chunks.push(readFileSync(path, "utf8"));
    }
  };
  for (const dir of SOURCE_DIRS) walk(join(root, dir));
  // Drop import/require lines before matching. A module path such as
  // `./auth-form.module.css` contains the token `auth-form`, which made the dead
  // global class `.auth-form` look referenced. A className is never assigned on
  // an import line, so removing them costs nothing and closes that false
  // negative.
  //
  // It does not close all of them. Test files reference source paths as string
  // literals — `readFileSync(".../auth-form.tsx")` — which still makes the dead
  // global class `.auth-form` look referenced. Filtering those would mean
  // guessing which string literals are paths, and a wrong guess reports a *live*
  // class as dead, which is the failure that actually costs something. So the
  // number this prints is a floor, not a total, and it stays conservative on
  // purpose.
  return chunks
    .join("\n")
    .split("\n")
    .filter((line) => !/^\s*(import\b|export\s+.*\bfrom\b|.*\brequire\()/.test(line))
    .join("\n");
}

const sourceText = readSourceText();

/** Prefixes completed at runtime, e.g. `attention-chip-${tone}`. */
const runtimePrefixes = new Set();
for (const match of sourceText.matchAll(/([a-z][\w-]*-)\$\{/g)) {
  runtimePrefixes.add(match[1]);
}

function classSelectors(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const names = new Set();
  for (const match of withoutComments.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) names.add(match[1]);
  return names;
}

const report = [];
let totalClasses = 0;
let totalUnreferenced = 0;
let totalRuntime = 0;

for (const relativePath of STYLESHEETS) {
  let css;
  try {
    css = readFileSync(join(root, relativePath), "utf8");
  } catch {
    continue;
  }

  const names = classSelectors(css);
  const unreferenced = [];
  const runtimeCompleted = [];

  for (const name of names) {
    const literal = new RegExp(`\\b${name.replace(/-/g, "\\-")}\\b`);
    if (literal.test(sourceText)) continue;
    if ([...runtimePrefixes].some((prefix) => name.startsWith(prefix))) {
      runtimeCompleted.push(name);
      continue;
    }
    unreferenced.push(name);
  }

  unreferenced.sort();
  runtimeCompleted.sort();
  totalClasses += names.size;
  totalUnreferenced += unreferenced.length;
  totalRuntime += runtimeCompleted.length;
  report.push({ file: relativePath, classes: names.size, unreferenced, runtimeCompleted });
}

const wantsJson = process.argv.includes("--json");
if (wantsJson) {
  console.log(JSON.stringify({ totalClasses, totalUnreferenced, totalRuntime, report }, null, 2));
} else {
  for (const entry of report) {
    console.log(
      `${entry.file}\n  classes=${entry.classes}  unreferenced=${entry.unreferenced.length}  runtime-completed=${entry.runtimeCompleted.length}`,
    );
    if (entry.unreferenced.length) {
      console.log(`  ${entry.unreferenced.join(", ")}`);
    }
  }
  console.log(
    `\nTOTAL classes=${totalClasses}  unreferenced=${totalUnreferenced}  runtime-completed=${totalRuntime}`,
  );
  console.log(
    "\nCandidates only. Each removal needs its own evidence and a before/after screenshot;\nno gate in this repository catches a wrong CSS deletion.",
  );
}

console.error(`[check:dead-css] scanned ${relative(root, join(root, "src"))} and ${SOURCE_DIRS.length - 1} more`);
