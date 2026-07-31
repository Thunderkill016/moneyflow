import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import test from "node:test";

const names = [
  "amber",
  "bank",
  "blue",
  "budget-card",
  "budget-category-numbers",
  "budget-empty",
  "category-choice-recent",
  "coral",
  "credit_card",
  "cyan",
  "e_wallet",
  "pink",
  "red",
  "savings",
  "violet",
];

const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".html", ".css"]);

function files(root: string) {
  const result: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (extensions.has(extname(path)) && !path.endsWith("dead-css-mentions.test.ts")) result.push(path);
    }
  };
  walk(root);
  return result;
}

test("diagnose remaining dead CSS mentions", () => {
  const root = join(process.cwd(), "src");
  const findings: string[] = [];
  for (const file of files(root)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      const matched = names.filter((name) => new RegExp(`(^|[^\\w-])${name.replaceAll("-", "\\-")}(?![\\w-])`).test(line));
      if (matched.length) {
        findings.push(`${relative(process.cwd(), file)}:${index + 1} [${matched.join(", ")}] ${line.trim()}`);
      }
    });
  }
  assert.fail(`Deliberate diagnostic; remove after inspection.\n${findings.join("\n")}`);
});
