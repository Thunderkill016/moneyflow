#!/usr/bin/env node
/*
 * Guarded production release for `mfvn.vercel.app` (#779).
 *
 * Why this exists: a bare `vercel deploy --prod` uploads the working tree and
 * builds it WITHOUT git metadata — `VERCEL_GIT_COMMIT_SHA` is only set for
 * git-connected builds — so the release ships with `build:"dev"` in
 * `/api/health` and the health monitor (correctly) pages about an
 * untraceable deployment. That is exactly what happened at the 2026-10-08
 * cutover.
 *
 * This script is the only sanctioned CLI path:
 *   1. anchors cwd at the repo root — `vercel deploy` uploads cwd;
 *   2. requires the linked Vercel project to be MoneyFlow production —
 *      an unlinked checkout would silently create a NEW project;
 *   3. requires a clean worktree — uncommitted changes are unreviewed code;
 *   4. requires HEAD to exist on `origin` after a live fetch — a commit
 *      nobody else can see cannot have been reviewed, and a stale
 *      remote-tracking ref must not satisfy the check;
 *   5. re-runs the deploy-context hygiene contract before upload, so a
 *      weakened `.vercelignore` cannot ship secrets;
 *   6. passes `-b MF_BUILD_COMMIT=<sha>` so `next.config.ts` bakes a real,
 *      verifiable identifier into the build (it fails closed without one);
 *   7. post-checks `/api/health` until it reports that commit.
 *
 * Usage:
 *   node scripts/deploy-prod.mjs [--dry]
 *
 * `PRODUCTION_ORIGIN` overrides the health-check origin (default
 * https://mfvn.vercel.app). Vercel auth comes from the CLI login /
 * VERCEL_TOKEN in the inherited environment; this script never prints
 * secrets.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PRODUCTION_ORIGIN = (
  process.env.PRODUCTION_ORIGIN || "https://mfvn.vercel.app"
).replace(/\/+$/, "");
const HEALTH_TIMEOUT_MS = 6 * 60 * 1000;
const HEALTH_POLL_MS = 15 * 1000;
const HEALTH_FETCH_TIMEOUT_MS = 10 * 1000;
/*
 * Pinned Vercel CLI — the version that performed the verified Neon cutover
 * deploys. An unpinned `npx vercel` floats to latest-registry on the release
 * path; release tooling must not change underneath the operator.
 */
const VERCEL_CLI = "vercel@63.1.0";
/* Expected Vercel link for the production project (`.vercel/project.json`). */
const EXPECTED_PROJECT = {
  projectId: "prj_eAusnkm1X1HzAt4wMFbuMnRXela7",
  orgId: "team_1MZEcAVjG3nrOnklJxYIqGQs",
};

const dry = process.argv.includes("--dry");

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function fail(message) {
  console.error(`deploy-prod: ${message}`);
  process.exit(1);
}

// `vercel deploy` uploads the current directory — pin it to the repo root so
// invoking the script from a subdirectory cannot ship a partial tree.
process.chdir(git(["rev-parse", "--show-toplevel"]));

const head = git(["rev-parse", "HEAD"]);
if (!/^[0-9a-f]{40}$/u.test(head)) fail(`unrecognised HEAD: ${head}`);

// The linked project must be MoneyFlow production — `vercel deploy --yes` on
// an unlinked tree silently creates a new project under the personal scope.
let link;
try {
  link = JSON.parse(readFileSync(join(".vercel", "project.json"), "utf8"));
} catch {
  fail("no .vercel/project.json — run `vercel link` against the moneyflow project first");
}
if (
  link.projectId !== EXPECTED_PROJECT.projectId ||
  link.orgId !== EXPECTED_PROJECT.orgId
) {
  fail(
    `.vercel is linked to ${link.projectName ?? link.projectId} in org ${link.orgId} — expected the moneyflow production project`,
  );
}

const dirty = git(["status", "--porcelain"]);
if (dirty) {
  fail(
    "worktree is not clean — the CLI uploads the working tree, so local edits would ship unreviewed:\n" +
      dirty,
  );
}

// Live-check remote state: a stale remote-tracking ref must not satisfy the
// review gate, and only `origin` counts (a local-path scratch remote proves
// nothing about review).
try {
  git(["fetch", "--prune", "origin"]);
} catch {
  fail("cannot reach origin — refusing to judge review status offline");
}
const containing = git(["branch", "-r", "--contains", head])
  .split("\n")
  .map((s) => s.trim())
  .filter((s) => s.startsWith("origin/") && !s.includes("->"));
if (containing.length === 0) {
  fail(
    `${head.slice(0, 7)} is not on any origin branch — push and get it reviewed first`,
  );
}
const onMain = containing.includes("origin/main");
console.log(
  `commit ${head.slice(0, 7)} is reachable from: ${containing.join(", ")}`,
);
if (!onMain) {
  console.warn(
    "warning: deploying a commit that is not on origin/main — acceptable for an authorised cutover, unusual otherwise",
  );
}

// Re-prove the upload exclusion contract at deploy time: a pushed-but-
// unreviewed branch could carry a weakened .vercelignore, and the working
// tree can contain secret-bearing files git never told anyone about.
const hygiene = spawnSync("node", ["scripts/check-deploy-hygiene.mjs"], {
  stdio: "inherit",
});
if (hygiene.status !== 0) {
  fail("deploy-context hygiene check failed — refusing upload");
}

const deployArgs = [
  "--yes",
  VERCEL_CLI,
  "deploy",
  "--prod",
  "--yes",
  "-b",
  `MF_BUILD_COMMIT=${head}`,
];
console.log(
  `\nplan:\n  npx ${deployArgs.join(" ")}\n  postcheck: GET ${PRODUCTION_ORIGIN}/api/health until commit==${head}\n`,
);
if (dry) {
  console.log("--dry: plan printed, nothing deployed");
  process.exit(0);
}

const deploy = spawnSync("npx", deployArgs, { stdio: "inherit" });
if (deploy.status !== 0) fail(`vercel deploy exited ${deploy.status}`);

console.log("postcheck: polling /api/health for the deployed commit…");
const deadline = Date.now() + HEALTH_TIMEOUT_MS;
let observed = null;
while (Date.now() < deadline) {
  try {
    const res = await fetch(`${PRODUCTION_ORIGIN}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(HEALTH_FETCH_TIMEOUT_MS),
    });
    const body = await res.json();
    observed = body;
    if (
      typeof body?.commit === "string" &&
      body.commit.toLowerCase() === head.toLowerCase()
    ) {
      console.log(
        `ok: ${PRODUCTION_ORIGIN} serves commit ${head.slice(0, 7)} (build ${body.build})`,
      );
      process.exit(0);
    }
  } catch {
    // transient network/propagation errors are normal during a rollout
  }
  await new Promise((r) => setTimeout(r, HEALTH_POLL_MS));
}
fail(
  `health endpoint did not report ${head.slice(0, 7)} within ${HEALTH_TIMEOUT_MS / 60000}m — last observed: ${JSON.stringify(observed)}`,
);
