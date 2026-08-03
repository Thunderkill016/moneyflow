/**
 * TASK-250 — MVP definition lock (docs + exit criteria contract).
 * Ensures ship gate doc exists, is linked from agent/README entry points,
 * and still encodes core exit-criteria keywords.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const MVP_DOC = "docs/MVP_DEFINITION.md";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("docs/MVP_DEFINITION.md exists and is non-empty", () => {
  const path = join(root, MVP_DOC);
  assert.equal(existsSync(path), true, `${MVP_DOC} must exist`);
  const doc = read(MVP_DOC);
  assert.ok(doc.length > 200, "MVP definition should have substantive content");
});

test("MVP definition locks thu chi positioning and non-goals", () => {
  const doc = read(MVP_DOC);
  assert.match(doc, /thu chi/i);
  assert.match(doc, /Exit criteria/i);
  assert.match(doc, /Non-goals/i);
  assert.match(doc, /Bank sync/i);
  assert.match(doc, /AI advisor/i);
  assert.match(doc, /Nâng cao/i);
});

test("MVP exit criteria include ship gates (keywords)", () => {
  const doc = read(MVP_DOC);
  const keywords = [
    "lint",
    "typecheck",
    "test:e2e",
    "build",
    "Transfer excluded from expense",
    "Landing G5",
    "Empty states",
    "Export reachable from Báo cáo",
    "P0 money bugs",
  ] as const;
  for (const kw of keywords) {
    assert.ok(
      doc.includes(kw),
      `MVP_DEFINITION exit criteria must mention: ${JSON.stringify(kw)}`,
    );
  }
});

test("README and AGENTS.md link to docs/MVP_DEFINITION.md", () => {
  const readme = read("README.md");
  const agents = read("AGENTS.md");
  assert.ok(
    readme.includes("docs/MVP_DEFINITION.md"),
    "README must link docs/MVP_DEFINITION.md",
  );
  assert.ok(
    agents.includes("docs/MVP_DEFINITION.md"),
    "AGENTS.md must link docs/MVP_DEFINITION.md",
  );
});
