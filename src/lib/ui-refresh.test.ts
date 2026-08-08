import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync("src/app/layout.tsx", "utf8");
const legacy = readFileSync("src/app/legacy.css", "utf8");
const userChip = readFileSync("src/components/user-chip.tsx", "utf8");
const shell = readFileSync("src/components/layout/app-shell.module.css", "utf8");
const dashboard = readFileSync(
  "src/components/dashboard/dashboard.module.css",
  "utf8",
);
const documentTheme = readFileSync("src/app/document-theme.css", "utf8");

const retiredGenerations = [
  "src/app/ui-refresh.css",
  "src/app/benchmark-ux.css",
  "src/app/cross-device-stabilization.css",
  "src/app/ai-uiux-refresh.css",
  "src/app/ai-uiux-guardrails.css",
];

test("Phase 10 keeps only the foundation behind the temporary legacy entry", () => {
  assert.match(layout, /import "\.\/legacy\.css"/);
  assert.match(layout, /import "\.\/document-theme\.css"/);
  assert.match(legacy, /^@import "\.\/globals\.css";\s*$/mu);
  for (const file of retiredGenerations) assert.equal(existsSync(file), false, file);
  assert.doesNotMatch(userChip, /product-styles/);
});

test("App Shell and Dashboard local modules own migrated presentation", () => {
  assert.match(shell, /\.mobileNav\s*\{/);
  assert.match(shell, /@media \(max-width: 760px\)/);
  assert.match(shell, /--mf-shell-mobile-nav-reserve/);
  assert.match(dashboard, /\.dashboard\s*\{/);
  assert.match(dashboard, /@media \(max-width:/);
});

test("reduced motion is owned by the document theme without important overrides", () => {
  assert.match(documentTheme, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(documentTheme, /animation-duration:\s*0\.01ms/);
  assert.match(documentTheme, /transition-duration:\s*0\.01ms/);
  assert.doesNotMatch(documentTheme, /!important/u);
});
