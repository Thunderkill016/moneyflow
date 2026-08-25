import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  accessSync,
  chmodSync,
  constants,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MAIN_BRANCH = "main";
const SHA_PATTERN = /^[a-f0-9]{40}$/u;
const MAX_AGENT_OUTPUT_BYTES = 8 * 1024 * 1024;
const DEFAULT_KILL_GRACE_MS = 5_000;
const AUTO_MERGE_OPTION = "--automerge";
const REQUIRED_CHECK_WATCH_INTERVAL_SECONDS = 30;
const CLEAN_MERGE_STATE = "CLEAN";
const CHANGES_REQUESTED_REVIEW = "CHANGES_REQUESTED";
const GITHUB_TOKEN_VARIABLES = [
  "GH_ENTERPRISE_TOKEN",
  "GH_TOKEN",
  "GITHUB_ENTERPRISE_TOKEN",
  "GITHUB_TOKEN",
];

function fail(message) {
  throw new Error(message);
}

export function compactError(error) {
  const message = error instanceof Error ? error.message : "unknown failure";
  return message.replace(/\s+/gu, " ").slice(0, 200);
}

function trimOutput(output) {
  return String(output ?? "").trim();
}

export function defaultCommandRun(command, args, { cwd = process.cwd(), env = undefined } = {}) {
  if (!["git", "gh", "node"].includes(command)) {
    return { status: 1, stderr: `Unsupported harness executable: ${command}`, stdout: "" };
  }
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env,
    maxBuffer: MAX_AGENT_OUTPUT_BYTES,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) return { status: 1, stderr: result.error.message, stdout: "" };
  return { status: result.status ?? 1, stderr: result.stderr ?? "", stdout: result.stdout ?? "" };
}

function expectSuccess(result, description) {
  if (result.status !== 0) fail(`${description} failed${result.stderr ? `: ${trimOutput(result.stderr)}` : ""}`);
  return result;
}

function readJson(result, description) {
  const output = trimOutput(expectSuccess(result, description).stdout);
  try {
    return JSON.parse(output);
  } catch {
    fail(`${description} returned invalid JSON`);
  }
}

function authorLogin(source) {
  return source.author?.login ?? source.author ?? null;
}

export function parseAgentCommand(text) {
  const match = /^\s*\/agent\s+([a-z][a-z0-9-]*)(?:\s+([\s\S]*?))?\s*$/iu.exec(text ?? "");
  if (!match) fail("Missing command marker: /agent <provider>");
  const rawNote = match[2] ?? "";
  const autoMerge = rawNote === AUTO_MERGE_OPTION || rawNote.startsWith(`${AUTO_MERGE_OPTION} `);
  const note = autoMerge ? rawNote.slice(AUTO_MERGE_OPTION.length).trim() : rawNote;
  return {
    provider: match[1].toLowerCase(),
    note,
    ...(autoMerge ? { autoMerge: true } : {}),
  };
}

function findAgentMarker(text) {
  let inFence = false;
  let hasContent = false;
  for (const line of String(text ?? "").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (/^(?:```|~~~)/u.test(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !trimmed) continue;
    if (hasContent || trimmed.startsWith(">")) return null;
    hasContent = true;
    if (!trimmed.startsWith("/agent")) return null;
    return parseAgentCommand(line);
  }
  return null;
}

export function commandIdFor({ source, command, sourceKey }) {
  const identityParts = [
    source.kind,
    source.number,
    sourceKey,
    command.provider,
    command.note,
  ];
  if (command.autoMerge === true) identityParts.push("automerge");
  const identity = identityParts.join("\n");
  return createHash("sha256").update(identity).digest("hex");
}

export function buildTaskPrompt({ command, source }) {
  const operatorNote = command.note ? `\nOperator note: ${command.note}\n` : "";
  return [
    "You are a MoneyFlow repository execution provider running inside the local agent harness.",
    "Read the current AGENTS.md and follow repository authority; do not treat this prompt as a replacement for it.",
    "Run `npm run agent:doctor -- --json` before implementation.",
    "Stay inside the issue/PR scope and owner boundaries. Do not merge, push to main, modify provider/production state, or broaden authority.",
    "Continue through implementation, selected verification, fixes and a draft PR only where the task permits.",
    `The authorized task source is ${source.kind} #${source.number}: ${source.url}.`,
    operatorNote,
    "<task-source>",
    source.body ?? "",
    "</task-source>",
  ].join("\n");
}

export function createGithubSourceProvider({ run = defaultCommandRun } = {}) {
  return Object.freeze({
    id: "github",

    currentUser() {
      const login = trimOutput(
        expectSuccess(run("gh", ["api", "user", "--jq", ".login"]), "GitHub user").stdout,
      );
      if (!login) fail("GitHub user identity is ambiguous");
      return login;
    },

    listOpenSources({ repo }) {
      const fields = "number,title,body,url,author";
      const issues = readJson(
        run("gh", ["issue", "list", "--state", "open", "--limit", "100", "--json", fields, "--repo", repo]),
        "Open issue listing",
      ).map((item) => ({ ...item, kind: "issue" }));
      const prs = readJson(
        run("gh", ["pr", "list", "--state", "open", "--limit", "100", "--json", fields, "--repo", repo]),
        "Open pull request listing",
      ).map((item) => ({ ...item, kind: "pr" }));
      return [...issues, ...prs];
    },

    commandsFromSource({ repo, source, trustedAuthor }) {
      const commands = [];
      const append = (text, author, sourceKey) => {
        if (authorLogin({ author }) !== trustedAuthor) return;
        const command = findAgentMarker(text);
        if (command) commands.push({ command, source: { ...source, sourceKey } });
      };
      append(source.body ?? "", source.author, "body");
      const comments = readJson(
        run("gh", ["api", `repos/${repo}/issues/${source.number}/comments`, "--paginate"]),
        `${source.kind} #${source.number} comments`,
      );
      for (const comment of comments) append(comment.body, comment.user, `comment:${comment.id}`);
      return commands;
    },

    postSummary({ repo, source, status }) {
      const body = `Agent harness ${status} /agent ${source.commandProvider ?? "provider"} on ${source.kind} #${source.number}. Detailed agent output remains local.`;
      expectSuccess(
        run("gh", ["api", `repos/${repo}/issues/${source.number}/comments`, "-f", `body=${body}`]),
        "GitHub run summary",
      );
    },
  });
}

function parseRepoSlug(repo) {
  const [owner, name, ...extra] = String(repo ?? "").split("/");
  if (!owner || !name || extra.length > 0) fail("Repository identity is ambiguous");
  return { owner, name };
}

function freshMainSha({ run }) {
  const output = trimOutput(
    expectSuccess(run("git", ["ls-remote", "origin", `refs/heads/${MAIN_BRANCH}`]), "Remote main").stdout,
  );
  const sha = output.split(/\s+/u)[0] ?? "";
  if (!SHA_PATTERN.test(sha)) fail("Remote main SHA is malformed");
  return sha;
}

function oneRunOwnedPullRequest({ run, repo, branch }) {
  const fields = "number,isDraft,headRefOid,baseRefOid,mergeStateStatus";
  const pullRequests = readJson(
    run("gh", [
      "pr",
      "list",
      "--repo",
      repo,
      "--head",
      branch,
      "--base",
      MAIN_BRANCH,
      "--state",
      "open",
      "--json",
      fields,
    ]),
    "Run-owned pull-request lookup",
  );
  if (!Array.isArray(pullRequests) || pullRequests.length !== 1) {
    fail("Expected exactly one open pull request from the isolated run branch");
  }
  const pullRequest = pullRequests[0];
  if (!Number.isInteger(pullRequest?.number) || !SHA_PATTERN.test(pullRequest?.headRefOid ?? "")) {
    fail("Run-owned pull request is missing a valid number or head SHA");
  }
  return pullRequest;
}

function requiredChecksPass({ run, repo, pullRequest }) {
  const checks = readJson(
    run("gh", [
      "pr",
      "checks",
      String(pullRequest),
      "--repo",
      repo,
      "--required",
      "--watch",
      "--interval",
      String(REQUIRED_CHECK_WATCH_INTERVAL_SECONDS),
      "--json",
      "name,bucket",
    ]),
    "Required pull-request checks",
  );
  if (!Array.isArray(checks) || checks.length === 0 || checks.some((check) => check?.bucket !== "pass")) {
    fail("Every required pull-request check must finish with a pass bucket");
  }
}

function freshPullRequest({ run, repo, pullRequest }) {
  return readJson(
    run("gh", [
      "pr",
      "view",
      String(pullRequest),
      "--repo",
      repo,
      "--json",
      "number,isDraft,headRefOid,baseRefOid,mergeStateStatus,reviewDecision",
    ]),
    "Fresh pull-request state",
  );
}

function reviewThreadsAreResolved({ run, repo, pullRequest }) {
  const { owner, name } = parseRepoSlug(repo);
  const query = [
    "query($owner: String!, $name: String!, $number: Int!) {",
    "  repository(owner: $owner, name: $name) {",
    "    pullRequest(number: $number) { reviewThreads(first: 100) { nodes { isResolved } } }",
    "  }",
    "}",
  ].join("\n");
  const result = readJson(
    run("gh", [
      "api",
      "graphql",
      "-f",
      `query=${query}`,
      "-F",
      `owner=${owner}`,
      "-F",
      `name=${name}`,
      "-F",
      `number=${pullRequest}`,
    ]),
    "Pull-request review threads",
  );
  const threads = result?.data?.repository?.pullRequest?.reviewThreads?.nodes;
  if (!Array.isArray(threads) || threads.some((thread) => thread?.isResolved !== true)) {
    fail("Pull-request review threads must all be resolved");
  }
}

export function createGithubDeliveryProvider({ run = defaultCommandRun } = {}) {
  return Object.freeze({
    id: "github",

    deliver({ repo, isolation, baseSha }) {
      if (!SHA_PATTERN.test(baseSha ?? "")) fail("Delivery base SHA is malformed");
      if (!isolation?.branch || isolation.branch === MAIN_BRANCH) {
        fail("Delivery requires an unambiguous isolated non-main branch");
      }

      const initialPullRequest = oneRunOwnedPullRequest({ run, repo, branch: isolation.branch });
      if (initialPullRequest.isDraft !== true) fail("Run-owned pull request must start as a draft");
      if (initialPullRequest.baseRefOid !== baseSha) fail("Run-owned pull request base no longer matches the run base");

      expectSuccess(
        run("gh", ["pr", "ready", String(initialPullRequest.number), "--repo", repo]),
        "Marking the run-owned pull request ready",
      );
      requiredChecksPass({ run, repo, pullRequest: initialPullRequest.number });

      const pullRequest = freshPullRequest({ run, repo, pullRequest: initialPullRequest.number });
      if (pullRequest?.isDraft === true) fail("Run-owned pull request remained a draft");
      if (pullRequest?.headRefOid !== initialPullRequest.headRefOid) {
        fail("Run-owned pull request head changed after checks began");
      }
      if (pullRequest?.baseRefOid !== baseSha || freshMainSha({ run }) !== baseSha) {
        fail("Main changed after the isolated run began");
      }
      if (pullRequest?.mergeStateStatus !== CLEAN_MERGE_STATE) {
        fail("Run-owned pull request is not cleanly mergeable");
      }
      if (pullRequest?.reviewDecision === CHANGES_REQUESTED_REVIEW) {
        fail("Run-owned pull request has changes requested");
      }
      reviewThreadsAreResolved({ run, repo, pullRequest: initialPullRequest.number });

      const merged = readJson(
        run("gh", [
          "api",
          "-X",
          "PUT",
          `repos/${repo}/pulls/${initialPullRequest.number}/merge`,
          "-f",
          `sha=${initialPullRequest.headRefOid}`,
          "-f",
          "merge_method=squash",
        ]),
        "Exact-head squash merge",
      );
      if (merged?.merged !== true || !SHA_PATTERN.test(merged?.sha ?? "")) {
        fail("GitHub did not confirm an exact-head squash merge");
      }
      return Object.freeze({
        status: "merged",
        pullRequest: initialPullRequest.number,
        mergeCommit: merged.sha,
      });
    },
  });
}

export function buildIsolation({ commandId, source, stateDir }) {
  const shortId = commandId.slice(0, 8);
  const label = `${source.kind}-${source.number}-${shortId}`;
  return Object.freeze({
    branch: `agent/harness/${label}`,
    worktree: join(resolve(stateDir), "worktrees", label),
  });
}

export function createLocalWorkspaceProvider({ run = defaultCommandRun } = {}) {
  return Object.freeze({
    id: "local",

    check({ requestedRepo = null } = {}) {
      try {
        expectSuccess(run("gh", ["auth", "status"]), "GitHub authentication");
        const repository = readJson(
          run("gh", ["repo", "view", "--json", "nameWithOwner,defaultBranchRef"]),
          "Repository identity",
        );
        const repo = repository.nameWithOwner;
        if (!/^[^/\s]+\/[^/\s]+$/u.test(repo ?? "")) fail("Repository identity is ambiguous");
        if (requestedRepo && requestedRepo !== repo) fail("Requested repository does not match this workspace");
        if (repository.defaultBranchRef?.name !== MAIN_BRANCH) fail("Repository default branch is not main");
        const localBase = trimOutput(
          expectSuccess(run("git", ["rev-parse", `origin/${MAIN_BRANCH}`]), "Local origin/main").stdout,
        );
        const remoteBase = trimOutput(
          expectSuccess(
            run("git", ["ls-remote", "origin", `refs/heads/${MAIN_BRANCH}`]),
            "Remote main",
          ).stdout,
        ).split(/\s+/u)[0];
        if (!SHA_PATTERN.test(localBase) || !SHA_PATTERN.test(remoteBase) || localBase !== remoteBase) {
          fail("origin/main is missing, malformed, or differs from remote main");
        }
        return Object.freeze({ ok: true, repo, baseSha: localBase });
      } catch (error) {
        return Object.freeze({ ok: false, reason: compactError(error) });
      }
    },

    prepare({ commandId, source, stateDir, baseSha }) {
      if (!SHA_PATTERN.test(baseSha)) fail("Unsafe worktree base");
      const isolation = buildIsolation({ commandId, source, stateDir });
      if (isolation.branch === MAIN_BRANCH) fail("Unsafe worktree branch");
      mkdirSync(dirname(isolation.worktree), { recursive: true });
      expectSuccess(
        run("git", ["worktree", "add", "--quiet", "-b", isolation.branch, isolation.worktree, baseSha]),
        "Isolated worktree creation",
      );
      return isolation;
    },
  });
}

function executableExtensions(environmentSource) {
  if (process.platform !== "win32") return [""];
  return String(environmentSource.PATHEXT ?? ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .filter(Boolean);
}

function resolveExecutable(command, environmentSource) {
  const pathCandidates = [environmentSource.PATH, process.env.PATH]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
  const extensions = executableExtensions(environmentSource);
  for (const pathValue of pathCandidates) {
    for (const directory of String(pathValue).split(delimiter).filter(Boolean)) {
      for (const extension of extensions) {
        const candidate = join(directory, `${command}${extension}`);
        try {
          accessSync(candidate, constants.X_OK);
          return candidate;
        } catch {
          // Try next candidate.
        }
      }
    }
  }
  fail(`Harness could not resolve the real ${command} executable`);
}

function shellDoubleQuote(value) {
  return `"${String(value).replace(/[\\"$`]/gu, "\\$&")}"`;
}

function writeGuardLauncher({ command, guardDirectory, realTool }) {
  const launcher = join(guardDirectory, command);
  const guardProgram = fileURLToPath(new URL("./command-guard.mjs", import.meta.url));
  writeFileSync(
    launcher,
    `#!/bin/sh\nexec ${shellDoubleQuote(process.execPath)} ${shellDoubleQuote(guardProgram)} ${shellDoubleQuote(command)} ${shellDoubleQuote(realTool)} "$@"\n`,
    { mode: 0o700 },
  );
  chmodSync(launcher, 0o700);
}

export function createGuardedPermissionProvider({ environmentSource = process.env } = {}) {
  return Object.freeze({
    id: "guarded",

    prepare({ commandId, stateDir }) {
      const environment = { ...environmentSource };
      for (const variable of GITHUB_TOKEN_VARIABLES) delete environment[variable];
      delete environment.MONEYFLOW_DISPATCHER_ORIGINAL_PATH;
      delete environment.MONEYFLOW_HARNESS_ORIGINAL_PATH;

      const guardDirectory = join(resolve(stateDir), "guards", commandId);
      mkdirSync(guardDirectory, { recursive: true, mode: 0o700 });
      for (const command of ["git", "gh"]) {
        writeGuardLauncher({
          command,
          guardDirectory,
          realTool: resolveExecutable(command, environmentSource),
        });
      }
      environment.PATH = [guardDirectory, environment.PATH].filter(Boolean).join(delimiter);
      return Object.freeze(environment);
    },
  });
}

function appendChunk(state, chunk) {
  const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
  state.bytes += buffer.byteLength;
  if (state.bytes > MAX_AGENT_OUTPUT_BYTES) return false;
  state.chunks.push(buffer);
  return true;
}

export function startOwnedProcess({
  command,
  args,
  cwd,
  env,
  signal,
  spawnProcess = spawn,
  killGraceMs = DEFAULT_KILL_GRACE_MS,
}) {
  let child;
  let settled = false;
  let forcedError = null;
  let killTimer = null;
  const stdout = { bytes: 0, chunks: [] };
  const stderr = { bytes: 0, chunks: [] };
  let resolveResult;
  const result = new Promise((resolveResultPromise) => {
    resolveResult = resolveResultPromise;
  });

  const terminate = (killSignal) => {
    try {
      return child?.kill?.(killSignal) ?? false;
    } catch {
      return false;
    }
  };
  const settle = (value) => {
    if (settled) return;
    settled = true;
    if (killTimer) clearTimeout(killTimer);
    killTimer = null;
    signal?.removeEventListener("abort", onAbort);
    resolveResult(Object.freeze(value));
  };
  const cancel = (reason = "cancelled") => {
    if (settled) return;
    forcedError ??= reason;
    terminate("SIGTERM");
    if (!killTimer && Number.isFinite(killGraceMs) && killGraceMs >= 0) {
      killTimer = setTimeout(() => {
        if (!settled) terminate("SIGKILL");
      }, killGraceMs);
      killTimer.unref?.();
    }
  };
  const onAbort = () => cancel("cancelled");

  try {
    if (signal?.aborted) {
      settle({ exitCode: 1, stdout: "", stderr: "cancelled before start", stopReason: "cancelled" });
    } else {
      child = spawnProcess(command, args, {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      signal?.addEventListener("abort", onAbort, { once: true });
      child.stdout?.on("data", (chunk) => {
        if (!appendChunk(stdout, chunk)) cancel("agent stdout exceeded 8 MiB");
      });
      child.stderr?.on("data", (chunk) => {
        if (!appendChunk(stderr, chunk)) cancel("agent stderr exceeded 8 MiB");
      });
      child.once("error", (error) => {
        settle({
          exitCode: 1,
          stdout: Buffer.concat(stdout.chunks).toString("utf8"),
          stderr: `${Buffer.concat(stderr.chunks).toString("utf8")}${error.message}`,
          stopReason: "error",
        });
      });
      child.once("close", (code, closeSignal) => {
        const stopReason = forcedError
          ? forcedError === "cancelled"
            ? "cancelled"
            : "error"
          : code === 0
            ? "completed"
            : "error";
        settle({
          exitCode: forcedError ? 1 : (code ?? 1),
          stdout: Buffer.concat(stdout.chunks).toString("utf8"),
          stderr: [Buffer.concat(stderr.chunks).toString("utf8"), forcedError, closeSignal ? `signal=${closeSignal}` : ""]
            .filter(Boolean)
            .join("\n"),
          stopReason,
        });
      });
    }
  } catch (error) {
    settle({ exitCode: 1, stdout: "", stderr: compactError(error), stopReason: "error" });
  }

  return Object.freeze({
    result,
    cancel,
    async dispose() {
      if (!settled) cancel("cancelled");
      await result;
    },
  });
}

export function createCodexAgentProvider({
  startProcess = startOwnedProcess,
  environmentSource = process.env,
} = {}) {
  return Object.freeze({
    id: "codex",
    capabilities: Object.freeze({ isolatedWorkspace: true, guardedEnvironment: true }),

    check() {
      try {
        resolveExecutable("codex", environmentSource);
        return Object.freeze({ ok: true });
      } catch (error) {
        return Object.freeze({ ok: false, reason: compactError(error) });
      }
    },

    start({ prompt, worktree, environment, signal }) {
      return startProcess({
        command: "codex",
        args: ["--approve-for-me", "exec", "--cd", worktree, prompt],
        cwd: worktree,
        env: environment,
        signal,
      });
    },
  });
}

export async function defaultHarnessPlugin(ctx, config = {}) {
  const run = config.run ?? defaultCommandRun;
  const environmentSource = config.environmentSource ?? process.env;
  ctx.provide("source", "github", createGithubSourceProvider({ run }));
  ctx.provide("workspace", "local", createLocalWorkspaceProvider({ run }));
  ctx.provide("delivery", "github", createGithubDeliveryProvider({ run }));
  ctx.provide(
    "permission",
    "guarded",
    createGuardedPermissionProvider({ environmentSource }),
  );
  ctx.provide(
    "agent",
    "codex",
    createCodexAgentProvider({
      startProcess: config.startProcess,
      environmentSource,
    }),
  );
}
