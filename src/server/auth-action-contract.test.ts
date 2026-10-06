import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * Contract for the 2-tab logout race fix.
 *
 * Server Actions must never `redirect("/login")` on a missing session: the
 * client would bounce silently and drop the in-progress draft. Instead every
 * action goes through `requireActionViewer()` and translates a null viewer
 * into a structured auth failure the UI surfaces with the draft intact, while
 * the middleware lets unauthenticated action requests through so the action
 * can actually return it.
 *
 * These are source assertions (not runtime imports): `src/server/*` pulls in
 * `server-only`, so the contract is checked the same way
 * capability-api-transport.test.ts does.
 */

const root = process.cwd();
const actionsDir = join(root, "src/app/actions");
const actionFiles = readdirSync(actionsDir).filter(
  (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
);

/** Helpers own the guard; their callers propagate the discriminated result. */
const HELPER_GUARD_FILES = new Set([
  "inbox.ts",
  "reconciliation.ts",
  "rules.ts",
]);
/** Kind-based result types use the domain's not_authenticated kind. */
const KIND_GUARD_FILES = new Set(["archive.ts", "dismissals.ts"]);

test("every server action uses requireActionViewer, never requireViewer", () => {
  assert.ok(actionFiles.length >= 19, "expected the full actions surface");
  for (const file of actionFiles) {
    const source = readFileSync(join(actionsDir, file), "utf8");
    assert.doesNotMatch(
      source,
      /requireViewer\(\)/,
      `${file} must not redirect on a missing session`,
    );
    assert.match(
      source,
      /requireActionViewer\(\)/,
      `${file} must gate on the action viewer`,
    );
  }
});

test("every action viewer call site translates null into an auth failure", () => {
  for (const file of actionFiles) {
    const source = readFileSync(join(actionsDir, file), "utf8");
    const lines = source.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes("await requireActionViewer()")) continue;
      const rest = lines
        .slice(i, i + 4)
        .join("\n");
      if (HELPER_GUARD_FILES.has(file)) {
        // The shared helper (requireAuthedClient/authenticatedClient) owns the
        // guard; assert it exists once in the helper.
        continue;
      }
      const guarded =
        rest.includes("if (!viewer) return authRequiredFailure();") ||
        (KIND_GUARD_FILES.has(file) &&
          rest.includes('kind: "not_authenticated"'));
      assert.ok(
        guarded,
        `${file}:${i + 1} must translate a null viewer into an auth failure`,
      );
    }
  }
});

test("shared auth helpers guard the null viewer", () => {
  for (const file of HELPER_GUARD_FILES) {
    const source = readFileSync(join(actionsDir, file), "utf8");
    assert.match(
      source,
      /if \(!viewer\) return authRequiredFailure\(\);/,
      `${file}'s shared helper must translate a null viewer`,
    );
  }
});

test("shared helper callers propagate the auth failure instead of dropping it", () => {
  for (const file of HELPER_GUARD_FILES) {
    const source = readFileSync(join(actionsDir, file), "utf8");
    assert.doesNotMatch(
      source,
      /if \(!auth\.ok\) return \{ ok: false, message: auth\.message \};/,
      `${file} must propagate the failure (including its code), not rebuild it`,
    );
  }
});

test("middleware lets unauthenticated action requests reach the action", () => {
  const proxy = readFileSync(
    join(root, "src/lib/supabase/proxy.ts"),
    "utf8",
  );
  assert.match(proxy, /isServerActionRequest/);
  assert.match(proxy, /headers\.has\("next-action"\)/);
  assert.match(
    proxy,
    /!isAuthenticated && !isServerActionRequest\(request\)/,
    "the login redirect must skip server-action requests",
  );
});

test("src/server/auth keeps the page redirect and adds the action seam", () => {
  const auth = readFileSync(join(root, "src/server/auth.ts"), "utf8");
  // Pages still bounce to /login through requireViewer().
  assert.match(auth, /export async function requireViewer\(\)/);
  assert.match(auth, /if \(!viewer\) redirect\("\/login"\);/);
  // Actions get the null-returning seam plus the structured failure.
  assert.match(auth, /export async function requireActionViewer\(\)/);
  assert.match(auth, /export function authRequiredFailure\(\)/);
  assert.match(auth, /AUTH_REQUIRED_CODE = "auth-required"/);
  assert.match(auth, /AUTH_REQUIRED_MESSAGE/);
});
