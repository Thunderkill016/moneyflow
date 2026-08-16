import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const css = readFileSync(
  join(process.cwd(), "src/components/layout/app-shell.module.css"),
  "utf8",
);

function px(pattern: RegExp, label: string): number {
  const match = css.match(pattern);
  assert.ok(match, `missing ${label}`);
  return Number(match[1]);
}

test("mobile Ghi CTA keeps explicit visual clearance from its label", () => {
  assert.match(css, /\.mobileCapture\s*\{[\s\S]*?display:\s*grid/);
  assert.match(css, /\.mobileCapture\s*\{[\s\S]*?grid-template-rows:\s*28px auto/);
  assert.match(css, /\.mobileCapture\s*\{[\s\S]*?padding-block:\s*3px/);
  assert.match(css, /\.mobileCapture span\s*\{[\s\S]*?margin:\s*0/);
  assert.match(css, /\.mobileCapture svg\s*\{[\s\S]*?margin:\s*0/);
  assert.doesNotMatch(css, /\.mobileCapture span\s*\{[\s\S]*?margin-top:\s*5px/);
  assert.doesNotMatch(css, /\.mobileCapture svg\s*\{[\s\S]*?margin-top:\s*7px/);

  const track = px(
    /\.mobileCapture\s*\{[\s\S]*?grid-template-rows:\s*(\d+)px auto/,
    "capture track height",
  );
  const rowGap = px(
    /\.mobileCapture\s*\{[\s\S]*?gap:\s*(\d+)px/,
    "capture row gap",
  );
  const ctaHeight = px(
    /\.mobileCapture::before\s*\{[\s\S]*?height:\s*(\d+)px/,
    "capture CTA height",
  );
  const ctaLift = px(
    /\.mobileCapture::before\s*\{[\s\S]*?transform:\s*translateY\(-(\d+)px\)/,
    "capture CTA lift",
  );
  const iconLift = px(
    /\.mobileCapture svg\s*\{[\s\S]*?transform:\s*translateY\(-(\d+)px\)/,
    "capture icon lift",
  );

  assert.equal(iconLift, ctaLift, "CTA visual and icon must move together");
  assert.ok(
    track + rowGap - (ctaHeight - ctaLift) >= 8,
    "Ghi label must keep at least 8px geometric clearance from the 42px CTA",
  );
});

test("mobile nav reserve and hit target stay unchanged", () => {
  assert.match(css, /--mf-shell-mobile-nav-height:\s*70px/);
  assert.match(css, /--mf-shell-mobile-nav-inset:\s*10px/);
  assert.match(css, /\.mobileNavItem\s*\{[\s\S]*?min-height:\s*52px/);
  assert.match(css, /grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/);
});