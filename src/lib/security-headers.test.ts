import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "./security-headers.ts";

const REQUIRED_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
] as const;

test("CSP restricts every high-value browser capability", () => {
  const policy = buildContentSecurityPolicy(true);
  for (const directive of REQUIRED_DIRECTIVES) {
    assert.ok(policy.includes(directive), `missing CSP directive: ${directive}`);
  }

  assert.ok(policy.includes("https://*.supabase.co"));
  assert.ok(policy.includes("wss://*.supabase.co"));
  assert.ok(policy.includes("https://va.vercel-scripts.com"));
  assert.ok(policy.includes("https://vitals.vercel-insights.com"));
  assert.doesNotMatch(policy, /'unsafe-eval'/);
  assert.doesNotMatch(policy, /upgrade-insecure-requests/);
});

test("development CSP permits React debugging eval without weakening production", () => {
  const development = buildContentSecurityPolicy(false);
  const production = buildContentSecurityPolicy(true);

  assert.match(development, /'unsafe-eval'/);
  assert.doesNotMatch(production, /'unsafe-eval'/);
});

test("CSP remains transport-neutral for HTTP production-build audits", () => {
  const policy = buildContentSecurityPolicy(true);
  assert.doesNotMatch(policy, /upgrade-insecure-requests/);
});

test("security headers keep clickjacking, MIME and opener isolation controls", () => {
  const headers = new Map(
    buildSecurityHeaders(true).map(({ key, value }) => [key, value]),
  );

  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(
    headers.get("Cross-Origin-Opener-Policy"),
    "same-origin-allow-popups",
  );
  assert.equal(headers.get("X-Permitted-Cross-Domain-Policies"), "none");
  assert.match(headers.get("Content-Security-Policy") ?? "", /default-src/);
});

test("Next config applies the shared security header owner to every route", () => {
  const config = readFileSync("next.config.ts", "utf8");
  assert.match(config, /buildSecurityHeaders/);
  assert.match(config, /source:\s*"\/:path\*"/);
});
