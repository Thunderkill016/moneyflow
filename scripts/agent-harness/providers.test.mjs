import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import * as providers from "./providers.mjs";
import {
  buildIsolation,
  commandIdFor,
  createCodexAgentProvider,
  createGithubSourceProvider,
  createGuardedPermissionProvider,
  createLocalWorkspaceProvider,
  defaultCommandRun,
  parseAgentCommand,
  startOwnedProcess,
} from "./providers.mjs";

const source = {
  author: { login: "owner" },
  body: "/agent codex inspect the harness",
  kind: "issue",
  number: 446,
  title: "Harness v2",
  url: "https://github.com/owner/repo/issues/446",
};

test("parses provider-neutral agent markers", () => {
  assert.deepEqual(parseAgentCommand("/agent codex verify"), {
    provider: "codex",
    note: "verify",
  });
  assert.deepEqual(parseAgentCommand("/agent claude-review inspect"), {
    provider: "claude-review",
    note: "inspect",
  });
  assert.throws(() => parseAgentCommand("please run codex"), /Missing command marker/u);
});

test("parses owner opt-in auto-merge separately from the task note", () => {
  assert.deepEqual(parseAgentCommand("/agent codex --automerge verify the import flow"), {
    provider: "codex",
    note: "verify the import flow",
    autoMerge: true,
  });
});

test("GitHub source provider trusts only the current owner marker and ignores examples", () => {
  const run = (command, args) => {
    const lookup = `${command} ${args.join(" ")}`;
    if (lookup.includes("/comments --paginate")) return { status: 0, stdout: "[]", stderr: "" };
    throw new Error(`Unexpected command: ${lookup}`);
  };
  const provider = createGithubSourceProvider({ run });

  assert.equal(
    provider.commandsFromSource({ repo: "owner/repo", source, trustedAuthor: "owner" })[0].command.provider,
    "codex",
  );
  for (const body of [
    "```text\n/agent codex inspect\n```",
    "> /agent codex inspect",
    "Example:\n/agent codex inspect",
  ]) {
    assert.equal(
      provider.commandsFromSource({
        repo: "owner/repo",
        source: { ...source, body },
        trustedAuthor: "owner",
      }).length,
      0,
    );
  }
  assert.equal(
    provider.commandsFromSource({
      repo: "owner/repo",
      source: { ...source, author: { login: "stranger" } },
      trustedAuthor: "owner",
    }).length,
    0,
  );
});

test("command identity changes only when the marker identity changes", () => {
  const command = { provider: "codex", note: "inspect" };
  const first = commandIdFor({ source, command, sourceKey: "body" });
  const proseEdited = commandIdFor({
    source: { ...source, title: "Harness v2 clarified" },
    command,
    sourceKey: "body",
  });
  const providerChanged = commandIdFor({
    source,
    command: { provider: "claude-review", note: "inspect" },
    sourceKey: "body",
  });
  assert.equal(first, proseEdited);
  assert.notEqual(first, providerChanged);
});

test("auto-merge opt-in changes the durable command identity", () => {
  const ordinary = commandIdFor({
    source,
    command: { provider: "codex", note: "verify the import flow" },
    sourceKey: "body",
  });
  const autoMerge = commandIdFor({
    source,
    command: { provider: "codex", note: "verify the import flow", autoMerge: true },
    sourceKey: "body",
  });
  assert.notEqual(ordinary, autoMerge);
});

test("ordinary commands retain their pre-auto-merge identity to prevent replay", () => {
  const ordinary = { provider: "codex", note: "verify the import flow" };
  const expectedLegacyIdentity = [
    source.kind,
    source.number,
    "body",
    ordinary.provider,
    ordinary.note,
  ].join("\n");
  const expected = createHash("sha256").update(expectedLegacyIdentity).digest("hex");
  assert.equal(commandIdFor({ source, command: ordinary, sourceKey: "body" }), expected);
});

test("host delivery marks only its draft PR ready and performs an exact-head squash merge", () => {
  const runBaseSha = "a".repeat(40);
  const headRefOid = "c".repeat(40);
  const calls = [];
  const run = (executable, args) => {
    calls.push([executable, args]);
    const command = args.join(" ");
    if (command.includes("pr list")) {
      return {
        status: 0,
        stdout: JSON.stringify([
          { number: 447, isDraft: true, headRefOid, baseRefOid: runBaseSha, mergeStateStatus: "CLEAN" },
        ]),
        stderr: "",
      };
    }
    if (command.includes("pr ready")) return { status: 0, stdout: "", stderr: "" };
    if (command.includes("pr checks")) {
      return { status: 0, stdout: JSON.stringify([{ name: "verify", bucket: "pass" }]), stderr: "" };
    }
    if (command.includes("pr view")) {
      return {
        status: 0,
        stdout: JSON.stringify({
          number: 447,
          isDraft: false,
          headRefOid,
          baseRefOid: runBaseSha,
          mergeStateStatus: "CLEAN",
          reviewDecision: "",
        }),
        stderr: "",
      };
    }
    if (command.includes("ls-remote origin refs/heads/main")) {
      return { status: 0, stdout: `${runBaseSha}\trefs/heads/main\n`, stderr: "" };
    }
    if (command.includes("api graphql")) {
      return {
        status: 0,
        stdout: JSON.stringify({ data: { repository: { pullRequest: { reviewThreads: { nodes: [] } } } } }),
        stderr: "",
      };
    }
    if (command.includes("pulls/447/merge")) {
      return { status: 0, stdout: JSON.stringify({ merged: true, sha: "d".repeat(40) }), stderr: "" };
    }
    throw new Error(`Unexpected command: ${executable} ${command}`);
  };
  const delivery = providers.createGithubDeliveryProvider({ run });

  const result = delivery.deliver({
    repo: "owner/repo",
    isolation: { branch: "agent/harness/issue-446-aaaaaaaa" },
    baseSha: runBaseSha,
  });

  assert.deepEqual(result, { status: "merged", pullRequest: 447, mergeCommit: "d".repeat(40) });
  const merge = calls.find(([, args]) => args.join(" ").includes("pulls/447/merge"));
  assert.ok(merge, "host must issue the merge request");
  assert.ok(merge[1].includes(`sha=${headRefOid}`));
  assert.ok(merge[1].includes("merge_method=squash"));
});

test("host delivery refuses a changed main without issuing a merge request", () => {
  const runBaseSha = "a".repeat(40);
  const changedMainSha = "b".repeat(40);
  const headRefOid = "c".repeat(40);
  const calls = [];
  const run = (executable, args) => {
    calls.push([executable, args]);
    const command = args.join(" ");
    if (command.includes("pr list")) {
      return { status: 0, stdout: JSON.stringify([{ number: 447, isDraft: true, headRefOid, baseRefOid: runBaseSha }]), stderr: "" };
    }
    if (command.includes("pr ready")) return { status: 0, stdout: "", stderr: "" };
    if (command.includes("pr checks")) return { status: 0, stdout: JSON.stringify([{ name: "verify", bucket: "pass" }]), stderr: "" };
    if (command.includes("pr view")) {
      return {
        status: 0,
        stdout: JSON.stringify({ number: 447, isDraft: false, headRefOid, baseRefOid: runBaseSha, mergeStateStatus: "CLEAN", reviewDecision: "" }),
        stderr: "",
      };
    }
    if (command.includes("ls-remote origin refs/heads/main")) {
      return { status: 0, stdout: `${changedMainSha}\trefs/heads/main\n`, stderr: "" };
    }
    throw new Error(`Unexpected command: ${executable} ${command}`);
  };

  assert.throws(
    () => providers.createGithubDeliveryProvider({ run }).deliver({
      repo: "owner/repo",
      isolation: { branch: "agent/harness/issue-446-aaaaaaaa" },
      baseSha: runBaseSha,
    }),
    /Main changed/u,
  );
  assert.equal(calls.some(([, args]) => args.join(" ").includes("/merge")), false);
});

test("host delivery refuses an unresolved review thread without issuing a merge request", () => {
  const runBaseSha = "a".repeat(40);
  const headRefOid = "c".repeat(40);
  const calls = [];
  const run = (executable, args) => {
    calls.push([executable, args]);
    const command = args.join(" ");
    if (command.includes("pr list")) {
      return { status: 0, stdout: JSON.stringify([{ number: 447, isDraft: true, headRefOid, baseRefOid: runBaseSha }]), stderr: "" };
    }
    if (command.includes("pr ready")) return { status: 0, stdout: "", stderr: "" };
    if (command.includes("pr checks")) return { status: 0, stdout: JSON.stringify([{ name: "verify", bucket: "pass" }]), stderr: "" };
    if (command.includes("pr view")) {
      return {
        status: 0,
        stdout: JSON.stringify({ number: 447, isDraft: false, headRefOid, baseRefOid: runBaseSha, mergeStateStatus: "CLEAN", reviewDecision: "" }),
        stderr: "",
      };
    }
    if (command.includes("ls-remote origin refs/heads/main")) {
      return { status: 0, stdout: `${runBaseSha}\trefs/heads/main\n`, stderr: "" };
    }
    if (command.includes("api graphql")) {
      return {
        status: 0,
        stdout: JSON.stringify({ data: { repository: { pullRequest: { reviewThreads: { nodes: [{ isResolved: false }] } } } } }),
        stderr: "",
      };
    }
    throw new Error(`Unexpected command: ${executable} ${command}`);
  };

  assert.throws(
    () => providers.createGithubDeliveryProvider({ run }).deliver({
      repo: "owner/repo",
      isolation: { branch: "agent/harness/issue-446-aaaaaaaa" },
      baseSha: runBaseSha,
    }),
    /review threads/u,
  );
  assert.equal(calls.some(([, args]) => args.join(" ").includes("/merge")), false);
});

test("workspace provider fails closed when local and remote main differ", () => {
  const run = (command, args) => {
    const lookup = `${command} ${args.join(" ")}`;
    if (lookup === "gh auth status") return { status: 0, stdout: "", stderr: "" };
    if (lookup.includes("gh repo view")) {
      return {
        status: 0,
        stdout: JSON.stringify({ nameWithOwner: "owner/repo", defaultBranchRef: { name: "main" } }),
        stderr: "",
      };
    }
    if (lookup === "git rev-parse origin/main") return { status: 0, stdout: "a".repeat(40), stderr: "" };
    if (lookup.includes("git ls-remote")) return { status: 0, stdout: `${"b".repeat(40)}\trefs/heads/main`, stderr: "" };
    throw new Error(`Unexpected command: ${lookup}`);
  };
  assert.equal(createLocalWorkspaceProvider({ run }).check({ requestedRepo: "owner/repo" }).ok, false);
});

test("isolated workspaces are non-main and stable for one command id", () => {
  const isolation = buildIsolation({
    commandId: "a".repeat(64),
    source,
    stateDir: ".agent-harness",
  });
  assert.equal(isolation.branch, "agent/harness/issue-446-aaaaaaaa");
  assert.notEqual(isolation.branch, "main");
  assert.match(isolation.worktree, /worktrees\/issue-446-aaaaaaaa$/u);
});

test("guarded permission provider strips GitHub tokens and owns Git/GH launchers", () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-harness-guard-"));
  const commandId = "a".repeat(64);
  try {
    const provider = createGuardedPermissionProvider({
      environmentSource: {
        GH_ENTERPRISE_TOKEN: "secret",
        GH_TOKEN: "secret",
        GITHUB_ENTERPRISE_TOKEN: "secret",
        GITHUB_TOKEN: "secret",
        PATH: process.env.PATH,
      },
    });
    const environment = provider.prepare({ commandId, stateDir });
    assert.equal(environment.GH_ENTERPRISE_TOKEN, undefined);
    assert.equal(environment.GH_TOKEN, undefined);
    assert.equal(environment.GITHUB_ENTERPRISE_TOKEN, undefined);
    assert.equal(environment.GITHUB_TOKEN, undefined);
    assert.match(environment.PATH, /guards/u);

    const guardDirectory = join(stateDir, "guards", commandId);
    assert.match(readFileSync(join(guardDirectory, "git"), "utf8"), /agent-harness\/command-guard\.mjs/u);
    assert.match(readFileSync(join(guardDirectory, "gh"), "utf8"), /agent-harness\/command-guard\.mjs/u);
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("owned process cancellation escalates from SIGTERM to SIGKILL before settlement", async () => {
  class FakeChild extends EventEmitter {
    stdout = new EventEmitter();
    stderr = new EventEmitter();
    signals = [];

    kill(signal) {
      this.signals.push(signal);
      return true;
    }
  }

  const child = new FakeChild();
  const handle = startOwnedProcess({
    command: "codex",
    args: [],
    cwd: "/tmp",
    env: {},
    spawnProcess: () => child,
    killGraceMs: 5,
  });

  handle.cancel("test cancellation");
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(child.signals, ["SIGTERM", "SIGKILL"]);

  child.emit("close", null, "SIGKILL");
  const result = await handle.result;
  assert.equal(result.stopReason, "error");
  assert.match(result.stderr, /test cancellation/u);
  await handle.dispose();
});

test("Codex is one replaceable agent provider behind the common run-handle contract", async () => {
  let request;
  const handle = {
    result: Promise.resolve({ exitCode: 0, stdout: "ok", stderr: "", stopReason: "completed" }),
    cancel() {},
    async dispose() {},
  };
  const provider = createCodexAgentProvider({
    startProcess: (value) => {
      request = value;
      return handle;
    },
  });
  assert.equal(
    provider.start({
      prompt: "inspect",
      worktree: "/tmp/worktree",
      environment: { PATH: "/bin" },
    }),
    handle,
  );
  assert.equal(request.command, "codex");
  assert.deepEqual(request.args.slice(0, 4), ["--approve-for-me", "exec", "--cd", "/tmp/worktree"]);
});

test("fixed synchronous command runner refuses arbitrary executables", () => {
  const result = defaultCommandRun("bash", ["-c", "echo unsafe"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unsupported harness executable/u);
});
