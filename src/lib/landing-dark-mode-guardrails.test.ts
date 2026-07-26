import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const tokens = readFileSync("src/app/calm-ledger-tokens.css", "utf8");
const landingCss = readFileSync(
  "src/components/landing-page.module.css",
  "utf8",
);

test("Calm Ledger tokens load as the final global cascade layer", () => {
  const tokenImport = 'import "./calm-ledger-tokens.css"';
  const sharedGuardrailImport = 'import "./ai-uiux-guardrails.css"';

  assert.match(rootLayout, /import "\.\/calm-ledger-tokens\.css"/);
  assert.ok(
    rootLayout.indexOf(tokenImport) > rootLayout.indexOf(sharedGuardrailImport),
    "Calm Ledger tokens must load after legacy shared UI layers",
  );
});

test("dark mode is one semantic token contract shared by public surfaces", () => {
  assert.match(tokens, /\[data-theme="dark"\]/);
  assert.match(tokens, /--mf-canvas:\s*#0d1511/);
  assert.match(tokens, /--mf-surface:\s*#141f19/);
  assert.match(tokens, /--mf-text:\s*#f0f7f3/);
  assert.match(tokens, /--mf-text-muted:\s*#a8b7ae/);
  assert.match(tokens, /--mf-brand:\s*#4ad58a/);

  assert.match(landingCss, /var\(--mf-canvas\)/);
  assert.match(landingCss, /var\(--mf-surface\)/);
  assert.match(landingCss, /var\(--mf-text\)/);
  assert.equal(landingCss.includes('[data-theme="dark"]'), false);
});
