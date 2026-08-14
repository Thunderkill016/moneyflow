import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildCodexCommand,
  buildIsolation,
  commandIdFor,
  commandsFromSource,
  loadState,
  listOpenSources,
  parseAgentCommand,
  parseDispatcherArgs,
  processCommand,
  runCycle,
  saveState,
  validatePrerequisites,
} from "./dispatcher.mjs";

const source = {
  author: "owner",
  body: "## Goal\n\nCheck the repository only.",
  kind: "issue",
  number: 375,
  title: "Dispatcher v1",
  url: "https://github.com/owner/repo/issues/375",
};

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
