import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const css = readFileSync(
  join(process.cwd(), "src/components/layout/app-shell.module.css"),
  "utf8",
);

test("mobile bottom nav uses one five-slot icon-row and label-row geometry", () => {
  assert.match(
    css,
    /\.mobileNav\s*\{[\s\S]*?grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/,
  );
  assert.match(css, /\.mobileNavItem\s*\{[\s\S]*?display:\s*grid/);
  assert.match(
    css,
    /\.mobileNavItem\s*\{[\s\S]*?grid-template-rows:\s*36px 14px/,
  );
  assert.match(css, /\.mobileNavItem\s*\{[\s\S]*?min-height:\s*58px/);
  assert.match(css, /\.mobileNavItem\s*\{[\s\S]*?gap:\s*3px/);
  assert.match(
    css,
    /\.mobileNavItem > span:not\(\.badge\)\s*\{[\s\S]*?white-space:\s*nowrap/,
  );
});

test("all mobile-nav icons own the same 36px visual row", () => {
  assert.match(css, /\.mobileNavItem svg\s*\{[\s\S]*?width:\s*36px/);
  assert.match(css, /\.mobileNavItem svg\s*\{[\s\S]*?height:\s*36px/);
  assert.match(css, /\.mobileNavItem svg\s*\{[\s\S]*?padding:\s*7px/);
  assert.match(css, /\.mobileNavItem svg\s*\{[\s\S]*?border-radius:\s*12px/);
});

test("Ghi is emphasized inside the dock rather than protruding above it", () => {
  assert.match(
    css,
    /\.mobileCapture svg\s*\{[\s\S]*?background:\s*var\(--mf-brand\)/,
  );
  assert.match(
    css,
    /\.mobileCapture svg\s*\{[\s\S]*?color:\s*var\(--mf-on-brand\)/,
  );
  assert.doesNotMatch(css, /\.mobileCapture::before/);
  assert.doesNotMatch(
    css,
    /\.mobileCapture(?:\s+svg)?\s*\{[\s\S]*?translateY\(/,
  );
  assert.doesNotMatch(
    css,
    /\.mobileCapture(?:\s+svg)?\s*\{[\s\S]*?margin-top:\s*-/,
  );
});

test("active destinations do not compete with the primary Ghi action", () => {
  assert.match(
    css,
    /\.mobileNavActive\s*\{[\s\S]*?background:\s*transparent/,
  );
  assert.match(
    css,
    /\.mobileNavActive svg\s*\{[\s\S]*?background:\s*var\(--mf-brand-subtle\)/,
  );
});

test("mobile nav reserve and safe-area owner stay stable", () => {
  assert.match(css, /--mf-shell-mobile-nav-height:\s*70px/);
  assert.match(css, /--mf-shell-mobile-nav-inset:\s*10px/);
  assert.match(
    css,
    /bottom:\s*calc\(var\(--mf-shell-mobile-nav-inset\) \+ env\(safe-area-inset-bottom, 0px\)\)/,
  );
});
