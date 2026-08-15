import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const css = readFileSync(
  join(process.cwd(), "src/components/layout/app-shell.module.css"),
  "utf8",
);

test("mobile Ghi CTA uses one local grid geometry owner", () => {
  assert.match(css, /\.mobileCapture\s*\{[\s\S]*?display:\s*grid/);
  assert.match(css, /\.mobileCapture\s*\{[\s\S]*?grid-template-rows:\s*28px auto/);
  assert.match(css, /\.mobileCapture\s*\{[\s\S]*?gap:\s*4px/);
  assert.match(css, /\.mobileCapture::before\s*\{[\s\S]*?transform:\s*translateY\(-8px\)/);
  assert.match(css, /\.mobileCapture span\s*\{[\s\S]*?margin:\s*0/);
  assert.match(css, /\.mobileCapture svg\s*\{[\s\S]*?margin:\s*0/);
  assert.match(css, /\.mobileCapture svg\s*\{[\s\S]*?transform:\s*translateY\(-8px\)/);
  assert.doesNotMatch(css, /\.mobileCapture span\s*\{[\s\S]*?margin-top:\s*5px/);
  assert.doesNotMatch(css, /\.mobileCapture svg\s*\{[\s\S]*?margin-top:\s*7px/);
});

test("mobile nav reserve and hit target stay unchanged", () => {
  assert.match(css, /--mf-shell-mobile-nav-height:\s*70px/);
  assert.match(css, /--mf-shell-mobile-nav-inset:\s*10px/);
  assert.match(css, /\.mobileNavItem\s*\{[\s\S]*?min-height:\s*52px/);
  assert.match(css, /grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/);
});
