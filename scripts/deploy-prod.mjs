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
 *   4. requires HEAD to BE `origin/main`'s tip after a live fetch — the
 *      ordinary production release deploys reviewed, merged code only.
 *      `git branch -r --contains` alone is not enough: a feature branch
 *      pushed to origin is "on a remote branch" yet unreviewed. Two
 *      explicit operator overrides exist:
 *        --allow-ancestor   deploy a commit reachable from origin/main but
 *                           older than its tip (the rollback shape);
 *        --allow-non-main   emergency pre-merge deploy of a commit that IS
 *                           pushed to some origin branch (the 2026-10-08
 *                           cutover shape). Never permits an unpushed HEAD —
 *                           a commit nobody else can see cannot have been
 *                           reviewed and cannot be reproduced.
 *   5. re-runs the deploy-context hygiene contract before upload, so a
 *      weakened `.vercelignore` cannot ship secrets;
 *   6. passes `-b MF_BUILD_COMMIT=<sha>` so `next.config.ts` bakes a real,
 *      verifiable identifier into the build (it fails closed without one);
 *   7. post-checks `/api/health` until it reports that commit.
 *
 * Usage:
 *   node scripts/deploy-prod.mjs [--dry] [--allow-ancestor | --allow-non-main]
 *
 * `PRODUCTION_ORIGIN` overrides the health-check origin (default
 * https://mfvn.vercel.app). Vercel auth comes from the CLI login /
 * VERCEL_TOKEN in the inherited environment; this script never prints
 * secrets.
 *
 * The deploy gate (`evaluateDeployGate`) and the project-link check are pure
 * and unit-tested in scripts/deploy-prod.test.mjs — tests must never spawn a
 * real deploy.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

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

/**
 * The linked project must be MoneyFlow production — `vercel deploy --yes` on
 * an unlinked or differently-linked tree silently creates a new project (or
 * ships to the wrong one) under whatever scope the CLI token has.
 *
 * @param {{ projectId?: string, orgId?: string, projectName?: string } | null} link
 * @returns {{ ok: boolean, failure: string | null }}
 */
export function checkProjectLink(link) {
  if (!link || typeof link !== "object") {
    return {
      ok: false,
      failure:
        "no .vercel/project.json — run `vercel link` against the moneyflow project first",
    };
  }
  if (
    link.projectId !== EXPECTED_PROJECT.projectId ||
    link.orgId !== EXPECTED_PROJECT.orgId
  ) {
    return {
      ok: false,
      failure: `.vercel is linked to ${link.projectName ?? link.projectId} in org ${link.orgId} — expected the moneyflow production project`,
    };
  }
  return { ok: true, failure: null };
}

/**
 * The production deploy gate. Every refusal path lands here so the reasons a
 * release is denied are readable without running git or Vercel.
 *
 * @param {object} input
 * @param {string} input.head          full SHA of the commit being deployed
 * @param {string} input.dirty         `git status --porcelain` output ("" = clean)
 * @param {string[]} input.containing  origin/* branches containing head (post-fetch)
 * @param {string | null} input.mainTip  full SHA of origin/main, null if unresolvable
 * @param {boolean} input.allowAncestor  operator override for older reviewed commits
 * @param {boolean} input.allowNonMain   operator override for pushed-unmerged commits
 * @returns {{ allowed: boolean, kind: string, failures: string[], notes: string[] }}
 *   kind ∈ release | ancestor-rollback | emergency-non-main | denied
 */
export function evaluateDeployGate({
  head,
  dirty,
  containing,
  mainTip,
  allowAncestor,
  allowNonMain,
}) {
  const failures = [];
  const notes = [];

  if (!/^[0-9a-f]{40}$/u.test(head)) {
    failures.push(`unrecognised HEAD: ${head}`);
  }
  if (dirty) {
    failures.push(
      "worktree is not clean — the CLI uploads the working tree, so local edits would ship unreviewed:\n" +
        dirty,
    );
  }
  if (failures.length > 0) {
    return { allowed: false, kind: "denied", failures, notes };
  }

  const onMain = containing.includes("origin/main");
  const isTip = mainTip !== null && head === mainTip;

  if (onMain && isTip) {
    notes.push(`commit ${head.slice(0, 7)} is the origin/main tip — reviewed release shape`);
    return { allowed: true, kind: "release", failures, notes };
  }

  if (onMain) {
    // Ancestor of origin/main: reviewed merged code, but not the latest —
    // the rollback shape. Never silent: it needs the explicit flag.
    const tipShort = mainTip ? mainTip.slice(0, 7) : "unresolvable";
    if (!allowAncestor) {
      failures.push(
        `${head.slice(0, 7)} is reachable from origin/main but is not its tip ` +
          `(${tipShort}) — an older commit is only deployable as a deliberate ` +
          "rollback: re-run with --allow-ancestor",
      );
      return { allowed: false, kind: "denied", failures, notes };
    }
    notes.push(
      `ROLLBACK SHAPE: ${head.slice(0, 7)} is an ancestor of origin/main tip ` +
        `${tipShort} — deploying older reviewed code by explicit operator flag`,
    );
    return { allowed: true, kind: "ancestor-rollback", failures, notes };
  }

  if (containing.length === 0) {
    // No flag overrides this: an unpushed commit is invisible to review and
    // impossible to reproduce from the remote.
    failures.push(
      `${head.slice(0, 7)} is not on any origin branch — push and get it reviewed first`,
    );
    return { allowed: false, kind: "denied", failures, notes };
  }

  // Pushed to some origin branch but not merged to main: unreviewed code that
  // merely exists remotely. Only the explicit emergency flag permits it.
  if (!allowNonMain) {
    failures.push(
      `${head.slice(0, 7)} is pushed but not merged — reachable only from: ${containing.join(", ")}. ` +
        "Production releases deploy reviewed origin/main code; for an authorised emergency " +
        "pre-merge deploy re-run with --allow-non-main",
    );
    return { allowed: false, kind: "denied", failures, notes };
  }
  notes.push(
    `EMERGENCY PRE-MERGE DEPLOY: ${head.slice(0, 7)} is reachable only from ` +
      `${containing.join(", ")} (not origin/main) — unreviewed code shipped by explicit operator flag`,
  );
  return { allowed: true, kind: "emergency-non-main", failures, notes };
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function fail(message) {
  console.error(`deploy-prod: ${message}`);
  process.exit(1);
}

async function runCli() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const allowAncestor = args.includes("--allow-ancestor");
  const allowNonMain = args.includes("--allow-non-main");

  // `vercel deploy` uploads the current directory — pin it to the repo root so
  // invoking the script from a subdirectory cannot ship a partial tree.
  process.chdir(git(["rev-parse", "--show-toplevel"]));

  const head = git(["rev-parse", "HEAD"]);

  let link;
  try {
    link = JSON.parse(readFileSync(join(".vercel", "project.json"), "utf8"));
  } catch {
    link = null;
  }
  const linkCheck = checkProjectLink(link);
  if (!linkCheck.ok) fail(linkCheck.failure);

  const dirty = git(["status", "--porcelain"]);

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
  let mainTip = null;
  try {
    mainTip = git(["rev-parse", "origin/main"]);
  } catch {
    // no origin/main — the gate below will deny via the non-main paths
  }

  const gate = evaluateDeployGate({
    head,
    dirty,
    containing,
    mainTip,
    allowAncestor,
    allowNonMain,
  });
  for (const note of gate.notes) console.log(`gate: ${note}`);
  if (!gate.allowed) {
    for (const reason of gate.failures) console.error(`deploy-prod: ${reason}`);
    process.exit(1);
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
    `\nplan [${gate.kind}]:\n  npx ${deployArgs.join(" ")}\n  postcheck: GET ${PRODUCTION_ORIGIN}/api/health until commit==${head}\n`,
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
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  await runCli();
}
