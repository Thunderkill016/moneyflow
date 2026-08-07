import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const actions = readFileSync(join(root, "src/app/(auth)/actions.ts"), "utf8");
const callback = readFileSync(
  join(root, "src/app/auth/callback/route.ts"),
  "utf8",
);
const reauthPolicy = readFileSync(
  join(root, "src/lib/account-deletion-reauth.ts"),
  "utf8",
);

test("step-up actions require both the reauth flag and deletion return path", () => {
  assert.match(actions, /formData\.get\("reauth"\) === "1"/);
  assert.match(actions, /nextPath === ACCOUNT_DELETION_PATH/);
});

test("password step-up refuses credentials for a different current identity", () => {
  assert.match(actions, /auth\.getUser\(\)/);
  assert.match(actions, /currentUser\.email/);
  assert.match(actions, /parsed\.data\.email/);
  assert.match(actions, /REAUTH_ACCOUNT_MISMATCH_MESSAGE/);
});

test("Google step-up stores server-owned expected identity before OAuth", () => {
  assert.match(actions, /ACCOUNT_DELETION_REAUTH_USER_COOKIE/);
  assert.match(actions, /httpOnly:\s*true/);
  assert.match(actions, /sameSite:\s*"lax"/);
  assert.match(actions, /maxAge:\s*ACCOUNT_DELETION_REAUTH_COOKIE_MAX_AGE_SECONDS/);
});

test("OAuth callback compares the new session identity before returning to deletion", () => {
  assert.match(callback, /ACCOUNT_DELETION_REAUTH_USER_COOKIE/);
  assert.match(callback, /expectedUserId/);
  assert.match(callback, /auth\.getUser\(\)/);
  assert.match(callback, /user\.id !== expectedUserId/);
  assert.match(callback, /auth\.signOut\(\{ scope: "local" \}\)/);
  assert.match(callback, /reauth-account-mismatch/);
});

test("shared reauth policy owns route and short-lived continuity cookie names", () => {
  assert.match(reauthPolicy, /ACCOUNT_DELETION_PATH/);
  assert.match(reauthPolicy, /ACCOUNT_DELETION_REAUTH_USER_COOKIE/);
  assert.match(reauthPolicy, /ACCOUNT_DELETION_REAUTH_COOKIE_MAX_AGE_SECONDS = 10 \* 60/);
});
