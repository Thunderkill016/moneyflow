import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { RunJournal } from "./journal.mjs";
import { migrateLegacyDispatcherState } from "./legacy-migration.mjs";
import {
  buildTaskPrompt,
  commandIdFor,
  compactError,
} from "./providers.mjs";

export const DEFAULT_HARNESS_STATE_DIR = ".agent-harness";
export const DEFAULT_LEGACY_DISPATCHER_STATE_DIR = ".agent-dispatcher";
const REQUIRED_AGENT_CAPABILITIES = Object.freeze([
  "isolatedWorkspace",
  "guardedEnvironment",
]);

function privateLogPath(stateDir, commandId) {
  return join(stateDir, "logs", `${commandId}.log`);
}

function writePrivateLog(stateDir, commandId, result) {
  const directory = join(stateDir, "logs");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = privateLogPath(stateDir, commandId);
  writeFileSync(path, `${result.stdout ?? ""}${result.stderr ?? ""}`, { mode: 0o600 });
  return `logs/${commandId}.log`;
}

function assertRunHandle(handle) {
  if (
    !handle ||
    !(handle.result instanceof Promise) ||
    typeof handle.cancel !== "function" ||
    typeof handle.dispose !== "function"
  ) {
    throw new TypeError("agent provider must return { result: Promise, cancel(), dispose() }");
  }
  return handle;
}

export function assertAgentProviderCapabilities(provider, providerName) {
  const missing = REQUIRED_AGENT_CAPABILITIES.filter(
    (capability) => provider?.capabilities?.[capability] !== true,
  );
  if (missing.length > 0) {
    throw new Error(
      `agent provider '${providerName}' lacks required capability: ${missing.join(", ")}`,
    );
  }
  if (typeof provider.start !== "function") {
    throw new Error(`agent provider '${providerName}' does not implement start()`);
  }
  return provider;
}

export async function processHarnessCommand({
  ctx,
  command,
  source,
  stateDir = DEFAULT_HARNESS_STATE_DIR,
  prerequisites = null,
  signal = undefined,
}) {
  const sourceProvider = ctx.resolve("source", "github");
  const workspaceProvider = ctx.resolve("workspace", "local");
  const permissionProvider = ctx.resolve("permission", "guarded");
  const agentProvider = assertAgentProviderCapabilities(
    ctx.resolve("agent", command.provider),
    command.provider,
  );
  const sourceKey = source.sourceKey ?? "body";
  const commandId = commandIdFor({ source, command, sourceKey });
  const journal = new RunJournal({ stateDir, commandId });
  const existing = journal.projection();

  if (existing.terminal) {
    return Object.freeze({ status: "duplicate", commandId, priorStatus: existing.status });
  }
  if (existing.status === "interrupted" || existing.status === "observed") {
    return Object.freeze({
      status: "blocked",
      commandId,
      reason:
        "a non-terminal journal already exists; automatic replay is forbidden because prior side effects are ambiguous",
    });
  }

  const initial = prerequisites ?? workspaceProvider.check();
  if (!initial.ok) return Object.freeze({ status: "blocked", reason: initial.reason });

  let runHandle = null;
  let terminalWritten = false;
  try {
    journal.append("run/accepted", {
      provider: command.provider,
      source: {
        kind: source.kind,
        number: source.number,
        sourceKey,
        url: source.url,
      },
    });

    // Re-read remote main immediately before the first workspace mutation.
    const fresh = workspaceProvider.check({ requestedRepo: initial.repo });
    if (!fresh.ok) throw new Error(fresh.reason);
    if (fresh.repo !== initial.repo) throw new Error("Repository identity changed before workspace creation");

    const isolation = workspaceProvider.prepare({
      commandId,
      source,
      stateDir,
      baseSha: fresh.baseSha,
    });
    journal.append("workspace/prepared", {
      baseSha: fresh.baseSha,
      branch: isolation.branch,
      worktree: isolation.worktree,
    });

    const environment = permissionProvider.prepare({ commandId, stateDir });
    const prompt = buildTaskPrompt({ command, source });
    runHandle = assertRunHandle(
      agentProvider.start({
        prompt,
        worktree: isolation.worktree,
        environment,
        signal,
      }),
    );
    journal.append("agent/started", { provider: command.provider });

    const result = await runHandle.result;
    await runHandle.dispose();
    runHandle = null;

    const logFile = writePrivateLog(stateDir, commandId, result);
    journal.append("agent/settled", {
      provider: command.provider,
      exitCode: Number.isInteger(result.exitCode) ? result.exitCode : 1,
      stopReason: result.stopReason ?? "error",
      logFile,
    });

    const status = result.exitCode === 0 && result.stopReason === "completed" ? "completed" : "failed";
    sourceProvider.postSummary({
      repo: initial.repo,
      source: { ...source, commandProvider: command.provider },
      status,
    });
    journal.append("summary/posted", { status });
    journal.append(status === "completed" ? "run/completed" : "run/failed", {
      provider: command.provider,
      exitCode: Number.isInteger(result.exitCode) ? result.exitCode : 1,
    });
    terminalWritten = true;

    return Object.freeze({
      status,
      commandId,
      isolation,
      provider: command.provider,
      logFile,
    });
  } catch (error) {
    if (runHandle) {
      try {
        runHandle.cancel("harness failure");
        await runHandle.dispose();
      } catch {
        // Preserve the primary failure. A run without a terminal journal would
        // be ambiguous, so the terminal write below remains mandatory.
      }
    }
    const reason = compactError(error);
    if (!terminalWritten && !journal.projection().terminal) {
      journal.append("run/failed", { provider: command.provider, reason });
      terminalWritten = true;
    }
    try {
      sourceProvider.postSummary({
        repo: initial.repo,
        source: { ...source, commandProvider: command.provider },
        status: "failed",
      });
    } catch {
      // Detailed diagnostics stay local; summary posting is not allowed to
      // replace the primary failure or expose agent output.
    }
    return Object.freeze({ status: "failed", commandId, reason });
  }
}

export async function runHarnessCycle({
  ctx,
  requestedRepo = null,
  stateDir = DEFAULT_HARNESS_STATE_DIR,
  legacyStateDir = DEFAULT_LEGACY_DISPATCHER_STATE_DIR,
  signal = undefined,
}) {
  const workspaceProvider = ctx.resolve("workspace", "local");
  const sourceProvider = ctx.resolve("source", "github");

  try {
    // Migrate identity before source discovery so old completed/failed/running
    // commands cannot be rediscovered and executed as if v2 had never seen them.
    migrateLegacyDispatcherState({ legacyStateDir, stateDir });
  } catch (error) {
    return Object.freeze({
      status: "blocked",
      reason: compactError(error),
      processed: 0,
    });
  }

  const prerequisites = workspaceProvider.check({ requestedRepo });
  if (!prerequisites.ok) {
    return Object.freeze({ status: "blocked", reason: prerequisites.reason, processed: 0 });
  }

  try {
    const trustedAuthor = sourceProvider.currentUser();
    const sources = sourceProvider.listOpenSources({ repo: prerequisites.repo });
    const queued = [];
    const skippedSources = [];

    for (const source of sources) {
      try {
        queued.push(
          ...sourceProvider.commandsFromSource({
            repo: prerequisites.repo,
            source,
            trustedAuthor,
          }),
        );
      } catch (error) {
        skippedSources.push({ number: source.number, reason: compactError(error) });
      }
    }

    if (sources.length > 0 && skippedSources.length === sources.length) {
      return Object.freeze({
        status: "blocked",
        reason: "Every open source could not be read",
        processed: 0,
        skippedSources,
      });
    }

    const results = [];
    for (const entry of queued) {
      if (signal?.aborted) break;
      try {
        results.push(
          await processHarnessCommand({
            ctx,
            command: entry.command,
            source: entry.source,
            stateDir,
            prerequisites,
            signal,
          }),
        );
      } catch (error) {
        // One malformed/unknown provider command must not starve unrelated
        // owner-authored commands discovered in the same poll cycle. Because
        // capability negotiation happens before run acceptance, this contained
        // result cannot hide a partially-started execution.
        results.push(
          Object.freeze({
            status: "blocked",
            provider: entry.command.provider,
            source: Object.freeze({
              kind: entry.source.kind,
              number: entry.source.number,
              sourceKey: entry.source.sourceKey ?? "body",
            }),
            reason: compactError(error),
          }),
        );
      }
    }

    return Object.freeze({
      status: "ok",
      processed: results.length,
      results: Object.freeze(results),
      skippedSources: Object.freeze(skippedSources),
    });
  } catch (error) {
    return Object.freeze({
      status: "blocked",
      reason: compactError(error),
      processed: 0,
    });
  }
}