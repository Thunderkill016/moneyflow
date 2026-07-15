/**
 * TASK-104 / R1 — Lock landing product positioning (G5 thu chi) + visual polish contracts.
 * Regression: fail if marketing reverts to inbox-first slogans or drops RSC / trust bar.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const LANDING_SOURCE_PATH = join(
  process.cwd(),
  "src/components/landing-page.tsx",
);
const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

/** Forbidden inbox-era marketing slogans (AGENTS.md product law). */
const FORBIDDEN_LANDING_PHRASES = [
  "Hộp thư cho mọi giao dịch",
  "Universal Financial Inbox",
] as const;

function readLandingSource(): string {
  return readFileSync(LANDING_SOURCE_PATH, "utf8");
}

function readGlobalsCss(): string {
  return readFileSync(GLOBALS_CSS_PATH, "utf8");
}

test("landing source exists and is non-empty", () => {
  const source = readLandingSource();
  assert.ok(source.length > 100, "landing-page.tsx should have content");
  assert.match(source, /export function LandingPage/);
});

test("landing is Server Component (TASK-132 LCP)", () => {
  const source = readLandingSource();
  assert.equal(
    /^\s*["']use client["']/.test(source),
    false,
    "landing must remain a Server Component for LCP",
  );
});

test("landing positions as thu chi / có thể chi (G5), not inbox-only product", () => {
  const source = readLandingSource();
  const hasCoTheChi = source.includes("có thể chi");
  const hasThuChi = source.includes("thu chi");
  assert.ok(
    hasCoTheChi || hasThuChi,
    'landing must include "có thể chi" or "thu chi" (product JTBD copy)',
  );
});

test("landing forbids inbox-first marketing slogans", () => {
  const source = readLandingSource();
  for (const phrase of FORBIDDEN_LANDING_PHRASES) {
    assert.equal(
      source.includes(phrase),
      false,
      `landing must not contain forbidden slogan: ${JSON.stringify(phrase)}`,
    );
  }
});

/** R1 — dense trust bar near hero CTAs (privacy / export / no bank / free). */
test("landing has dense trust bar with G5 promises", () => {
  const source = readLandingSource();
  assert.match(
    source,
    /landing-trust-bar/,
    "hero must use landing-trust-bar for dense trust chips",
  );
  assert.match(source, /Xuất CSV|xuất CSV/i);
  assert.match(source, /mật khẩu ngân hàng|mật khẩu NH/i);
  assert.ok(
    source.includes("miễn phí") || source.includes("Miễn phí"),
    "trust bar / CTA must signal free core",
  );
});

/** R1 — clearer demo secondary CTA (rebuild plan Phase 2). */
test("landing demo CTA is explicit (no account required)", () => {
  const source = readLandingSource();
  assert.match(
    source,
    /Thử demo không cần tài khoản/,
    "secondary demo CTA must say account not required",
  );
  assert.match(source, /href="\/insights"/);
});

/** Ref polish — hero CTA hierarchy: primary + demo only (no third login in hero). */
test("landing hero has two CTAs only (register + demo)", () => {
  const source = readLandingSource();
  const heroCtasBlock = source.match(
    /landing-hero-ctas[\s\S]*?<\/div>\s*<\/div>\s*<div className="lp-showcase"/,
  );
  assert.ok(heroCtasBlock, "hero CTAs block before product showcase");
  const block = heroCtasBlock[0];
  assert.match(block, /href="\/register"/);
  assert.match(block, /href="\/insights"/);
  assert.equal(
    (block.match(/href="\/login"/g) || []).length,
    0,
    "login must not compete in hero CTAs (nav/footer only)",
  );
});

/** Ref polish — no English earmark jargon in marketing copy. */
test("landing avoids English earmark jargon", () => {
  const source = readLandingSource();
  assert.equal(source.toLowerCase().includes("earmark"), false);
});

/** Ref polish — honest proof strip (product truths, not fake % surveys). */
test("landing has honest proof strip", () => {
  const source = readLandingSource();
  assert.match(source, /landing-proof-strip/);
  assert.match(source, /&lt; 10s|< 10s|10s/);
  assert.match(source, /không tính chi|CK ≠ chi|CK ≠/i);
});

test("landing v2 has shadcn-template structure (centered hero + FAQ + benefits)", () => {
  const source = readLandingSource();
  assert.match(source, /lp-hero|lp-root/);
  assert.match(source, /lp-showcase/);
  assert.match(source, /lp-benefit/);
  assert.match(source, /id="faq-heading"/);
  assert.match(source, /<details/);
  assert.equal(source.includes("Monarch"), false, "do not name competitors on landing");
  // Single trust-heading removed in v2 in favor of FAQ — ok
});

test("landing Excel / sheet path uses table icon", () => {
  const source = readLandingSource();
  assert.match(source, /name="table"/);
  assert.match(source, /Excel|Sheet|CSV/);
});

/** R1 — CSS contracts: type hierarchy + mobile spacing + trust bar density. */
test("landing CSS defines type hierarchy and trust-bar density", () => {
  const css = readGlobalsCss();
  assert.match(css, /\.landing-trust-bar\b/);
  assert.match(css, /\.landing-hero-title\b/);
  assert.match(css, /\.landing-proof-strip\b/);
  assert.match(css, /\.landing-nav-login\b/);
  assert.match(css, /\.feature-grid\.feature-grid-core|\.feature-grid-core/);
  // Mobile spacing polish under small viewport
  assert.ok(
    css.includes("@media (max-width: 640px)") &&
      (css.includes(".landing-section") || css.includes(".landing-hero")),
    "globals must tighten landing spacing on mobile (≤640px)",
  );
});
