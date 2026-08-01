import assert from "node:assert/strict";
import test from "node:test";
import {
  captchaTokenRequiredButMissing,
  normalizeCaptchaToken,
  parseAuthCaptchaConfig,
  TURNSTILE_ORIGIN,
  TURNSTILE_SCRIPT_URL,
} from "./auth-captcha.ts";

test("auth captcha stays disabled without an explicit true flag", () => {
  assert.deepEqual(parseAuthCaptchaConfig(undefined, undefined), {
    enabled: false,
    siteKey: null,
    ready: false,
  });
  assert.deepEqual(parseAuthCaptchaConfig("false", "site-key"), {
    enabled: false,
    siteKey: "site-key",
    ready: false,
  });
});

test("auth captcha is ready only when enabled and a site key exists", () => {
  assert.deepEqual(parseAuthCaptchaConfig(" TRUE ", " site-key "), {
    enabled: true,
    siteKey: "site-key",
    ready: true,
  });
  assert.deepEqual(parseAuthCaptchaConfig("true", "  "), {
    enabled: true,
    siteKey: null,
    ready: false,
  });
});

test("captcha tokens are trimmed and bounded", () => {
  assert.equal(normalizeCaptchaToken(" token "), "token");
  assert.equal(normalizeCaptchaToken(""), undefined);
  assert.equal(normalizeCaptchaToken({}), undefined);
  assert.equal(normalizeCaptchaToken("x".repeat(4097)), undefined);
});

test("enabled captcha rejects missing or misconfigured tokens", () => {
  const disabled = parseAuthCaptchaConfig("false", undefined);
  const missingKey = parseAuthCaptchaConfig("true", undefined);
  const ready = parseAuthCaptchaConfig("true", "site-key");

  assert.equal(captchaTokenRequiredButMissing(disabled, undefined), false);
  assert.equal(captchaTokenRequiredButMissing(missingKey, "token"), true);
  assert.equal(captchaTokenRequiredButMissing(ready, undefined), true);
  assert.equal(captchaTokenRequiredButMissing(ready, "token"), false);
});

test("Turnstile endpoints stay pinned to the Cloudflare challenge origin", () => {
  assert.equal(TURNSTILE_ORIGIN, "https://challenges.cloudflare.com");
  assert.equal(
    TURNSTILE_SCRIPT_URL,
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
  );
});
