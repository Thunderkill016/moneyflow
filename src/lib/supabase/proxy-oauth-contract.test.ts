import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/*
 * Neon OAuth return-leg contract (#774, hardened under #779).
 *
 * Managed-auth social sign-in plants an app-domain `session_challenge`
 * cookie, round-trips the provider, then returns to
 * `callbackURL?neon_auth_session_verifier=…`. The request middleware must
 * exchange that verifier against upstream `/get-session` BEFORE any session
 * gate runs — at that point in the flow no session cookie exists yet, so
 * any ordering that checks the session first bounces a completed sign-in
 * back to /login. The 2026-10-08 Google-login regression was exactly that.
 */
const proxy = readFileSync("src/lib/supabase/proxy.ts", "utf8");

test("the verifier exchange runs before every cookie/session gate", () => {
  const exchangeCall = proxy.indexOf("exchangeNeonOAuthVerifier(request)");
  const sessionCheck = proxy.indexOf("isNeonAuthenticated(request)");
  const cookieGate = proxy.indexOf("hasNeonAuthCookie(request)");
  assert.ok(exchangeCall > 0, "exchange call site must exist");
  assert.ok(sessionCheck > 0, "session check must exist");
  assert.ok(
    exchangeCall < sessionCheck,
    "exchange must run before session truth is evaluated",
  );
  assert.ok(
    exchangeCall < cookieGate,
    "exchange must run before the no-cookie early return",
  );
});

test("the exchange requires a challenge cookie — verifiers cannot be probed", () => {
  /*
   * A bare `?neon_auth_session_verifier=` param on its own must not trigger
   * an upstream call: without the app-planted challenge cookie there is
   * nothing to exchange it against, and calling upstream anyway would let
   * anonymous traffic spam the auth server through our middleware.
   */
  assert.match(proxy, /NEON_CHALLENGE_COOKIES\.some/u);
  assert.match(proxy, /session_challenge/u);
  assert.match(proxy, /session_challange/u); // legacy misspelling kept
});

test("the exchange uses the SDK's own request/response pipeline", () => {
  /*
   * handleAuthResponse mints the signed `local.session_data` cache cookie
   * with NEON_AUTH_COOKIE_SECRET — hand-copying only upstream Set-Cookie
   * headers leaves that cookie absent and degrades session resolution.
   * Assertions anchor on the call sites inside the exchange function, not
   * the import statement, so deleting the wiring fails this test.
   */
  const fn = proxy.slice(
    proxy.indexOf("async function exchangeNeonOAuthVerifier"),
  );
  assert.match(fn, /handleAuthRequest\(\s*config\.authBaseUrl/u);
  assert.match(fn, /handleAuthResponse\(/u);
  assert.match(fn, /cookieSecret/u);
});

test("the exchange only runs inside the Neon provider branch", () => {
  const callSite = proxy.indexOf("exchangeNeonOAuthVerifier(request)");
  const providerGate = proxy.indexOf('getBackendProvider() === "neon"');
  assert.ok(providerGate > 0, "neon provider gate must exist");
  assert.ok(
    providerGate < callSite,
    "exchange must sit inside the provider-gated neon branch",
  );
});

test("the verifier parameter is stripped before the redirect lands", () => {
  assert.match(proxy, /searchParams\.delete\(NEON_SESSION_VERIFIER_PARAM\)/u);
});

test("exchange failure fails closed into the normal unauthenticated path", () => {
  /*
   * A bad/expired verifier or upstream error returns null and the request
   * proceeds unauthenticated — the existing login bounce applies. The
   * exchange must never throw a 500 for a malformed callback.
   */
  const fn = proxy.slice(
    proxy.indexOf("async function exchangeNeonOAuthVerifier"),
  );
  assert.match(fn, /if \(!res\.ok\) return null/u);
  assert.match(fn, /catch \{\s*return null/u);
});
