/**
 * TASK-104 — Lock landing product positioning (G5 thu chi).
 * Regression: fail if marketing reverts to inbox-first slogans.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const LANDING_SOURCE_PATH = join(
  process.cwd(),
  "src/components/landing-page.tsx",
);

/** Forbidden inbox-era marketing slogans (AGENTS.md product law). */
const FORBIDDEN_LANDING_PHRASES = [
  "Hộp thư cho mọi giao dịch",
  "Universal Financial Inbox",
] as const;

function readLandingSource(): string {
  return readFileSync(LANDING_SOURCE_PATH, "utf8");
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
