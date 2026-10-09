import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildLabel,
  resolveBuildCommit,
  shortBuildId,
} from "./build-identity.ts";

/*
 * Which build is running.
 *
 * `package.json` has said 0.1.0 across 521 commits with no tags and no
 * releases, so the deployed commit is the only real identifier — and until now
 * nothing surfaced it. The first question about any defect is which code
 * produced it.
 */

test("a real commit becomes a short, quotable id", () => {
  assert.equal(
    shortBuildId("2187a3ce9f1b4d0a7c6e5f2b8a9d0c1e3f4a5b6c"),
    "2187a3c",
  );
  assert.equal(
    buildLabel("2187a3ce9f1b4d0a7c6e5f2b8a9d0c1e3f4a5b6c"),
    "Bản dựng 2187a3c",
  );
});

test("an unknown build says so instead of inventing a value", () => {
  /*
   * A fabricated build id is worse than an admitted unknown: it sends whoever
   * reads it looking through the wrong code.
   */
  for (const absent of [null, "", "not-a-sha", "12345", "zzzzzzz"]) {
    assert.equal(
      shortBuildId(absent as string | null),
      "dev",
      `${absent} must not pass`,
    );
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
  assert.match(config, /resolveBuildCommit/u);
});

test("build commit resolution prefers platform provenance", () => {
  /*
   * Git-connected Vercel builds set VERCEL_GIT_COMMIT_SHA; CI builds set
   * GITHUB_SHA; MF_BUILD_COMMIT is the operator-provided fallback for
   * manual CLI/prebuilt deploys (#779 — the 2026-10-08 cutover CLI deploy
   * carried no provenance and shipped `dev` to production).
   */
  const sha = "2187a3ce9f1b4d0a7c6e5f2b8a9d0c1e3f4a5b6c";
  assert.deepEqual(resolveBuildCommit({ VERCEL_GIT_COMMIT_SHA: sha }), {
    commit: sha,
    source: "VERCEL_GIT_COMMIT_SHA",
    error: null,
  });
  assert.deepEqual(resolveBuildCommit({ GITHUB_SHA: sha }), {
    commit: sha,
    source: "GITHUB_SHA",
    error: null,
  });
  assert.deepEqual(resolveBuildCommit({ MF_BUILD_COMMIT: sha }), {
    commit: sha,
    source: "MF_BUILD_COMMIT",
    error: null,
  });
  // Platform var wins over the operator override when both exist.
  assert.equal(
    resolveBuildCommit({
      VERCEL_GIT_COMMIT_SHA: sha,
      MF_BUILD_COMMIT: "f".repeat(40),
    }).commit,
    sha,
  );
});

test("a set but malformed commit value fails closed", () => {
  /*
   * Silently falling through a garbage value to a weaker source hides the
   * injection. Malformed input must abort the build, not degrade it.
   */
  const bad = resolveBuildCommit({ VERCEL_GIT_COMMIT_SHA: "not-a-sha" });
  assert.equal(bad.commit, null);
  assert.match(bad.error ?? "", /not a git commit SHA/u);
});

test("a Vercel production build without any commit fails closed", () => {
  /*
   * The incident this mission prevents: a production deploy reporting
   * `dev` — an untraceable release serving real financial data.
   */
  const res = resolveBuildCommit({ VERCEL_ENV: "production" });
  assert.equal(res.commit, null);
  assert.match(res.error ?? "", /production build has no commit provenance/u);
});

test("local and preview builds may legitimately carry no commit", () => {
  assert.deepEqual(resolveBuildCommit({}), {
    commit: null,
    source: null,
    error: null,
  });
  assert.equal(resolveBuildCommit({ VERCEL_ENV: "preview" }).error, null);
});

test("the health endpoint is shallow and never cached", () => {
  const route = readFileSync("src/app/api/health/route.ts", "utf8");

  /*
   * Shallow on purpose. A check that touched the database would fail during
   * provider maintenance and page someone about something they cannot fix, and
   * would hand an unauthenticated caller a way to probe database health.
   */
  assert.ok(
    !/supabase|createClient|from\(/u.test(route),
    "it must not touch the database",
  );
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
  assert.match(
    readFileSync("LICENSE", "utf8"),
    /GNU AFFERO GENERAL PUBLIC LICENSE/u,
  );
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
