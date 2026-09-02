import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("app shell defers closed More sheet internals until opened", () => {
  const source = read("src/components/layout/app-shell.tsx");

  assert.match(source, /import dynamic from ["']next\/dynamic["']/);
  assert.doesNotMatch(
    source,
    /import\s*\{\s*Sheet\s*\}\s*from\s*["']@\/components\/ui\/sheet["']/,
  );
  assert.match(source, /dynamic\([\s\S]*?@\/components\/ui\/sheet/);
  assert.match(source, /ssr:\s*false/);
  assert.match(
    source,
    /\{moreOpen\s*\?\s*\([\s\S]*?<MoreSheet[\s\S]*?\)\s*:\s*null\}/,
  );
});
