import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const page = readFileSync(join(root, "src/components/accounts-page.tsx"), "utf8");
const css = readFileSync(
  join(root, "src/components/accounts-page.module.css"),
  "utf8",
);

test("accounts keeps the mobile Ghi action on transaction capture", () => {
  assert.doesNotMatch(page, /fabAction=\{\{/u);
  assert.match(page, /primaryAction=\{\{/u);
});

test("account actions own readable token-based dark surfaces", () => {
  assert.match(page, /className=\{styles\.actionButton\}/u);
  assert.match(css, /min-height:\s*44px/u);
  assert.match(css, /background:\s*var\(--mf-surface-muted\)/u);
  assert.match(css, /color:\s*var\(--mf-text\)/u);
  assert.match(css, /html\[data-theme="dark"\]/u);
  assert.doesNotMatch(css, /#f5f7f5/u);
});
