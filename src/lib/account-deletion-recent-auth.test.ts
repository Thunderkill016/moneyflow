import assert from "node:assert/strict";
import test from "node:test";
import {
  ACCOUNT_DELETION_RECENT_AUTH_MAX_AGE_SECONDS,
  evaluateAccountDeletionRecentAuth,
} from "../../supabase/functions/_shared/account-deletion-recent-auth.ts";

const NOW_SECONDS = 1_786_090_800;

test("account deletion recent-auth window is an explicit ten-minute policy", () => {
  assert.equal(ACCOUNT_DELETION_RECENT_AUTH_MAX_AGE_SECONDS, 10 * 60);
});

test("fresh supported interactive authentication authorizes deletion", () => {
  for (const method of [
    "password",
    "oauth",
    "oauth_provider/authorization_code",
    "mfa/totp",
    "mfa/phone",
    "mfa/webauthn",
  ]) {
    assert.deepEqual(
      evaluateAccountDeletionRecentAuth(
        [{ method, timestamp: NOW_SECONDS - 120 }],
        NOW_SECONDS,
      ),
      {
        ok: true,
        method,
        authenticatedAt: NOW_SECONDS - 120,
        ageSeconds: 120,
      },
    );
  }
});

test("fresh access-token issuance cannot hide stale interactive authentication", () => {
  const result = evaluateAccountDeletionRecentAuth(
    [{ method: "password", timestamp: NOW_SECONDS - 3_600 }],
    NOW_SECONDS,
  );

  assert.deepEqual(result, {
    ok: false,
    reason: "stale",
    latestInteractiveAuthAt: NOW_SECONDS - 3_600,
    ageSeconds: 3_600,
  });
});

test("anonymous, unknown and timestamp-less methods do not grant deletion authority", () => {
  assert.deepEqual(
    evaluateAccountDeletionRecentAuth(
      [
        { method: "anonymous", timestamp: NOW_SECONDS - 10 },
        { method: "custom-hook-value", timestamp: NOW_SECONDS - 5 },
        "password",
      ],
      NOW_SECONDS,
    ),
    { ok: false, reason: "missing_interactive_auth" },
  );
});

test("malformed or missing AMR fails closed", () => {
  for (const amr of [
    null,
    undefined,
    {},
    "password",
    [],
    [{ method: "password", timestamp: "recent" }],
    [{ method: "password", timestamp: Number.NaN }],
  ]) {
    assert.deepEqual(
      evaluateAccountDeletionRecentAuth(amr, NOW_SECONDS),
      { ok: false, reason: "missing_interactive_auth" },
    );
  }
});

test("future timestamps fail closed instead of producing negative age", () => {
  assert.deepEqual(
    evaluateAccountDeletionRecentAuth(
      [{ method: "password", timestamp: NOW_SECONDS + 1 }],
      NOW_SECONDS,
    ),
    {
      ok: false,
      reason: "invalid_timestamp",
      latestInteractiveAuthAt: NOW_SECONDS + 1,
    },
  );
});

test("latest supported interactive method owns recency when multiple methods exist", () => {
  assert.deepEqual(
    evaluateAccountDeletionRecentAuth(
      [
        { method: "password", timestamp: NOW_SECONDS - 3_600 },
        { method: "mfa/totp", timestamp: NOW_SECONDS - 30 },
      ],
      NOW_SECONDS,
    ),
    {
      ok: true,
      method: "mfa/totp",
      authenticatedAt: NOW_SECONDS - 30,
      ageSeconds: 30,
    },
  );
});
