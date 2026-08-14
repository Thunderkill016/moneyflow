#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_STATE_DIR = ".agent-dispatcher";
const DEFAULT_POLL_SECONDS = 30;
const STATE_FILE = "state.json";
const LOG_DIRECTORY = "logs";
const WORKTREE_DIRECTORY = "worktrees";
const SUPPORTED_LANE = "codex";
const MAIN_BRANCH = "main";
const SHA_PATTERN = /^[a-f0-9]{40}$/u;
const GITHUB_TOKEN_VARIABLES = [
  "GH_ENTERPRISE_TOKEN",
  "GH_TOKEN",
  "GITHUB_ENTERPRISE_TOKEN",
  "GITHUB_TOKEN",
];

function fail(message) {
  throw new Error(message);
}

function trimOutput(output) {
  return String(output ?? "").trim();
}

export function defaultRun(command, args, { cwd = process.cwd(), env = undefined } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) return { status: 1, stderr: result.error.message, stdout: "" };
  return { status: result.status ?? 1, stderr: result.stderr ?? "", stdout: result.stdout ?? "" };
}

function expectSuccess(result, description) {
  if (result.status !== 0) fail(`${description} failed`);
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

function compactError(error) {
  const message = error instanceof Error ? error.message : "unknown failure";
  return message.replace(/\s+/gu, " ").slice(0, 160);
}

function authorLogin(source) {
  return source.author?.login ?? source.author ?? null;
}

export function parseDispatcherArgs(argv) {
  const options = { mode: null, repo: null, stateDir: DEFAULT_STATE_DIR };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--once" || value === "--watch") {
      if (options.mode) fail("Choose exactly one of --once or --watch");
      options.mode = value.slice(2);
      continue;
    }
    if (value === "--repo" || value === "--state-dir") {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) fail(`${value} requires a value`);
      options[value === "--repo" ? "repo" : "stateDir"] = next;
      index += 1;
      continue;
    }
    fail(`Unknown option: ${value}`);
  }
  if (!options.mode) fail("Choose exactly one of --once or --watch");
  return options;
}

export function parseAgentCommand(text) {
  const match = /^\s*\/agent\s+([^\s]+)(?:\s+([\s\S]*?))?\s*$/u.exec(text ?? "");
  if (!match) fail("Missing command marker: /agent codex");
  const lane = match[1].toLowerCase();
  if (lane !== SUPPORTED_LANE) fail(`Unsupported agent lane: ${lane}`);
  return { lane, note: match[2] ?? "" };
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
  const identity = [source.kind, source.number, sourceKey, command.lane, command.note].join("\n");
  return createHash("sha256").update(identity).digest("hex");
}

export function loadState(stateDir) {
  const file = join(stateDir, STATE_FILE);
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (parsed.version !== 1 || typeof parsed.commands !== "object" || parsed.commands === null) {
      fail("Dispatcher state is invalid; refusing to overwrite it");
    }
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") return { version: 1, commands: {} };
    throw error;
  }
}

export function saveState(stateDir, state) {
  mkdirSync(stateDir, { recursive: true });
  const file = join(stateDir, STATE_FILE);
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, file);
}

export function buildIsolation({ commandId, source, stateDir }) {
  const shortId = commandId.slice(0, 8);
  const label = `${source.kind}-${source.number}-${shortId}`;
  return {
    branch: `agent/dispatcher/${label}`,
    worktree: join(resolve(stateDir), WORKTREE_DIRECTORY, label),
  };
}

export function buildTaskPrompt({ command, source }) {
  const operatorNote = command.note ? `\nOperator note: ${command.note}\n` : "";
  return [
    "You are the MoneyFlow Codex execution lane.",
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

export function buildCodexCommand({ prompt, worktree, environment = undefined }) {
  return {
    command: "codex",
    args: [
      "--approve-for-me",
      "exec",
      "--cd",
      worktree,
      prompt,
    ],
    env: environment,
  };
}

function writeGuardLauncher({ command, guardDirectory }) {
  const guard = join(guardDirectory, command);
  const guardProgram = new URL("./command-guard.mjs", import.meta.url);
  writeFileSync(
    guard,
    `#!/bin/sh\nexec "${process.execPath}" "${guardProgram.pathname}" "${command}" "$@"\n`,
    { mode: 0o700 },
  );
  chmodSync(guard, 0o700);
}

export function buildGuardedEnvironment({ commandId, environmentSource = process.env, stateDir }) {
  const environment = { ...environmentSource };
  for (const variable of GITHUB_TOKEN_VARIABLES) delete environment[variable];
  const guardDirectory = join(resolve(stateDir), "guards", commandId);
  mkdirSync(guardDirectory, { recursive: true, mode: 0o700 });
  writeGuardLauncher({ command: "git", guardDirectory });
  writeGuardLauncher({ command: "gh", guardDirectory });
  environment.MONEYFLOW_DISPATCHER_ORIGINAL_PATH = environment.PATH ?? "";
  environment.PATH = [guardDirectory, environment.PATH].filter(Boolean).join(delimiter);
  return environment;
}

export function validatePrerequisites({ requestedRepo = null, run = defaultRun } = {}) {
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
    return { ok: true, repo, baseSha: localBase };
  } catch (error) {
    return { ok: false, reason: compactError(error) };
  }
}

function createIsolatedWorktree({ branch, worktree, baseSha, run = defaultRun }) {
  if (!SHA_PATTERN.test(baseSha) || branch === MAIN_BRANCH) fail("Unsafe worktree base or branch");
  mkdirSync(dirname(worktree), { recursive: true });
  expectSuccess(
    run("git", ["worktree", "add", "--quiet", "-b", branch, worktree, baseSha]),
    "Isolated worktree creation",
  );
}

function writeLocalLog(stateDir, commandId, result) {
  const directory = join(stateDir, LOG_DIRECTORY);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, `${commandId}.log`), `${result.stdout ?? ""}${result.stderr ?? ""}`, {
    mode: 0o600,
  });
}

function postSummary({ repo, source, status, run = defaultRun }) {
  const body = `Dispatcher ${status} for /agent codex on ${source.kind} #${source.number}. Detailed agent output remains local.`;
  expectSuccess(
    run("gh", ["api", `repos/${repo}/issues/${source.number}/comments`, "-f", `body=${body}`]),
    "GitHub run summary",
  );
}

export function processCommand({ command, deps = {}, prerequisites = null, source, stateDir }) {
  const run = deps.run ?? defaultRun;
  const validate = deps.validatePrerequisites ?? validatePrerequisites;
  const prerequisite = prerequisites ?? validate({ run });
  if (!prerequisite.ok) return { status: "blocked", reason: prerequisite.reason };
  const sourceKey = source.sourceKey ?? "body";
  const commandId = commandIdFor({ source, command, sourceKey });
  const state = loadState(stateDir);
  if (state.commands[commandId]) return { status: "duplicate", commandId };

  const isolation = buildIsolation({ commandId, source, stateDir });
  state.commands[commandId] = { branch: isolation.branch, status: "running" };
  saveState(stateDir, state);
  try {
    const freshPrerequisite = validate({ requestedRepo: prerequisite.repo, run });
    if (!freshPrerequisite.ok) fail(freshPrerequisite.reason);
    if (freshPrerequisite.repo !== prerequisite.repo) fail("Repository identity changed before worktree creation");
    const createWorktree = deps.createWorktree ?? createIsolatedWorktree;
    createWorktree({ ...isolation, baseSha: freshPrerequisite.baseSha, run });
    const execution = buildCodexCommand({
      prompt: buildTaskPrompt({ command, source }),
      worktree: isolation.worktree,
      environment: buildGuardedEnvironment({ commandId, stateDir }),
    });
    const result = run(execution.command, execution.args, { cwd: isolation.worktree, env: execution.env });
    writeLocalLog(stateDir, commandId, result);
    const status = result.status === 0 ? "completed" : "failed";
    state.commands[commandId].status = status;
    saveState(stateDir, state);
    const post = deps.postSummary ?? postSummary;
    post({ repo: prerequisite.repo, source, status, run });
    return { status, commandId, isolation };
  } catch (error) {
    state.commands[commandId].status = "failed";
    saveState(stateDir, state);
    try {
      (deps.postSummary ?? postSummary)({ repo: prerequisite.repo, source, status: "failed", run });
    } catch {
      // Preserve the local failure while never posting detailed output.
    }
    return { status: "failed", commandId, reason: compactError(error) };
  }
}

export function listOpenSources({ repo, run = defaultRun }) {
  const fields = "number,title,body,url,author";
  const issueSources = readJson(
    run("gh", ["issue", "list", "--state", "open", "--limit", "100", "--json", fields, "--repo", repo]),
    "Open issue listing",
  ).map((item) => ({ ...item, kind: "issue" }));
  const pullRequestSources = readJson(
    run("gh", ["pr", "list", "--state", "open", "--limit", "100", "--json", fields, "--repo", repo]),
    "Open pull request listing",
  ).map((item) => ({ ...item, kind: "pr" }));
  return [...issueSources, ...pullRequestSources];
}

export function commandsFromSource({ repo, source, trustedAuthor, run = defaultRun }) {
  const commands = [];
  const append = (text, author, sourceKey) => {
    if (authorLogin({ author }) !== trustedAuthor) return;
    const command = findAgentMarker(text);
    if (command) commands.push({ command, source: { ...source, sourceKey } });
  };
  append(
    source.body ?? "",
    source.author,
    "body",
  );
  const comments = readJson(
    run("gh", ["api", `repos/${repo}/issues/${source.number}/comments`, "--paginate"]),
    `${source.kind} #${source.number} comments`,
  );
  for (const comment of comments) append(comment.body, comment.user, `comment:${comment.id}`);
  return commands;
}

function currentGhUser(run) {
  const login = trimOutput(
    expectSuccess(run("gh", ["api", "user", "--jq", ".login"]), "GitHub user").stdout,
  );
  if (!login) fail("GitHub user identity is ambiguous");
  return login;
}

export function runCycle({ options, run = defaultRun }) {
  const prerequisites = validatePrerequisites({ requestedRepo: options.repo, run });
  if (!prerequisites.ok) return { status: "blocked", reason: prerequisites.reason, processed: 0 };
  try {
    const trustedAuthor = currentGhUser(run);
    const sources = listOpenSources({ repo: prerequisites.repo, run });
    const commands = [];
    const skippedSources = [];
    for (const source of sources) {
      try {
        commands.push(...commandsFromSource({ repo: prerequisites.repo, run, source, trustedAuthor }));
      } catch (error) {
        skippedSources.push({ number: source.number, reason: compactError(error) });
      }
    }
    if (sources.length > 0 && skippedSources.length === sources.length) {
      return { status: "blocked", reason: "Every open source could not be read", processed: 0, skippedSources };
    }
    const results = commands.map(({ command, source }) =>
      processCommand({ command, prerequisites, source, stateDir: options.stateDir, deps: { run } }),
    );
    return { status: "ok", processed: results.length, results, skippedSources };
  } catch (error) {
    return { status: "blocked", reason: compactError(error), processed: 0 };
  }
}

export function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseDispatcherArgs(argv);
  } catch (error) {
    console.error(compactError(error));
    return 2;
  }
  const printCycle = () => {
    const result = runCycle({ options });
    if (result.status === "blocked") console.error(`Dispatcher blocked: ${result.reason}`);
    else {
      console.log(`Dispatcher processed ${result.processed} command(s).`);
      if (result.skippedSources.length > 0) {
        console.error(`Dispatcher skipped ${result.skippedSources.length} unreadable source(s).`);
      }
    }
    return result;
  };
  if (options.mode === "once") return printCycle().status === "blocked" ? 2 : 0;
  printCycle();
  setInterval(printCycle, DEFAULT_POLL_SECONDS * 1000);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main();
}
