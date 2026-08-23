import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import test from "node:test";

import {
  RunJournal,
  RunJournalError,
  parseRunJournal,
  projectRun,
  runJournalPath,
} from "./journal.mjs";

const commandId = "a".repeat(64);

test("appends contiguous immutable lifecycle events and replays terminal state", () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-harness-journal-"));
  try {
    let now = 100;
    const journal = new RunJournal({ stateDir, commandId, clock: () => now++ });
    journal.append("run/accepted", { provider: "codex" });
    journal.append("workspace/prepared", { branch: "agent/harness/test", worktree: "/tmp/test" });
    journal.append("agent/started", { provider: "codex" });
    journal.append("agent/settled", { provider: "codex", exitCode: 0, logFile: "logs/test.log" });
    journal.append("run/completed", { provider: "codex", exitCode: 0 });

    const replayed = parseRunJournal(readFileSync(runJournalPath(stateDir, commandId), "utf8"));
    assert.deepEqual(replayed.map((event) => event.seq), [0, 1, 2, 3, 4]);
    assert.deepEqual(replayed.map((event) => event.time), [100, 101, 102, 103, 104]);
    assert.deepEqual(projectRun(replayed), {
      status: "completed",
      terminal: true,
      provider: "codex",
      branch: "agent/harness/test",
      worktree: "/tmp/test",
      exitCode: 0,
      logFile: "logs/test.log",
    });
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("accepted non-terminal history projects as interrupted and is not terminal", () => {
  const events = parseRunJournal(
    `${JSON.stringify({ version: 1, seq: 0, time: 1, type: "run/accepted", data: { provider: "codex" } })}\n`,
  );
  assert.deepEqual(projectRun(events), {
    status: "interrupted",
    terminal: false,
    provider: null,
    branch: null,
    worktree: null,
    exitCode: null,
    logFile: null,
  });
});

test("malformed sequence numbers fail closed", () => {
  const malformed = `${JSON.stringify({ version: 1, seq: 1, time: 1, type: "run/accepted", data: {} })}\n`;
  assert.throws(
    () => parseRunJournal(malformed),
    (error) => error instanceof RunJournalError && error.code === "MALFORMED_JOURNAL",
  );
});

test("terminal journals refuse later writes", () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-harness-journal-"));
  try {
    const journal = new RunJournal({ stateDir, commandId });
    journal.append("run/accepted", {});
    journal.append("run/failed", { reason: "test" });
    assert.throws(
      () => journal.append("summary/posted", {}),
      (error) => error instanceof RunJournalError && error.code === "RUN_TERMINAL",
    );
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("a corrupt stored journal cannot be treated as unseen", () => {
  const stateDir = mkdtempSync(join(tmpdir(), "moneyflow-harness-journal-"));
  try {
    const path = runJournalPath(stateDir, commandId);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "not-json\n");
    assert.throws(
      () => new RunJournal({ stateDir, commandId }),
      (error) => error instanceof RunJournalError && error.code === "MALFORMED_JOURNAL",
    );
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});
