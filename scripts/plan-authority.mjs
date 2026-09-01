import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

export const PLAN_AUTHORITY_MANIFEST_PATH = "docs/plans/PLAN_AUTHORITY.json";

function defaultRunGit(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function prNumberFromSubject(subject) {
  if (!subject) return null;
  const value = Number(subject.match(/\(#(\d+)\)/u)?.[1] ?? NaN);
  return Number.isInteger(value) ? value : null;
}

function readPullRequestEvent(env) {
  if (env.GITHUB_EVENT_NAME !== "pull_request" || !env.GITHUB_EVENT_PATH) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
  } catch {
    return null;
  }
}

function currentPullRequestNumber(env) {
  const event = readPullRequestEvent(env);
  const value = event?.pull_request?.number ?? event?.number;
  return Number.isInteger(value) ? value : null;
}

function gitHistory(root, path, runGit) {
  const output = runGit(root, [
    "log",
    "--first-parent",
    "--follow",
    "--format=%H%x09%s",
    "--",
    path,
  ]);
  if (!output) return [];

  return output
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const [sha, ...subjectParts] = line.split("\t");
      const subject = subjectParts.join("\t");
      return { sha, subject, prNumber: prNumberFromSubject(subject) };
    });
}

function readManifest(root, failures) {
  let manifest;
  try {
    manifest = JSON.parse(
      readFileSync(join(root, PLAN_AUTHORITY_MANIFEST_PATH), "utf8"),
    );
  } catch {
    failures.push(
      `missing or invalid plan authority manifest: ${PLAN_AUTHORITY_MANIFEST_PATH}`,
    );
    return null;
  }

  if (manifest?.schemaVersion !== 2) {
    failures.push(`${PLAN_AUTHORITY_MANIFEST_PATH} must use schemaVersion 2`);
  }
  validateAuthorityEntry(manifest?.master, "master", failures, { required: true });
  validateAuthorityEntry(manifest?.current, "current", failures, { required: false });

  if (
    manifest?.master?.path &&
    manifest?.current?.path &&
    manifest.master.path === manifest.current.path
  ) {
    failures.push(`${PLAN_AUTHORITY_MANIFEST_PATH} master and current must be different packets`);
  }

  if (!Array.isArray(manifest?.master?.supersedes)) {
    failures.push(`${PLAN_AUTHORITY_MANIFEST_PATH} master.supersedes must be an array`);
  }

  return manifest;
}

function validateAuthorityEntry(entry, label, failures, { required }) {
  if (entry == null) {
    if (required) failures.push(`${PLAN_AUTHORITY_MANIFEST_PATH} must declare ${label}`);
    return;
  }
  if (
    typeof entry.path !== "string" ||
    !entry.path.startsWith("docs/plans/active/") ||
    !entry.path.endsWith(".md")
  ) {
    failures.push(
      `${PLAN_AUTHORITY_MANIFEST_PATH} ${label}.path must point to an active plan packet`,
    );
  }
  if (!Number.isInteger(entry.introducedByPr)) {
    failures.push(`${PLAN_AUTHORITY_MANIFEST_PATH} ${label}.introducedByPr must be a PR number`);
  }
}

function resolveEntryStatus(root, entry, label, env, runGit, failures, warnings) {
  if (!entry?.path || !Number.isInteger(entry?.introducedByPr)) return null;

  try {
    readFileSync(join(root, entry.path), "utf8");
  } catch {
    failures.push(`${PLAN_AUTHORITY_MANIFEST_PATH} points to missing ${label} packet: ${entry.path}`);
    return {
      path: entry.path,
      packet: basename(entry.path),
      introducedByPr: entry.introducedByPr,
      status: "invalid",
      history: [],
    };
  }

  const history = gitHistory(root, entry.path, runGit);
  const merged = history.some((item) => item.prNumber === entry.introducedByPr);
  const currentPr = currentPullRequestNumber(env);
  const candidate = !merged && currentPr === entry.introducedByPr;

  if (!merged && !candidate) {
    failures.push(
      `${entry.path} says PR #${entry.introducedByPr} introduced ${label} authority, but merged first-parent history does not contain that PR`,
    );
  }
  if (candidate) {
    warnings.push(
      `${entry.path} is candidate ${label} authority in PR #${entry.introducedByPr}; it activates only after that PR appears in merged first-parent history`,
    );
  }

  return {
    path: entry.path,
    packet: basename(entry.path),
    introducedByPr: entry.introducedByPr,
    status: merged ? "active" : candidate ? "candidate" : "invalid",
    history,
  };
}

export function resolvePlanAuthority(
  root,
  { env = process.env, runGit = defaultRunGit } = {},
) {
  const failures = [];
  const warnings = [];
  const manifest = readManifest(root, failures);

  const master = resolveEntryStatus(
    root,
    manifest?.master,
    "master",
    env,
    runGit,
    failures,
    warnings,
  );
  const current = manifest?.current
    ? resolveEntryStatus(
        root,
        manifest.current,
        "current",
        env,
        runGit,
        failures,
        warnings,
      )
    : null;

  const authorityChain = [];
  if (master) {
    authorityChain.push({
      path: master.path,
      status: master.status,
      introducedByPr: master.introducedByPr,
    });
  }

  for (const predecessor of manifest?.master?.supersedes ?? []) {
    if (
      typeof predecessor?.path !== "string" ||
      !Number.isInteger(predecessor?.supersededByPr)
    ) {
      failures.push(
        `${PLAN_AUTHORITY_MANIFEST_PATH} supersedes entries require path + supersededByPr`,
      );
      continue;
    }
    try {
      readFileSync(join(root, predecessor.path), "utf8");
    } catch {
      failures.push(
        `${PLAN_AUTHORITY_MANIFEST_PATH} references missing superseded plan: ${predecessor.path}`,
      );
    }
    if (predecessor.supersededByPr !== manifest?.master?.introducedByPr) {
      failures.push(
        `${predecessor.path} supersededByPr #${predecessor.supersededByPr} disagrees with master introduction PR #${manifest?.master?.introducedByPr}`,
      );
    }
    authorityChain.push({
      path: predecessor.path,
      status: master?.status === "candidate" ? "superseded-if-merged" : "superseded",
      supersededBy: master?.path ?? null,
      supersededByPr: predecessor.supersededByPr,
    });
  }

  if (!current) {
    warnings.push("no current agent-executable slice is selected; zero-current is valid between slices");
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    manifestPath: PLAN_AUTHORITY_MANIFEST_PATH,
    schemaVersion: manifest?.schemaVersion ?? null,
    master: master
      ? {
          path: master.path,
          packet: master.packet,
          introducedByPr: master.introducedByPr,
          status: master.status,
        }
      : null,
    current: current
      ? {
          path: current.path,
          packet: current.packet,
          introducedByPr: current.introducedByPr,
          status: current.status,
        }
      : null,
    authorityChain,
    masterHistory: master?.history?.slice(0, 12) ?? [],
    currentHistory: current?.history?.slice(0, 12) ?? [],
  };
}

function printHuman(result) {
  console.log(
    `MoneyFlow plan authority — ${result.ok ? "RESOLVED" : "NEEDS RECONCILIATION"}`,
  );
  console.log(
    `manifest: ${result.manifestPath}; schema: ${result.schemaVersion ?? "invalid"}`,
  );
  console.log(
    `master: ${result.master?.path ?? "unresolved"}${result.master?.status ? ` [${result.master.status}]` : ""}`,
  );
  console.log(
    `current slice: ${result.current?.path ?? "none"}${result.current?.status ? ` [${result.current.status}]` : ""}`,
  );

  if (result.authorityChain.length > 0) {
    console.log("authority chain:");
    for (const entry of result.authorityChain) {
      console.log(
        `- ${entry.status}: ${entry.path}${entry.introducedByPr ? ` (PR #${entry.introducedByPr})` : ""}${entry.supersededByPr ? ` → PR #${entry.supersededByPr}` : ""}`,
      );
    }
  }

  for (const warning of result.warnings) console.warn(`warning: ${warning}`);
  for (const failure of result.failures) console.error(`failure: ${failure}`);
}

function runCli() {
  const result = resolvePlanAuthority(process.cwd());
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    printHuman(result);
  }
  process.exitCode = result.ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) runCli();
