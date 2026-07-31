#!/usr/bin/env node
/**
 * Fails when a class selector in the legacy global stylesheets is rendered by
 * nothing. This is a blocking gate, not a report — the ~170 classes that made a
 * gate impossible were removed in one pass, so the budget is zero and stays zero.
 *
 * Three things this has to get right. Each one produced a wrong answer first:
 *
 * 1. **Only string literals count as a reference.** The previous version matched
 *    bare tokens across all source text, so the word "sidebar" in a code comment
 *    kept `.sidebar` alive — including comments written while deleting the very
 *    rules that used it. A class name reaches the DOM through a literal or not at
 *    all. Comments are stripped before matching, carefully: `//` inside a string
 *    is not a comment, which is what protects `href="https://…"`.
 *
 * 2. **Test files are not references.** A test asserting `.demo-mode-banner` in a
 *    stylesheet made that dead class look used, which is a loop: the test justified
 *    the rule and the rule justified the test. Product code decides what is live.
 *
 * 3. **Class names are assembled at runtime.** `attention-chip-${tone}` and 31
 *    other prefixes produce names that appear in no literal. Every `foo-bar-${`
 *    prefix is collected and its whole family treated as live.
 *
 * `*.module.css` is read for `:global(...)` only — a module rule does not put a
 * class in the DOM, but it may layer on a legacy rule it depends on.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

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

const SOURCE_DIRS = ["src"];
const SOURCE_EXTENSIONS = new Set([".tsx", ".ts", ".js", ".mjs", ".html"]);
const isTest = (p) => /\.test\.[jt]sx?$/.test(p) || p.includes("/e2e/");

function sourceFiles() {
  const files = [];
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const entry of entries) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) { walk(path); continue; }
      if (!SOURCE_EXTENSIONS.has(extname(path))) continue;
      if (isTest(path)) continue;
      files.push(path);
    }
  };
  for (const dir of SOURCE_DIRS) walk(join(root, dir));
  return files;
}

/** Strip comments without eating URLs: `//` preceded by `:` or inside a string stays. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((line) => {
      const i = line.indexOf("//");
      if (i < 0) return line;
      if (i > 0 && line[i - 1] === ":") return line;
      const quotes = (line.slice(0, i).match(/["'`]/g) || []).length;
      return quotes % 2 === 0 ? line.slice(0, i) : line;
    })
    .join("\n");
}

// Unrolled-loop patterns, one per quote type. A backreference version backtracks
// catastrophically on the larger page components.
const LITERALS = [
  /"([^"\\]*(?:\\.[^"\\]*)*)"/g,
  /'([^'\\]*(?:\\.[^'\\]*)*)'/g,
  /`([^`\\]*(?:\\.[^`\\]*)*)`/g,
];

const referenced = new Set();
const runtimePrefixes = new Set();
for (const file of sourceFiles()) {
  const source = stripComments(readFileSync(file, "utf8"));
  for (const pattern of LITERALS) {
    for (const match of source.matchAll(pattern)) {
      for (const token of match[1].split(/[^\w-]+/)) {
        if (/^-?[_a-zA-Z][\w-]*$/.test(token)) referenced.add(token);
      }
    }
  }
  for (const match of source.matchAll(/([a-z][\w-]*-)\$\{/g)) {
    runtimePrefixes.add(match[1]);
  }
}

const modules = [];
const walkModules = (dir) => {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) { walkModules(path); continue; }
    if (path.endsWith(".module.css")) modules.push(path);
  }
};
walkModules(join(root, "src"));
for (const file of modules) {
  for (const match of readFileSync(file, "utf8").matchAll(/:global\(([^)]*)\)/g)) {
    for (const name of match[1].matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) referenced.add(name[1]);
  }
}

const prefixes = [...runtimePrefixes];
let total = 0;
let failed = 0;
const report = [];

for (const relativePath of STYLESHEETS) {
  let css;
  try { css = readFileSync(join(root, relativePath), "utf8"); } catch { continue; }
  const names = new Set();
  for (const match of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
    names.add(match[1]);
  }
  const dead = [...names]
    .filter((n) => !referenced.has(n) && !prefixes.some((p) => n.startsWith(p)))
    .sort();
  total += names.size;
  failed += dead.length;
  if (dead.length) report.push({ file: relativePath, dead });
}

if (failed === 0) {
  console.log(`[check:dead-css] ${total} class selectors, all reachable from product code.`);
  process.exit(0);
}

console.error(`[check:dead-css] ${failed} class selector(s) no product code can render:\n`);
for (const entry of report) console.error(`  ${entry.file}\n    ${entry.dead.join(", ")}`);
console.error(
  "\nRemove the rule, or render the class. If a rule is genuinely needed for markup\n" +
  "this scanner cannot see, add the class to a literal in the component that owns it.\n" +
  "Do not widen the scanner to count comments or tests — that is how ~170 dead rules\n" +
  "accumulated behind a green check.",
);
process.exit(1);
