import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { TURNSTILE_ORIGIN } from "./auth-captcha.ts";
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
  const policy = buildContentSecurityPolicy(true, false);
  for (const directive of REQUIRED_DIRECTIVES) {
    assert.ok(policy.includes(directive), `missing CSP directive: ${directive}`);
  }

  assert.ok(policy.includes("https://*.supabase.co"));
  assert.ok(policy.includes("wss://*.supabase.co"));
  assert.ok(policy.includes("https://va.vercel-scripts.com"));
  assert.ok(policy.includes("https://vitals.vercel-insights.com"));
  assert.ok(policy.includes("frame-src 'none'"));
  assert.doesNotMatch(policy, new RegExp(TURNSTILE_ORIGIN));
  assert.doesNotMatch(policy, /'unsafe-eval'/);
  assert.doesNotMatch(policy, /upgrade-insecure-requests/);
});

test("Turnstile origin is allowed only when auth captcha is configured", () => {
  const disabled = buildContentSecurityPolicy(true, false);
  const enabled = buildContentSecurityPolicy(true, true);

  assert.doesNotMatch(disabled, new RegExp(TURNSTILE_ORIGIN));
  assert.match(enabled, new RegExp(`script-src[^;]+${TURNSTILE_ORIGIN}`));
  assert.match(enabled, new RegExp(`connect-src[^;]+${TURNSTILE_ORIGIN}`));
  assert.ok(enabled.includes(`frame-src ${TURNSTILE_ORIGIN}`));
  assert.doesNotMatch(enabled, /frame-src 'none'/);
});

test("development CSP permits React debugging eval without weakening production", () => {
  const development = buildContentSecurityPolicy(false, false);
  const production = buildContentSecurityPolicy(true, false);

  assert.match(development, /'unsafe-eval'/);
  assert.doesNotMatch(production, /'unsafe-eval'/);
});

test("CSP remains transport-neutral for HTTP production-build audits", () => {
  const policy = buildContentSecurityPolicy(true, false);
  assert.doesNotMatch(policy, /upgrade-insecure-requests/);
});

test("security headers keep clickjacking, MIME and opener isolation controls", () => {
  const headers = new Map(
    buildSecurityHeaders(true, false).map(({ key, value }) => [key, value]),
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
