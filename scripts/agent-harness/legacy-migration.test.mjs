import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { RunJournal } from "./journal.mjs";
import {
  LegacyDispatcherMigrationError,
  migrateLegacyDispatcherState,
} from "./legacy-migration.mjs";

const completedId = "a".repeat(64);
const failedId = "b".repeat(64);
const runningId = "c".repeat(64);

function writeLegacy(root, state) {
  const legacy = join(root, ".agent-dispatcher");
  mkdirSync(legacy, { recursive: true });
  writeFileSync(join(legacy, "state.json"), `${JSON.stringify(state, null, 2)}\n`);
  return legacy;
}

test("migrates completed failed and running identities without replay ambiguity", () => {
  const root = mkdtempSync(join(tmpdir(), "moneyflow-legacy-migration-"));
  try {
    const legacyStateDir = writeLegacy(root, {
      version: 1,
      commands: {
        [completedId]: { branch: "agent/dispatcher/completed", status: "completed" },
        [failedId]: { branch: "agent/dispatcher/failed", status: "failed" },
        [runningId]: { branch: "agent/dispatcher/running", status: "running" },
      },
    });
    const stateDir = join(root, ".agent-harness");
    const result = migrateLegacyDispatcherState({ legacyStateDir, stateDir });

    assert.deepEqual(result, { found: true, migrated: 3, skipped: 0 });
    assert.equal(new RunJournal({ stateDir, commandId: completedId }).projection().status, "completed");
    assert.equal(new RunJournal({ stateDir, commandId: failedId }).projection().status, "failed");
    assert.equal(new RunJournal({ stateDir, commandId: runningId }).projection().status, "interrupted");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("migration is idempotent when v2 journals already exist", () => {
  const root = mkdtempSync(join(tmpdir(), "moneyflow-legacy-migration-"));
  try {
    const legacyStateDir = writeLegacy(root, {
      version: 1,
      commands: { [completedId]: { status: "completed" } },
    });
    const stateDir = join(root, ".agent-harness");

    assert.deepEqual(migrateLegacyDispatcherState({ legacyStateDir, stateDir }), {
      found: true,
      migrated: 1,
      skipped: 0,
    });
    assert.deepEqual(migrateLegacyDispatcherState({ legacyStateDir, stateDir }), {
      found: true,
      migrated: 0,
      skipped: 1,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("missing legacy state is a clean no-op", () => {
  const root = mkdtempSync(join(tmpdir(), "moneyflow-legacy-migration-"));
  try {
    assert.deepEqual(
      migrateLegacyDispatcherState({
        legacyStateDir: join(root, "missing"),
        stateDir: join(root, ".agent-harness"),
      }),
      { found: false, migrated: 0, skipped: 0 },
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("malformed or unknown legacy state fails closed", () => {
  const root = mkdtempSync(join(tmpdir(), "moneyflow-legacy-migration-"));
  try {
    const legacyStateDir = join(root, ".agent-dispatcher");
    mkdirSync(legacyStateDir, { recursive: true });
    writeFileSync(join(legacyStateDir, "state.json"), "not-json\n");
    assert.throws(
      () => migrateLegacyDispatcherState({ legacyStateDir, stateDir: join(root, ".agent-harness") }),
      (error) =>
        error instanceof LegacyDispatcherMigrationError &&
        error.code === "LEGACY_STATE_MALFORMED",
    );

    writeFileSync(
      join(legacyStateDir, "state.json"),
      JSON.stringify({ version: 1, commands: { [completedId]: { status: "mystery" } } }),
    );
    assert.throws(
      () => migrateLegacyDispatcherState({ legacyStateDir, stateDir: join(root, ".agent-harness") }),
      (error) =>
        error instanceof LegacyDispatcherMigrationError &&
        error.code === "LEGACY_STATE_MALFORMED",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
