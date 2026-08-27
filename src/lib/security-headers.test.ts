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

function directiveTokens(policy: string, directiveName: string): string[] {
  const directive = policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${directiveName} `));
  return directive?.split(/\s+/).slice(1) ?? [];
}

test("CSP restricts every high-value browser capability", () => {
  const policy = buildContentSecurityPolicy(true, false);
  for (const directive of REQUIRED_DIRECTIVES) {
    assert.ok(policy.includes(directive), `missing CSP directive: ${directive}`);
  }

  assert.deepEqual(directiveTokens(policy, "script-src"), [
    "'self'",
    "'unsafe-inline'",
    "https://va.vercel-scripts.com",
  ]);
  assert.deepEqual(directiveTokens(policy, "connect-src"), [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://vitals.vercel-insights.com",
  ]);
  assert.deepEqual(directiveTokens(policy, "frame-src"), ["'none'"]);
  assert.doesNotMatch(policy, /'unsafe-eval'/);
  assert.doesNotMatch(policy, /upgrade-insecure-requests/);
});

test("no fetch directive falls back to a bare scheme wildcard", () => {
  /*
   * `img-src` allowed `https:`, which makes any HTTPS host on the internet a
   * legal image source — a tracking-pixel and exfiltration channel bought for
   * nothing, since production serves every image and font from its own origin
   * (measured: 3 images, 12 fonts, zero third-party). A bare scheme is an
   * absence of a policy wearing the shape of one, so no fetch directive may
   * carry one.
   */
  for (const authCaptchaReady of [false, true]) {
    const policy = buildContentSecurityPolicy(true, authCaptchaReady);
    for (const directive of [
      "default-src",
      "script-src",
      "style-src",
      "img-src",
      "font-src",
      "connect-src",
      "media-src",
      "worker-src",
      "manifest-src",
      "frame-src",
    ]) {
      for (const token of directiveTokens(policy, directive)) {
        assert.ok(
          !/^(https?|ws|wss|ftp):$/u.test(token),
          `${directive} must not allow the bare scheme ${token}`,
        );
      }
    }
  }
});

test("images and fonts come only from this origin, plus local previews", () => {
  const policy = buildContentSecurityPolicy(true, false);
  // `data:` and `blob:` stay: an uploaded receipt is previewed before it is ever
  // sent anywhere, and that preview is a local blob.
  assert.deepEqual(directiveTokens(policy, "img-src"), ["'self'", "data:", "blob:"]);
  assert.deepEqual(directiveTokens(policy, "font-src"), ["'self'", "data:"]);
});

test("Turnstile origin is allowed only when auth captcha is configured", () => {
  const disabled = buildContentSecurityPolicy(true, false);
  const enabled = buildContentSecurityPolicy(true, true);

  assert.deepEqual(directiveTokens(disabled, "script-src"), [
    "'self'",
    "'unsafe-inline'",
    "https://va.vercel-scripts.com",
  ]);
  assert.deepEqual(directiveTokens(enabled, "script-src"), [
    "'self'",
    "'unsafe-inline'",
    "https://va.vercel-scripts.com",
    TURNSTILE_ORIGIN,
  ]);
  assert.deepEqual(directiveTokens(enabled, "connect-src"), [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://vitals.vercel-insights.com",
    TURNSTILE_ORIGIN,
  ]);
  assert.deepEqual(directiveTokens(enabled, "frame-src"), [TURNSTILE_ORIGIN]);
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
