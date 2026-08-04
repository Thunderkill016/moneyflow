/**
 * TASK-132 — Performance budgets (LCP/CLS) regression guards.
 * Locks static landing path, font strategy, and documented budgets.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("docs/performance-budgets.md documents web and load budgets", () => {
  const path = join(root, "docs/performance-budgets.md");
  assert.equal(existsSync(path), true, "performance-budgets.md must exist");
  const doc = read("docs/performance-budgets.md");
  assert.match(doc, /LCP/i);
  assert.match(doc, /CLS/i);
  assert.match(doc, /2\.5/);
  assert.match(doc, /0\.10|0\.1/);
  assert.match(doc, /\/insights/);
  assert.match(doc, /\/dashboard/);
  assert.match(doc, /landing/i);
  assert.match(doc, /ALLOW_REMOTE_LOAD_TEST=yes/);
  assert.match(doc, /Data API calls after viewer resolution \| 1/);
});

test("load acceptance protocol binds target, identity and evidence", () => {
  const path = join(root, "docs/performance-load-acceptance.md");
  assert.equal(existsSync(path), true, "performance-load-acceptance.md must exist");
  const doc = read("docs/performance-load-acceptance.md");
  assert.match(doc, /APPROVED_TARGET_HOST/);
  assert.match(doc, /DEPLOYMENT_SHA/);
  assert.match(doc, /LOAD_TEST_USER_CONFIRMED_SYNTHETIC=yes/);
  assert.match(doc, /10, 25 and 50 virtual users/);
  assert.match(doc, /production stress testing/i);
  assert.match(doc, /Vercel and Supabase metrics/i);
  assert.match(doc, /provider_write_approved/);
});

test("public k6 profiles are bounded and block accidental remote load", () => {
  const source = read("tests/load/public-smoke.js");
  assert.match(source, /executor:\s*"ramping-vus"/);
  assert.match(source, /target:\s*50/);
  assert.match(source, /ALLOW_REMOTE_LOAD_TEST/);
  assert.match(source, /APPROVED_TARGET_HOST/);
  assert.match(source, /Remote public load tests are limited to preview or staging/);
  assert.match(source, /rate<0\.01/);
  assert.match(source, /p\(95\)<800/);
  assert.match(source, /p\(99\)<1500/);
  assert.doesNotMatch(source, /\/dashboard/);
});

test("authenticated k6 profile uses only a confirmed synthetic user and bounded RPC", () => {
  const source = read("tests/load/authenticated-dashboard.js");
  assert.match(source, /LOAD_TEST_USER_CONFIRMED_SYNTHETIC/);
  assert.match(source, /APPROVED_TARGET_HOST/);
  assert.match(source, /DEPLOYMENT_SHA/);
  assert.match(source, /Remote authenticated load tests are limited to preview or staging/);
  assert.match(source, /\/auth\/v1\/token\?grant_type=password/);
  assert.match(source, /\/rest\/v1\/rpc\/get_dashboard_bundle/);
  assert.match(source, /p_recent_limit:\s*5/);
  assert.match(source, /target:\s*50/);
  assert.match(source, /rate<0\.01/);
  assert.match(source, /p\(95\)<800/);
  assert.match(source, /p\(99\)<1500/);
  assert.doesNotMatch(source, /service[_-]?role/i);
});

test("package exposes explicit public and authenticated load commands", () => {
  const packageJson = JSON.parse(read("package.json")) as {
    scripts?: Record<string, string>;
  };
  assert.equal(packageJson.scripts?.["test:load:public"], "k6 run tests/load/public-smoke.js");
  assert.equal(
    packageJson.scripts?.["test:load:dashboard"],
    "k6 run tests/load/authenticated-dashboard.js",
  );
  assert.equal(
    packageJson.scripts?.["test:load:contracts"],
    "node --experimental-strip-types --test src/lib/performance-budgets.test.ts",
  );
});

test("landing is a Server Component (no use client) for LCP", () => {
  const source = read("src/components/landing-page.tsx");
  assert.equal(
    /^\s*["']use client["']/.test(source),
    false,
    "landing-page.tsx must not start with use client",
  );
  assert.match(source, /styles\.hero/);
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

test("CSS reserves stable space for guided product evidence and money KPIs", () => {
  const landingCss = read("src/components/landing-page.module.css");
  const landingSource = read("src/components/landing-page.tsx");
  const globals = read("src/app/globals.css");
  assert.match(landingCss, /\.hero\b/);
  assert.match(
    landingCss,
    /min-height:\s*min\(760px,\s*calc\(100svh - 72px\)\)/,
  );
  assert.match(landingCss, /\.storyFigure\b/);
  assert.match(landingCss, /\.storyFigure img[\s\S]*width:\s*100%/);
  assert.match(landingCss, /\.storyFigure img[\s\S]*height:\s*auto/);
  assert.match(landingSource, /width=\{step\.width\}/);
  assert.match(landingSource, /height=\{step\.height\}/);
  assert.match(globals, /\.insights-kpi strong/);
  assert.match(globals, /font-variant-numeric:\s*tabular-nums/);
});
