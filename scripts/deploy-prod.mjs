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
 *   1. requires the deployed commit to be the local HEAD — the upload is the
 *      working tree, so releasing anything but HEAD would lie about itself;
 *   2. requires a clean worktree — uncommitted changes are unreviewed code;
 *   3. requires HEAD to exist on the remote — a commit nobody else can see
 *      cannot have been reviewed;
 *   4. passes `-b MF_BUILD_COMMIT=<sha>` so `next.config.ts` bakes a real,
 *      verifiable identifier into the build (it fails closed without one);
 *   5. post-checks `/api/health` until it reports that commit.
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

const PRODUCTION_ORIGIN = (
  process.env.PRODUCTION_ORIGIN || "https://mfvn.vercel.app"
).replace(/\/+$/, "");
const HEALTH_TIMEOUT_MS = 6 * 60 * 1000;
const HEALTH_POLL_MS = 15 * 1000;

const dry = process.argv.includes("--dry");

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function fail(message) {
  console.error(`deploy-prod: ${message}`);
  process.exit(1);
}

const head = git(["rev-parse", "HEAD"]);
if (!/^[0-9a-f]{40}$/iu.test(head)) fail(`unrecognised HEAD: ${head}`);

const dirty = git(["status", "--porcelain"]);
if (dirty) {
  fail(
    "worktree is not clean — the CLI uploads the working tree, so local edits would ship unreviewed:\n" +
      dirty,
  );
}

const containing = git(["branch", "-r", "--contains", head])
  .split("\n")
  .map((s) => s.trim())
  .filter((s) => s && !s.includes("->"));
if (containing.length === 0) {
  fail(
    `${head.slice(0, 7)} is not on any remote branch — push and get it reviewed first`,
  );
}
const onMain = containing.some((b) => /(^|\/)main$/u.test(b));
console.log(
  `commit ${head.slice(0, 7)} is reachable from: ${containing.join(", ")}`,
);
if (!onMain) {
  console.warn(
    "warning: deploying a commit that is not on origin/main — acceptable for an authorised cutover, unusual otherwise",
  );
}

const deployArgs = [
  "vercel",
  "deploy",
  "--prod",
  "--yes",
  "-b",
  `MF_BUILD_COMMIT=${head}`,
];
console.log(
  `\nplan:\n  npx ${deployArgs.join(" ")}\n  postcheck: GET ${PRODUCTION_ORIGIN}/api/health until build==${head.slice(0, 7)}\n`,
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
