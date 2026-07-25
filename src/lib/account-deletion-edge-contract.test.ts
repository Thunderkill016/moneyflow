import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const edgeFunction = readFileSync(
  join(root, "supabase/functions/delete-account/index.ts"),
  "utf8",
);
const actions = readFileSync(join(root, "src/app/(auth)/actions.ts"), "utf8");
const page = readFileSync(join(root, "src/components/delete-account-page.tsx"), "utf8");

test("delete-account Edge Function authenticates and deletes only the caller", () => {
  assert.match(edgeFunction, /request\.method !== "POST"/);
  assert.match(edgeFunction, /confirm !== DELETE_CONFIRM_TEXT/);
  assert.match(edgeFunction, /auth\.getUser\(accessToken\)/);
  assert.match(
    edgeFunction,
    /auth\.admin\.deleteUser\(\s*user\.id,\s*false,?\s*\)/,
  );
  assert.doesNotMatch(edgeFunction, /payload[^\n]*user[_-]?id/i);
  assert.doesNotMatch(edgeFunction, /console\.(?:log|error)/);
});

test("delete-account uses the service-role JWT for GoTrue admin operations", () => {
  assert.match(
    edgeFunction,
    /serviceRoleKey = firstEnvironmentValue\("SUPABASE_SERVICE_ROLE_KEY"\)/,
  );
  assert.match(edgeFunction, /createClient\(supabaseUrl, serviceRoleKey/);
  assert.doesNotMatch(edgeFunction, /SUPABASE_SECRET_KEY/);
});

test("server action enforces confirmation and invokes the protected function", () => {
  assert.match(actions, /isDeleteConfirmValid\(confirmText\)/);
  assert.match(actions, /auth\.getUser\(\)/);
  assert.match(actions, /functions\.invoke\("delete-account"/);
  assert.match(actions, /body:\s*\{\s*confirm:\s*DELETE_CONFIRM_TEXT\s*\}/);
  assert.match(actions, /auth\.signOut\(\{ scope: "local" \}\)/);
});

test("authenticated UI deletes the server account before wiping browser data", () => {
  const remoteDelete = page.indexOf("await finalizeAccountDeletion(confirmText)");
  const localWipeAfterRemote = page.indexOf(
    "clearLocalMoneyFlowStores()",
    remoteDelete,
  );
  assert.ok(remoteDelete >= 0, "missing authenticated server deletion call");
  assert.ok(
    localWipeAfterRemote > remoteDelete,
    "local data must be preserved when server deletion fails",
  );
  assert.match(page, /if \(!result\.ok\)/);
  assert.match(page, /localCleanup=partial/);
});
