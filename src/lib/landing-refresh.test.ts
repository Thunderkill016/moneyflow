import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync("src/app/layout.tsx", "utf8");
const landing = readFileSync("src/app/landing-refresh.css", "utf8");

test("landing refresh loads after the shared product refresh", () => {
  const productImport = layout.indexOf('import "./ui-refresh.css"');
  const landingImport = layout.indexOf('import "./landing-refresh.css"');

  assert.ok(productImport >= 0, "ui-refresh.css import is missing");
  assert.ok(landingImport > productImport, "landing-refresh.css must load last");
});

test("landing refresh keeps the public conversion hierarchy", () => {
  assert.match(landing, /\.lp-nav\s*\{/);
  assert.match(landing, /position:\s*sticky/);
  assert.match(landing, /\.lp-hero-title\s*\{/);
  assert.match(landing, /\.lp-showcase-card\s*\{/);
  assert.match(landing, /\.landing-proof-list\s*\{/);
  assert.match(landing, /\.lp-cta\s*\{/);
});

test("landing refresh remains mobile and motion accessible", () => {
  assert.match(landing, /@media \(max-width: 700px\)/);
  assert.match(landing, /grid-template-columns:\s*1fr/);
  assert.match(landing, /min-height:\s*52px/);
  assert.match(landing, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(landing, /transition:\s*none !important/);
});
