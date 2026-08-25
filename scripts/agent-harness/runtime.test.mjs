import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { HarnessContext } from "./context.mjs";
import { RunJournal } from "./journal.mjs";
import { commandIdFor } from "./providers.mjs";
import { processHarnessCommand, runHarnessCycle } from "./runtime.mjs";

const source = {
  author: { login: "owner" },
  body: "/agent codex inspect",
  kind: "issue",
  number: 446,
  sourceKey: "body",
  title: "Harness v2",
  url: "https://github.com/owner/repo/issues/446",
};
const command = { provider: "codex", note: "inspect" };
const baseSha = "a".repeat(40);

function createTestContext({ result = { exitCode: 0, stdout: "ok", stderr: "", stopReason: "completed" } } = {}) {
  const ctx = new HarnessContext();
  const calls = {
    checks: 0,
    providerChecks: 0,
    workspaces: 0,
    permissions: 0,
    starts: 0,
    cancels: 0,
    disposes: 0,
    deliveries: [],
    summaries: [],
  };
  ctx.provide("source", "github", {
    postSummary({ status }) {
      calls.summaries.push(status);
    },
  });
  ctx.provide("workspace", "local", {
    check() {
      calls.checks += 1;
      return { ok: true, repo: "owner/repo", baseSha };
    },
    prepare({ commandId }) {
      calls.workspaces += 1;
      return {
        branch: `agent/harness/issue-446-${commandId.slice(0, 8)}`,
        worktree: `/tmp/${commandId.slice(0, 8)}`,
      };
    },
  });
  ctx.provide("permission", "guarded", {
    prepare() {
      calls.permissions += 1;
      return { PATH: "/guarded" };
    },
  });
  ctx.provide("agent", "codex", {
    capabilities: {
      isolatedWorkspace: true,
      guardedEnvironment: true,
    },
    check() {
      calls.providerChecks += 1;
      return { ok: true };
    },
    start() {
      calls.starts += 1;
      return {
        result: Promise.resolve(result),
        cancel() {
          calls.cancels += 1;
        },
        async dispose() {
          calls.disposes += 1;
        },
      };
    },
  });
  return { ctx, calls };
}

test("one accepted command executes through seams and later replays as duplicate", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-harness-runtime-"));
  const { ctx, calls } = createTestContext();
  try {
    const first = await processHarnessCommand({ ctx, command, source, stateDir });
    const second = await processHarnessCommand({ ctx, command, source, stateDir });

    assert.equal(first.status, "completed");
    assert.equal(second.status, "duplicate");
    assert.equal(second.priorStatus, "completed");
    assert.equal(calls.providerChecks, 2);
    assert.equal(calls.workspaces, 1);
    assert.equal(calls.permissions, 1);
    assert.equal(calls.starts, 1);
    assert.equal(calls.disposes, 1);
    assert.deepEqual(calls.summaries, ["completed"]);
    assert.match(readFileSync(join(stateDir, first.logFile), "utf8"), /^ok/u);
  } finally {
    await ctx.dispose();
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("an owner-opted run delegates delivery to the host after the guarded worker succeeds", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-harness-runtime-"));
  const { ctx, calls } = createTestContext();
  ctx.provide("delivery", "github", {
    deliver(request) {
      calls.deliveries.push(request);
      return { status: "merged", pullRequest: 447 };
    },
  });
  try {
    const result = await processHarnessCommand({
      ctx,
      command: { provider: "codex", note: "verify", autoMerge: true },
      source,
      stateDir,
    });

    assert.equal(result.status, "merged");
    assert.equal(calls.starts, 1);
    assert.equal(calls.deliveries.length, 1);
    assert.equal(calls.deliveries[0].repo, "owner/repo");
    assert.equal(calls.deliveries[0].baseSha, baseSha);
    assert.deepEqual(calls.summaries, ["merged"]);
  } finally {
    await ctx.dispose();
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("a prior interrupted journal is never silently rerun", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-harness-runtime-"));
  const { ctx, calls } = createTestContext();
  try {
    const commandId = commandIdFor({ source, command, sourceKey: "body" });
    new RunJournal({ stateDir, commandId }).append("run/accepted", {
      provider: "codex",
      source: { kind: "issue", number: 446, sourceKey: "body" },
    });

    const result = await processHarnessCommand({ ctx, command, source, stateDir });
    assert.equal(result.status, "blocked");
    assert.match(result.reason, /automatic replay is forbidden/u);
    assert.equal(calls.providerChecks, 1);
    assert.equal(calls.workspaces, 0);
    assert.equal(calls.starts, 0);
  } finally {
    await ctx.dispose();
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("agent provider failure is terminal and is not automatically retried", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-harness-runtime-"));
  const { ctx, calls } = createTestContext({
    result: { exitCode: 1, stdout: "", stderr: "failed", stopReason: "error" },
  });
  try {
    const first = await processHarnessCommand({ ctx, command, source, stateDir });
    const second = await processHarnessCommand({ ctx, command, source, stateDir });

    assert.equal(first.status, "failed");
    assert.equal(second.status, "duplicate");
    assert.equal(second.priorStatus, "failed");
    assert.equal(calls.providerChecks, 2);
    assert.equal(calls.starts, 1);
    assert.equal(calls.disposes, 1);
    assert.deepEqual(calls.summaries, ["failed"]);
  } finally {
    await ctx.dispose();
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("missing agent providers fail loudly before workspace mutation", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-harness-runtime-"));
  const { ctx, calls } = createTestContext();
  try {
    await assert.rejects(
      processHarnessCommand({
        ctx,
        command: { provider: "missing", note: "" },
        source,
        stateDir,
      }),
      /provider is unavailable: agent\/missing/u,
    );
    assert.equal(calls.workspaces, 0);
  } finally {
    await ctx.dispose();
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("under-capable agent providers fail before journal or workspace mutation", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-harness-runtime-"));
  const { ctx, calls } = createTestContext();
  ctx.provide("agent", "unsafe", {
    capabilities: { isolatedWorkspace: true, guardedEnvironment: false },
    start() {
      throw new Error("must never start");
    },
  });
  try {
    await assert.rejects(
      processHarnessCommand({
        ctx,
        command: { provider: "unsafe", note: "" },
        source,
        stateDir,
      }),
      /lacks required capability: guardedEnvironment/u,
    );
    assert.equal(calls.workspaces, 0);
    assert.equal(calls.permissions, 0);
    const commandId = commandIdFor({
      source,
      command: { provider: "unsafe", note: "" },
      sourceKey: "body",
    });
    assert.equal(new RunJournal({ stateDir, commandId }).events().length, 0);
  } finally {
    await ctx.dispose();
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("provider readiness failure is rejected before journal or workspace mutation", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-harness-runtime-"));
  const { ctx, calls } = createTestContext();
  const unavailableCommand = { provider: "unavailable", note: "" };
  ctx.provide("agent", "unavailable", {
    capabilities: { isolatedWorkspace: true, guardedEnvironment: true },
    check() {
      return { ok: false, reason: "provider binary unavailable" };
    },
    start() {
      throw new Error("must never start");
    },
  });
  try {
    await assert.rejects(
      processHarnessCommand({ ctx, command: unavailableCommand, source, stateDir }),
      /agent provider 'unavailable' is not ready: provider binary unavailable/u,
    );
    assert.equal(calls.workspaces, 0);
    assert.equal(calls.permissions, 0);
    const commandId = commandIdFor({
      source,
      command: unavailableCommand,
      sourceKey: "body",
    });
    assert.equal(new RunJournal({ stateDir, commandId }).events().length, 0);
  } finally {
    await ctx.dispose();
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("fresh main is revalidated immediately before workspace creation", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-harness-runtime-"));
  const { ctx, calls } = createTestContext();
  let preparedBase = null;
  let check = 0;
  ctx.resolve("workspace", "local").check = () => {
    check += 1;
    return {
      ok: true,
      repo: "owner/repo",
      baseSha: check === 1 ? "a".repeat(40) : "b".repeat(40),
    };
  };
  ctx.resolve("workspace", "local").prepare = ({ baseSha, commandId }) => {
    calls.workspaces += 1;
    preparedBase = baseSha;
    return { branch: `agent/harness/${commandId.slice(0, 8)}`, worktree: "/tmp/worktree" };
  };
  try {
    const result = await processHarnessCommand({ ctx, command, source, stateDir });
    assert.equal(result.status, "completed");
    assert.equal(preparedBase, "b".repeat(40));
    assert.equal(check, 2);
  } finally {
    await ctx.dispose();
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("one unknown provider command cannot starve a valid command in the same cycle", async () => {
  const root = mkdtempSync(join(tmpdir(), "moneyflow-harness-cycle-"));
  const stateDir = join(root, ".agent-harness");
  const legacyStateDir = join(root, ".agent-dispatcher");
  const { ctx, calls } = createTestContext();
  const sourceProvider = ctx.resolve("source", "github");
  sourceProvider.currentUser = () => "owner";
  sourceProvider.listOpenSources = () => [source];
  sourceProvider.commandsFromSource = () => [
    {
      command: { provider: "missing", note: "bad" },
      source: { ...source, sourceKey: "comment:1" },
    },
    {
      command,
      source: { ...source, sourceKey: "body" },
    },
  ];

  try {
    const result = await runHarnessCycle({
      ctx,
      stateDir,
      legacyStateDir,
    });

    assert.equal(result.status, "ok");
    assert.equal(result.processed, 2);
    assert.equal(result.results[0].status, "blocked");
    assert.match(result.results[0].reason, /provider is unavailable: agent\/missing/u);
    assert.equal(result.results[1].status, "completed");
    assert.equal(calls.providerChecks, 1);
    assert.equal(calls.starts, 1);
    assert.equal(calls.workspaces, 1);
  } finally {
    await ctx.dispose();
    rmSync(root, { recursive: true, force: true });
  }
});
