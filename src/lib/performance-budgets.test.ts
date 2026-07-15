/**
 * TASK-132 — Performance budgets (LCP/CLS) regression guards.
 * Locks static landing path, font strategy, and documented budgets.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("docs/performance-budgets.md documents LCP and CLS budgets", () => {
  const path = join(root, "docs/performance-budgets.md");
  assert.equal(existsSync(path), true, "performance-budgets.md must exist");
  const doc = read("docs/performance-budgets.md");
  assert.match(doc, /LCP/i);
  assert.match(doc, /CLS/i);
  assert.match(doc, /2\.5/);
  assert.match(doc, /0\.10|0\.1/);
  assert.match(doc, /\/insights/);
  assert.match(doc, /landing/i);
});

test("landing is a Server Component (no use client) for LCP", () => {
  const source = read("src/components/landing-page.tsx");
  assert.equal(
    /^\s*["']use client["']/.test(source),
    false,
    "landing-page.tsx must not start with use client",
  );
  assert.match(source, /landing-hero-title|landing-hero/);
  assert.match(source, /export function LandingPage/);
});

test("home page avoids getViewer round-trip on public landing", () => {
  const source = read("src/app/page.tsx");
  assert.equal(
    /import\s*\{[^}]*\bgetViewer\b/.test(source) ||
      /\bgetViewer\s*\(/.test(source),
    false,
    "page.tsx should not import/call getViewer (LCP); auth redirect lives in proxy",
  );
  assert.match(source, /isSupabaseConfigured/);
  assert.match(source, /LandingPage/);
});

test("proxy skips auth getClaims on public pages without session cookies", () => {
  const source = read("src/lib/supabase/proxy.ts");
  assert.match(source, /hasSupabaseAuthCookie/);
  assert.match(source, /PUBLIC_NO_AUTH_PATHS|isPublicNoAuthPath/);
  assert.match(source, /\/landing/);
  assert.match(source, /\/privacy/);
  assert.match(source, /getClaims/);
});

test("root layout font strategy favors LCP and reduces CLS", () => {
  const source = read("src/app/layout.tsx");
  assert.match(source, /display:\s*["']swap["']/);
  assert.match(source, /adjustFontFallback:\s*true/);
  assert.match(source, /preload:\s*true/);
  // Q8: only Inter webfont; money mono is system stack (no JetBrains Google file).
  assert.equal(
    /JetBrains|jetbrains/.test(source),
    false,
    "layout must not load JetBrains Mono webfont",
  );
  assert.match(source, /export const viewport/);
  assert.match(source, /suppressHydrationWarning/);
  assert.match(source, /data-scroll-behavior/);
});

test("CSS uses system mono stack (no second webfont variable)", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /--font-mono:\s*ui-monospace/);
  assert.equal(
    /--font-mono-family/.test(css),
    false,
    "mono must not depend on next/font mono variable",
  );
  assert.match(css, /text-rendering:\s*auto/);
  assert.match(css, /body::before/);
});

test("insights dashboard defers AddTransactionDialog chunk", () => {
  const source = read("src/components/moneyflow-dashboard.tsx");
  assert.match(source, /dynamic\(/);
  assert.match(source, /add-transaction-dialog/);
  assert.match(source, /ssr:\s*false/);
});

test("transactions page code-splits dialogs for smaller first paint", () => {
  const source = read("src/components/transactions-page.tsx");
  assert.match(source, /dynamic\(/);
  assert.match(source, /add-transaction-dialog/);
  assert.match(source, /transfer-dialog/);
  assert.match(source, /ssr:\s*false/);
});

test("CSS reserves space for landing hero and insights KPI (CLS)", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /\.landing-hero-preview/);
  assert.match(css, /min-height:\s*420px/);
  assert.match(css, /\.landing-below-fold/);
  assert.match(css, /content-visibility:\s*auto/);
  assert.match(css, /\.insights-kpi strong/);
  assert.match(css, /font-variant-numeric:\s*tabular-nums/);
});
