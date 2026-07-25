import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync("src/app/layout.tsx", "utf8");
const appShell = readFileSync("src/components/layout/app-shell.tsx", "utf8");
const userChip = readFileSync("src/components/user-chip.tsx", "utf8");
const refresh = readFileSync("src/app/ui-refresh.css", "utf8");

test("product UI refresh is route-scoped through the app shell", () => {
  assert.match(layout, /import "\.\/globals\.css"/);
  assert.doesNotMatch(layout, /ui-refresh\.css/);
  assert.match(appShell, /from "@\/components\/user-chip"/);
  assert.match(userChip, /import "@\/app\/ui-refresh\.css"/);
});

test("UI refresh preserves the mobile-first finance interaction contract", () => {
  assert.match(refresh, /\.insights-kpi\s*\{/);
  assert.match(refresh, /grid-template-columns:\s*repeat\(4,/);
  assert.match(refresh, /\.safe-card\s*\{/);
  assert.match(refresh, /\.mobile-fab\s*\{/);
  assert.match(refresh, /\.mobile-nav\s*\{/);
  assert.match(refresh, /@media \(max-width: 760px\)/);
  assert.match(refresh, /grid-template-columns:\s*repeat\(2,/);
  assert.match(refresh, /env\(safe-area-inset-bottom, 0px\)/);
});

test("UI refresh keeps keyboard and reduced-motion accessibility visible", () => {
  assert.match(refresh, /min-height:\s*44px/);
  assert.match(refresh, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(refresh, /transition:\s*none !important/);
});
