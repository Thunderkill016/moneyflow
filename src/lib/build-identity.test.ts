import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildLabel, shortBuildId } from "./build-identity.ts";

/*
 * Which build is running.
 *
 * `package.json` has said 0.1.0 across 521 commits with no tags and no
 * releases, so the deployed commit is the only real identifier — and until now
 * nothing surfaced it. The first question about any defect is which code
 * produced it.
 */

test("a real commit becomes a short, quotable id", () => {
  assert.equal(shortBuildId("2187a3ce9f1b4d0a7c6e5f2b8a9d0c1e3f4a5b6c"), "2187a3c");
  assert.equal(buildLabel("2187a3ce9f1b4d0a7c6e5f2b8a9d0c1e3f4a5b6c"), "Bản dựng 2187a3c");
});

test("an unknown build says so instead of inventing a value", () => {
  /*
   * A fabricated build id is worse than an admitted unknown: it sends whoever
   * reads it looking through the wrong code.
   */
  for (const absent of [null, "", "not-a-sha", "12345", "zzzzzzz"]) {
    assert.equal(shortBuildId(absent as string | null), "dev", `${absent} must not pass`);
  }
  assert.equal(buildLabel(null), "Bản dựng dev");
});

test("the commit reaches the bundle from the platform's build variable", () => {
  /*
   * Baked in at build time, so it must come through next.config rather than
   * being read at runtime — the browser has no environment to read.
   */
  const config = readFileSync("next.config.ts", "utf8");
  assert.match(config, /NEXT_PUBLIC_BUILD_COMMIT/u);
  assert.match(config, /VERCEL_GIT_COMMIT_SHA/u);
  assert.match(config, /GITHUB_SHA/u);
});

test("the health endpoint is shallow and never cached", () => {
  const route = readFileSync("src/app/api/health/route.ts", "utf8");

  /*
   * Shallow on purpose. A check that touched the database would fail during
   * provider maintenance and page someone about something they cannot fix, and
   * would hand an unauthenticated caller a way to probe database health.
   */
  assert.ok(!/supabase|createClient|from\(/u.test(route), "it must not touch the database");
  assert.match(route, /force-dynamic/u);
  assert.match(route, /no-store/u);
  assert.match(route, /shortBuildId/u);
});

test("the build is shown where a person reports a problem", () => {
  const security = readFileSync("src/components/security-page.tsx", "utf8");
  assert.match(security, /buildLabel\(\)/u);
  assert.match(security, /security\/advisories\/new/u);
});

test("the repository declares its licence in both places a tool looks", () => {
  /*
   * A public repository with no licence defaults to all rights reserved, which
   * is usually an omission rather than a decision. AGPL-3.0 matches Firefly
   * III, the closest structural analogue: anyone may self-host, but running a
   * modified copy as a service obliges publishing the changes.
   */
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    license?: string;
    engines?: { node?: string };
  };
  assert.equal(pkg.license, "AGPL-3.0-only");
  assert.match(readFileSync("LICENSE", "utf8"), /GNU AFFERO GENERAL PUBLIC LICENSE/u);
});

test("the Node version is pinned to the one CI builds with", () => {
  /*
   * CI runs Node 22 and this machine ran 24.16 all day with nothing to warn
   * about it, so every local "green" carried an unstated version difference
   * from the build that reaches production.
   */
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    engines?: { node?: string };
  };
  const ci = readFileSync(".github/workflows/ci.yml", "utf8");

  assert.match(pkg.engines?.node ?? "", /22/u);
  assert.equal(readFileSync(".nvmrc", "utf8").trim(), "22");
  assert.match(ci, /node-version:\s*22/u);
});
