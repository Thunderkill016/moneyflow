import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const homePage = readFileSync("src/app/page.tsx", "utf8");
const landingLayout = readFileSync("src/app/landing/layout.tsx", "utf8");
const landing = readFileSync("src/app/landing-refresh.css", "utf8");

test("landing refresh is loaded only by public landing routes", () => {
  assert.doesNotMatch(rootLayout, /landing-refresh\.css/);
  assert.match(homePage, /import "\.\/landing-refresh\.css"/);
  assert.match(landingLayout, /import "\.\.\/landing-refresh\.css"/);
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
