import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const page = readFileSync(
  join(root, "src/app/oauth/consent/page.tsx"),
  "utf8",
);
const actions = readFileSync(
  join(root, "src/app/oauth/consent/actions.ts"),
  "utf8",
);
const configToml = readFileSync(join(root, "supabase/config.toml"), "utf8");

test("consent page drives the Supabase authorization-code flow honestly", () => {
  assert.match(page, /getAuthorizationDetails\(authorizationId\)/);
  assert.match(page, /"redirect_url" in data/);
  assert.match(page, /viewer\.isDemo/);
  assert.match(page, /\/login\?next=/);
  assert.match(page, /robots: \{ index: false \}/);
  // The card must state what access grants — reads of the user's own data.
  assert.match(page, /đọc<\/strong> dữ liệu/);
  assert.match(page, /redirectHost/);
});

test("consent actions approve/deny through the oauth namespace without redirects being skipped", () => {
  assert.match(actions, /approveAuthorization/);
  assert.match(actions, /denyAuthorization/);
  assert.match(actions, /skipBrowserRedirect: true/);
  assert.match(actions, /authorizationIdSchema\.safeParse/);
  assert.match(actions, /redirect\(data\.redirect_url\)/);
  assert.doesNotMatch(actions, /serviceRole|SERVICE_ROLE_KEY/);
});

test("local Supabase config enables the OAuth server for the consent path", () => {
  assert.match(configToml, /\[auth\.oauth_server\]/);
  assert.match(configToml, /authorization_url_path = "\/oauth\/consent"/);
  assert.match(configToml, /allow_dynamic_registration = false/);
});
