import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const page = readFileSync(
  join(root, "src/app/settings/apps/page.tsx"),
  "utf8",
);
const actions = readFileSync(
  join(root, "src/app/settings/apps/actions.ts"),
  "utf8",
);
const client = readFileSync(
  join(root, "src/components/connected-apps-page.tsx"),
  "utf8",
);
const hub = readFileSync(
  join(root, "src/components/settings-hub-page.tsx"),
  "utf8",
);

test("connected-apps page lists grants through the user-scoped oauth api", () => {
  assert.match(page, /auth\.oauth\.listGrants\(\)/);
  assert.match(page, /viewer\.isDemo/);
  assert.doesNotMatch(page, /serviceRole|SERVICE_ROLE_KEY/);
});

test("revoke action stays viewer-scoped, validates the client id and revalidates", () => {
  assert.match(actions, /auth\.oauth\.revokeGrant/);
  assert.match(actions, /z\.string\(\)\.uuid\(\)/);
  assert.match(actions, /viewer\.isDemo/);
  assert.match(actions, /revalidatePath\("\/settings\/apps"\)/);
  assert.doesNotMatch(actions, /serviceRole|SERVICE_ROLE_KEY/);
});

test("connected-apps UI confirms before revoking and renders honest states", () => {
  assert.match(client, /SecondaryReviewDialog/);
  assert.match(client, /confirmIntent="destructive"/);
  assert.match(client, /Chưa có ứng dụng nào được kết nối/);
});

test("settings hub links the connected-apps surface", () => {
  assert.match(hub, /\/settings\/apps/);
  assert.match(hub, /Ứng dụng đã kết nối/);
});
