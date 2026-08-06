import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const page = readFileSync(
  join(root, "src/components/accounts/accounts-workspace.tsx"),
  "utf8",
);
const css = readFileSync(
  join(root, "src/components/accounts/accounts-workspace.module.css"),
  "utf8",
);

test("accounts keeps the mobile add-account action through an explicit capability", () => {
  assert.doesNotMatch(page, /fabAction=\{\{/u);
  assert.match(page, /primaryAction=\{\{/u);
  assert.match(page, /showPrimaryActionOnMobile/u);
});

test("account actions delegate targets and semantic surfaces to shared owners", () => {
  assert.match(page, /Button, LinkButton/u);
  assert.match(page, /targetSize="important"/u);
  assert.match(css, /background:\s*var\(--mf-surface\)/u);
  assert.match(css, /color:\s*var\(--mf-text\)/u);
  assert.match(css, /@media \(forced-colors: active\)/u);
  assert.doesNotMatch(css, /#f5f7f5/u);
  assert.doesNotMatch(css, /:global\s*\(|!important/u);
});

test("account totals and cards use neutral locally owned financial surfaces", () => {
  assert.match(page, /data-slot="accounts-summary"/u);
  assert.match(page, /data-slot="account-card"/u);
  assert.match(css, /\.summary\s*\{/u);
  assert.match(css, /\.card\s*\{/u);
  assert.match(css, /background:\s*var\(--mf-surface\)/u);
  assert.doesNotMatch(css, /linear-gradient/u);
});
