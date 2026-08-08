import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const edge = readFileSync(
  join(root, "supabase/functions/delete-account/index.ts"),
  "utf8",
);
const actions = readFileSync(join(root, "src/app/(auth)/actions.ts"), "utf8");
const loginPage = readFileSync(
  join(root, "src/app/(auth)/login/page.tsx"),
  "utf8",
);
const authForm = readFileSync(join(root, "src/components/auth-form.tsx"), "utf8");
const deletePage = readFileSync(
  join(root, "src/components/delete-account-page.tsx"),
  "utf8",
);
const proxy = readFileSync(join(root, "src/lib/supabase/proxy.ts"), "utf8");

test("Edge verifies recent-auth claims before any tenant purge", () => {
  assert.match(edge, /account-deletion-recent-auth\.ts/);
  assert.match(edge, /auth\.getClaims\(accessToken\)/);
  assert.match(edge, /evaluateAccountDeletionRecentAuth\(/);
  assert.match(edge, /code: "recent_auth_required"/);

  const claims = edge.indexOf("auth.getClaims(accessToken)");
  const evaluation = edge.indexOf("evaluateAccountDeletionRecentAuth", claims);
  const rejection = edge.indexOf('code: "recent_auth_required"', evaluation);
  const purge = edge.indexOf('"purge_user_tenant_data"', rejection);

  assert.ok(claims >= 0, "missing verified JWT claims read");
  assert.ok(evaluation > claims, "recent-auth policy must use verified claims");
  assert.ok(rejection > evaluation, "stale authentication must be rejected");
  assert.ok(purge > rejection, "recent-auth rejection must happen before tenant purge");
  assert.doesNotMatch(edge, /payload[^\n]*(?:recent|auth).*timestamp/i);
});

test("current-main tenant cleanup additions survive the recent-auth refresh", () => {
  assert.match(edge, /financial_mutation_audit_events/);
  assert.match(edge, /transaction_import_provenance/);
  assert.match(edge, /account_reconciliation_events/);
});

test("server action distinguishes expired login from stale recent-auth", () => {
  assert.match(actions, /requiresLogin:\s*true/);
  assert.match(actions, /requiresReauthentication:\s*true/);
  assert.match(actions, /recent_auth_required/);
  assert.match(actions, /deleteError[\s\S]*context[\s\S]*json\(\)/);
});

test("explicit login reauth mode is reachable without weakening normal auth redirects", () => {
  assert.match(loginPage, /ACCOUNT_DELETION_PATH/);
  assert.match(loginPage, /reauth/);
  assert.match(authForm, /reauth/);
  assert.match(proxy, /ACCOUNT_DELETION_PATH/);
  assert.match(proxy, /searchParams\.get\("reauth"\) === "1"/);
  assert.match(proxy, /authPaths\.includes\(path\)/);
});

test("Google step-up requests fresh provider authentication and preserves safe next", () => {
  assert.match(actions, /queryParams:\s*\{[\s\S]*max_age:\s*"0"/);
  assert.match(actions, /nextPath/);
  assert.match(authForm, /name="reauth"/);
});

test("deletion UI separates expired-session login from same-account step-up and clears confirmation", () => {
  assert.match(deletePage, /requiresLogin/);
  assert.match(deletePage, /accountDeletionLoginUrl\(\)/);
  assert.match(deletePage, /requiresReauthentication/);
  assert.match(deletePage, /accountDeletionReauthUrl\(\)/);
  assert.ok(
    (deletePage.match(/setConfirmText\(""\)/g) ?? []).length >= 2,
    "both authentication boundaries must clear destructive confirmation",
  );
});
