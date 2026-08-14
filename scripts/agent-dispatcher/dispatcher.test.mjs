import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildCodexCommand,
  buildGuardedEnvironment,
  buildIsolation,
  commandIdFor,
  commandsFromSource,
  defaultRun,
  loadState,
  listOpenSources,
  parseAgentCommand,
  parseDispatcherArgs,
  processCommand,
  runCycle,
  saveState,
  validatePrerequisites,
} from "./dispatcher.mjs";
import { ghBoundaryViolation, gitBoundaryViolation } from "./command-guard.mjs";

const source = {
  author: "owner",
  body: "## Goal\n\nCheck the repository only.",
  kind: "issue",
  number: 375,
  title: "Dispatcher v1",
  url: "https://github.com/owner/repo/issues/375",
};
const OUTPUT_LARGER_THAN_NODE_DEFAULT_BUFFER_BYTES = 1_100_000;

test("parses one-shot and watch dispatcher controls", () => {
  assert.deepEqual(parseDispatcherArgs(["--once", "--repo", "owner/repo"]), {
    mode: "once",
    repo: "owner/repo",
    stateDir: ".agent-dispatcher",
  });
  assert.throws(() => parseDispatcherArgs(["--once", "--watch"]), /exactly one/u);
});

test("accepts the explicit codex marker and fails closed for other lanes", () => {
  assert.deepEqual(parseAgentCommand("/agent codex verify the packet"), {
    lane: "codex",
    note: "verify the packet",
  });
  assert.throws(() => parseAgentCommand("/agent claude-review"), /Unsupported agent lane/u);
  assert.throws(() => parseAgentCommand("please run codex"), /Missing command marker/u);
});

test("suppresses a completed command after state is reloaded", () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-dispatcher-"));
  try {
    const commandId = commandIdFor({ source, command: { lane: "codex", note: "" }, sourceKey: "body" });
    const state = loadState(stateDir);
    state.commands[commandId] = { status: "completed" };
    saveState(stateDir, state);

    assert.equal(loadState(stateDir).commands[commandId].status, "completed");
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("derives a non-main isolated branch and worktree name from the command", () => {
  const isolation = buildIsolation({
    commandId: "abcdef0123456789",
    source,
    stateDir: ".agent-dispatcher",
  });

  assert.equal(isolation.branch, "agent/dispatcher/issue-375-abcdef01");
  assert.match(isolation.worktree, /worktrees\/issue-375-abcdef01$/u);
  assert.notEqual(isolation.branch, "main");
});

test("constructs supported Codex exec arguments without carrying secret text", () => {
  const command = buildCodexCommand({
    prompt: "Read AGENTS.md and inspect the task.",
    worktree: "/tmp/worktree",
  });

  assert.deepEqual(command.command, "codex");
  assert.deepEqual(command.args.slice(0, 2), ["--approve-for-me", "exec"]);
  assert.ok(!command.args.join(" ").includes("GITHUB_TOKEN"));
});

test("passes the guarded environment to a fixed Node transport probe", () => {
  const variable = "MONEYFLOW_DISPATCHER_ENV_PROPAGATION_379_TEST_ONLY_7C6DB36E";
  const result = defaultRun(
    "node",
    ["-e", `process.stdout.write(process.env.${variable} ?? "")`],
    { env: { [variable]: "present", PATH: process.env.PATH } },
  );

  assert.equal(result.status, 0);
  assert.equal(result.stdout, "present");
});

test("retains a Codex-sized local log without marking the command as failed", () => {
  const result = defaultRun("node", [
    "-e",
    `process.stdout.write("x".repeat(${OUTPUT_LARGER_THAN_NODE_DEFAULT_BUFFER_BYTES}))`,
  ]);

  assert.equal(result.status, 0);
  assert.equal(result.stdout.length, OUTPUT_LARGER_THAN_NODE_DEFAULT_BUFFER_BYTES);
});

test("rejects executables outside the fixed dispatcher command set", () => {
  const result = defaultRun("bash", ["-c", "echo unsafe"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unsupported dispatcher executable/u);
});

test("fails closed when GitHub authentication or the main base is ambiguous", () => {
  const failedAuth = validatePrerequisites({
    run: () => ({ status: 1, stderr: "not authenticated", stdout: "" }),
    requestedRepo: "owner/repo",
  });
  assert.equal(failedAuth.ok, false);

  const ambiguousBase = validatePrerequisites({
    requestedRepo: "owner/repo",
    run: (command, args) => {
      const lookup = `${command} ${args.join(" ")}`;
      if (lookup === "gh auth status") return { status: 0, stdout: "", stderr: "" };
      if (lookup.includes("gh repo view")) {
        return {
          status: 0,
          stdout: JSON.stringify({ defaultBranchRef: { name: "main" }, nameWithOwner: "owner/repo" }),
          stderr: "",
        };
      }
      if (lookup === "git rev-parse origin/main") return { status: 0, stdout: "a".repeat(40), stderr: "" };
      if (lookup.includes("git ls-remote")) return { status: 0, stdout: `${"b".repeat(40)}\trefs/heads/main`, stderr: "" };
      throw new Error(`Unexpected command: ${lookup}`);
    },
  });
  assert.equal(ambiguousBase.ok, false);
});

test("accepts a matching local and remote main SHA", () => {
  const baseSha = "a".repeat(40);
  const result = validatePrerequisites({
    requestedRepo: "owner/repo",
    run: (command, args) => {
      const lookup = `${command} ${args.join(" ")}`;
      if (lookup === "gh auth status") return { status: 0, stdout: "", stderr: "" };
      if (lookup.includes("gh repo view")) {
        return {
          status: 0,
          stdout: JSON.stringify({ defaultBranchRef: { name: "main" }, nameWithOwner: "owner/repo" }),
          stderr: "",
        };
      }
      if (lookup === "git rev-parse origin/main") return { status: 0, stdout: baseSha, stderr: "" };
      if (lookup.includes("git ls-remote")) {
        return { status: 0, stdout: `${baseSha}\trefs/heads/main`, stderr: "" };
      }
      throw new Error(`Unexpected command: ${lookup}`);
    },
  });

  assert.deepEqual(result, { baseSha, ok: true, repo: "owner/repo" });
});

test("does not dispatch or post a result when prerequisites are unsafe", () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-dispatcher-"));
  let dispatched = false;
  try {
    const result = processCommand({
      command: { lane: "codex", note: "" },
      deps: {
        createWorktree: () => {
          dispatched = true;
        },
        postSummary: () => {
          dispatched = true;
        },
        run: () => ({ status: 1, stderr: "", stdout: "" }),
      },
      source,
      stateDir,
    });

    assert.equal(result.status, "blocked");
    assert.equal(dispatched, false);
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("suppresses an already executed command before creating another worktree", () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-dispatcher-"));
  let worktrees = 0;
  try {
    const prerequisites = { baseSha: "a".repeat(40), ok: true, repo: "owner/repo" };
    const deps = {
      createWorktree: () => {
        worktrees += 1;
      },
      postSummary: () => {},
      run: () => ({ status: 0, stderr: "", stdout: "completed locally" }),
      validatePrerequisites: () => prerequisites,
    };
    const first = processCommand({
      command: { lane: "codex", note: "" },
      deps,
      prerequisites,
      source,
      stateDir,
    });
    const second = processCommand({
      command: { lane: "codex", note: "" },
      deps,
      prerequisites,
      source,
      stateDir,
    });

    assert.equal(first.status, "completed");
    assert.equal(second.status, "duplicate");
    assert.equal(worktrees, 1);
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("keeps a body command identity when unrelated source prose changes", () => {
  const commandSource = {
    ...source,
    author: { login: "owner" },
    body: "/agent codex inspect the dispatcher\n\nInitial context.",
  };
  const editedSource = {
    ...commandSource,
    body: "/agent codex inspect the dispatcher\n\nInitial context with a clarified title.",
  };
  const run = () => ({ status: 0, stderr: "", stdout: "[]" });

  const original = commandsFromSource({
    repo: "owner/repo",
    run,
    source: commandSource,
    trustedAuthor: "owner",
  })[0];
  const edited = commandsFromSource({
    repo: "owner/repo",
    run,
    source: editedSource,
    trustedAuthor: "owner",
  })[0];

  assert.equal(
    commandIdFor({
      command: original.command,
      source: original.source,
      sourceKey: original.source.sourceKey,
    }),
    commandIdFor({
      command: edited.command,
      source: edited.source,
      sourceKey: edited.source.sourceKey,
    }),
    "unrelated body prose must not make the same marker runnable again",
  );
  assert.notEqual(
    commandIdFor({
      command: original.command,
      source: original.source,
      sourceKey: original.source.sourceKey,
    }),
    commandIdFor({
      command: { ...original.command, note: "inspect only" },
      source: original.source,
      sourceKey: original.source.sourceKey,
    }),
    "an explicit marker-note change must remain a new command",
  );
});

test("ignores fenced, blockquoted, and prose command examples", () => {
  const run = () => ({ status: 0, stderr: "", stdout: "[]" });
  const examples = [
    "```text\n/agent codex inspect the dispatcher\n```",
    "> /agent codex inspect the dispatcher",
    "Run this command to inspect the dispatcher:\n/agent codex inspect the dispatcher",
  ];

  for (const body of examples) {
    const commands = commandsFromSource({
      repo: "owner/repo",
      run,
      source: { ...source, author: { login: "owner" }, body },
      trustedAuthor: "owner",
    });
    assert.equal(commands.length, 0, body);
  }
});

test("revalidates main immediately before creating a worktree and uses the fresh SHA", () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-dispatcher-"));
  const initialBase = "a".repeat(40);
  const freshBase = "b".repeat(40);
  let createdBase = null;
  try {
    const result = processCommand({
      command: { lane: "codex", note: "" },
      deps: {
        createWorktree: ({ baseSha }) => {
          createdBase = baseSha;
        },
        postSummary: () => {},
        run: () => ({ status: 0, stderr: "", stdout: "" }),
        validatePrerequisites: () => ({ baseSha: freshBase, ok: true, repo: "owner/repo" }),
      },
      prerequisites: { baseSha: initialBase, ok: true, repo: "owner/repo" },
      source,
      stateDir,
    });

    assert.equal(result.status, "completed");
    assert.equal(createdBase, freshBase);
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("launches Codex through a guarded environment without token variables", () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-dispatcher-"));
  let environment;
  try {
    environment = buildGuardedEnvironment({
      commandId: "abcdef0123456789",
      environmentSource: {
        GH_ENTERPRISE_TOKEN: "secret",
        GH_TOKEN: "secret",
        GITHUB_ENTERPRISE_TOKEN: "secret",
        GITHUB_TOKEN: "secret",
        PATH: "/usr/bin",
      },
      stateDir,
    });
    assert.match(environment.PATH, /^.*guards.*:\/usr\/bin$/u);
    assert.equal(environment.GH_ENTERPRISE_TOKEN, undefined);
    assert.equal(environment.GH_TOKEN, undefined);
    assert.equal(environment.GITHUB_ENTERPRISE_TOKEN, undefined);
    assert.equal(environment.GITHUB_TOKEN, undefined);
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
  const command = buildCodexCommand({
    prompt: "Read AGENTS.md and inspect the task.",
    worktree: "/tmp/worktree",
    environment,
  });

  assert.deepEqual(command.env, environment);
});

test("blocks main, merge, force-push, and pull-request merge commands in the local guard", () => {
  assert.match(gitBoundaryViolation(["checkout", "main"]) ?? "", /main/u);
  assert.match(gitBoundaryViolation(["merge", "feature/other"]) ?? "", /merge/u);
  assert.match(gitBoundaryViolation(["-C", "/tmp/worktree", "merge", "feature/other"]) ?? "", /merge/u);
  assert.match(gitBoundaryViolation(["push", "--force", "origin", "HEAD"]) ?? "", /force/u);
  assert.match(ghBoundaryViolation(["pr", "merge", "379"]) ?? "", /merge/u);
  assert.equal(gitBoundaryViolation(["status"]), null);
  assert.equal(ghBoundaryViolation(["pr", "create", "--draft"]), null);
});

test("guard launchers invoke the guard for Git and GitHub CLI commands", () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-dispatcher-"));
  try {
    buildGuardedEnvironment({ commandId: "abcdef0123456789", stateDir });
    const guardDirectory = join(stateDir, "guards", "abcdef0123456789");
    const gitLauncher = readFileSync(join(guardDirectory, "git"), "utf8");
    const ghLauncher = readFileSync(join(guardDirectory, "gh"), "utf8");

    assert.match(gitLauncher, /command-guard\.mjs" "git"/u);
    assert.match(ghLauncher, /command-guard\.mjs" "gh"/u);
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("routes an owner comment marker from an issue through one cycle", () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-dispatcher-"));
  const baseSha = "a".repeat(40);
  const calls = [];
  try {
    const result = runCycle({
      options: { repo: "owner/repo", stateDir },
      run: (command, args) => {
        const lookup = `${command} ${args.join(" ")}`;
        calls.push(lookup);
        if (lookup === "gh auth status") return { status: 0, stderr: "", stdout: "" };
        if (lookup.includes("gh repo view")) {
          return {
            status: 0,
            stderr: "",
            stdout: JSON.stringify({ defaultBranchRef: { name: "main" }, nameWithOwner: "owner/repo" }),
          };
        }
        if (lookup === "git rev-parse origin/main") return { status: 0, stderr: "", stdout: baseSha };
        if (lookup.includes("git ls-remote")) {
          return { status: 0, stderr: "", stdout: `${baseSha}\trefs/heads/main` };
        }
        if (lookup === "gh api user --jq .login") return { status: 0, stderr: "", stdout: "owner" };
        if (lookup.includes("gh issue list")) {
          return { status: 0, stderr: "", stdout: JSON.stringify([{ ...source, author: { login: "owner" } }]) };
        }
        if (lookup.includes("gh pr list")) return { status: 0, stderr: "", stdout: "[]" };
        if (lookup.includes("repos/owner/repo/issues/375/comments")) {
          return {
            status: 0,
            stderr: "",
            stdout: JSON.stringify([{ body: "/agent codex", id: 1, user: { login: "owner" } }]),
          };
        }
        if (lookup.includes("git worktree add") || command === "codex") {
          return { status: 0, stderr: "", stdout: "" };
        }
        throw new Error(`Unexpected command: ${lookup}`);
      },
    });

    assert.equal(result.status, "ok");
    assert.equal(result.processed, 1, JSON.stringify({ calls, result }));
    assert.equal(result.results[0].status, "completed");
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("skips an unreadable source while dispatching commands from other sources", () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-dispatcher-"));
  const baseSha = "a".repeat(40);
  const unreadableSource = { ...source, number: 374, url: "https://github.com/owner/repo/issues/374" };
  try {
    const result = runCycle({
      options: { repo: "owner/repo", stateDir },
      run: (command, args) => {
        const lookup = `${command} ${args.join(" ")}`;
        if (lookup === "gh auth status") return { status: 0, stderr: "", stdout: "" };
        if (lookup.includes("gh repo view")) {
          return {
            status: 0,
            stderr: "",
            stdout: JSON.stringify({ defaultBranchRef: { name: "main" }, nameWithOwner: "owner/repo" }),
          };
        }
        if (lookup === "git rev-parse origin/main") return { status: 0, stderr: "", stdout: baseSha };
        if (lookup.includes("git ls-remote")) return { status: 0, stderr: "", stdout: `${baseSha}\trefs/heads/main` };
        if (lookup === "gh api user --jq .login") return { status: 0, stderr: "", stdout: "owner" };
        if (lookup.includes("gh issue list")) {
          return {
            status: 0,
            stderr: "",
            stdout: JSON.stringify([
              { ...unreadableSource, author: { login: "owner" } },
              { ...source, author: { login: "owner" } },
            ]),
          };
        }
        if (lookup.includes("gh pr list")) return { status: 0, stderr: "", stdout: "[]" };
        if (lookup.includes("issues/374/comments")) return { status: 1, stderr: "temporary API failure", stdout: "" };
        if (lookup.includes("issues/375/comments")) {
          return { status: 0, stderr: "", stdout: JSON.stringify([{ body: "/agent codex", id: 1, user: { login: "owner" } }]) };
        }
        if (lookup.includes("git worktree add") || command === "codex") return { status: 0, stderr: "", stdout: "" };
        throw new Error(`Unexpected command: ${lookup}`);
      },
    });

    assert.equal(result.status, "ok");
    assert.equal(result.processed, 1);
    assert.deepEqual(result.skippedSources, [{ number: 374, reason: "issue #374 comments failed" }]);
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("keeps issue entries while adding source kind", () => {
  const sources = listOpenSources({
    repo: "owner/repo",
    run: (command, args) => {
      const lookup = `${command} ${args.join(" ")}`;
      if (lookup.includes("gh issue list")) {
        return { status: 0, stderr: "", stdout: JSON.stringify([{ ...source, author: { login: "owner" } }]) };
      }
      if (lookup.includes("gh pr list")) return { status: 0, stderr: "", stdout: "[]" };
      throw new Error(`Unexpected command: ${lookup}`);
    },
  });

  assert.equal(sources.length, 1, JSON.stringify(sources));
  assert.equal(sources[0].number, 375);
});

test("recognizes an owner comment marker from the GitHub comments payload", () => {
  const commands = commandsFromSource({
    repo: "owner/repo",
    source: { ...source, author: { login: "owner" } },
    trustedAuthor: "owner",
    run: () => ({
      status: 0,
      stderr: "",
      stdout: JSON.stringify([{ body: "/agent codex", id: 1, user: { login: "owner" } }]),
    }),
  });

  assert.equal(commands.length, 1, JSON.stringify(commands));
  assert.deepEqual(commands[0].command, { lane: "codex", note: "" });
});
