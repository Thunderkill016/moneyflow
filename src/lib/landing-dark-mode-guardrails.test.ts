import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const darkGuardrails = readFileSync("src/app/landing-dark-mode-guardrails.css", "utf8");

test("landing dark-mode guardrails load after every shared UI layer", () => {
  const guardrailImport = 'import "./landing-dark-mode-guardrails.css"';
  const sharedGuardrailImport = 'import "./ai-uiux-guardrails.css"';

  assert.match(rootLayout, /import "\.\/landing-dark-mode-guardrails\.css"/);
  assert.ok(
    rootLayout.indexOf(guardrailImport) > rootLayout.indexOf(sharedGuardrailImport),
    "landing dark-mode guardrails must remain the final UI cascade layer",
  );
});

test("landing dark mode keeps critical text and surfaces in one scoped contract", () => {
  const darkSelectorLines = darkGuardrails
    .split("\n")
    .filter((line) => line.startsWith('[data-theme="dark"]'));

  assert.ok(darkSelectorLines.length >= 20);
  for (const selectorLine of darkSelectorLines) {
    assert.match(selectorLine, /^\[data-theme="dark"\] \.landing-page\.lp-root/);
  }

  assert.match(darkGuardrails, /--lp-dark-surface:\s*#1a1a1e/);
  assert.match(darkGuardrails, /--lp-dark-text:\s*#ededed/);
  assert.match(darkGuardrails, /--lp-dark-muted:\s*#a0a0a8/);
  assert.doesNotMatch(darkGuardrails, /--lp-dark-(?:surface|text|muted):\s*var\(--color-/);
  assert.match(darkGuardrails, /\.lp-nav/);
  assert.match(darkGuardrails, /\.lp-hero-title/);
  assert.match(darkGuardrails, /\.lp-showcase-card/);
  assert.match(darkGuardrails, /\.landing-proof-list li/);
  assert.match(darkGuardrails, /\.lp-faq-item/);
  assert.match(darkGuardrails, /\.lp-footer/);
});
