import { readFileSync } from "node:fs";
import { join } from "node:path";

import { RunJournal } from "./journal.mjs";

const LEGACY_STATE_FILE = "state.json";
const COMMAND_ID_PATTERN = /^[a-f0-9]{64}$/u;
const LEGACY_STATUSES = new Set(["running", "completed", "failed"]);

export class LegacyDispatcherMigrationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "LegacyDispatcherMigrationError";
    this.code = code;
  }
}

function readLegacyState(legacyStateDir) {
  const path = join(legacyStateDir, LEGACY_STATE_FILE);
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new LegacyDispatcherMigrationError(
      "LEGACY_STATE_UNREADABLE",
      "legacy dispatcher state exists but cannot be read",
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new LegacyDispatcherMigrationError(
      "LEGACY_STATE_MALFORMED",
      "legacy dispatcher state is invalid JSON",
    );
  }
  if (parsed?.version !== 1 || parsed.commands === null || typeof parsed.commands !== "object") {
    throw new LegacyDispatcherMigrationError(
      "LEGACY_STATE_MALFORMED",
      "legacy dispatcher state does not match version 1",
    );
  }
  return parsed;
}

/**
 * Project v1 dispatcher identities into v2 journals without deleting legacy
 * state. Old and new Codex command IDs are intentionally identical because
 * both hash kind/number/sourceKey/provider-value/note in the same order.
 */
export function migrateLegacyDispatcherState({
  legacyStateDir = ".agent-dispatcher",
  stateDir = ".agent-harness",
} = {}) {
  const legacy = readLegacyState(legacyStateDir);
  if (!legacy) return Object.freeze({ found: false, migrated: 0, skipped: 0 });

  let migrated = 0;
  let skipped = 0;
  for (const [commandId, record] of Object.entries(legacy.commands)) {
    if (!COMMAND_ID_PATTERN.test(commandId)) {
      throw new LegacyDispatcherMigrationError(
        "LEGACY_STATE_MALFORMED",
        `legacy dispatcher command id is invalid: ${commandId}`,
      );
    }
    const status = record?.status;
    if (!LEGACY_STATUSES.has(status)) {
      throw new LegacyDispatcherMigrationError(
        "LEGACY_STATE_MALFORMED",
        `legacy dispatcher command ${commandId} has unsupported status`,
      );
    }

    const journal = new RunJournal({ stateDir, commandId });
    if (journal.events().length > 0) {
      skipped += 1;
      continue;
    }

    journal.append("run/accepted", {
      provider: "codex",
      migration: "legacy-dispatcher-v1",
    });
    if (record.branch) {
      journal.append("workspace/prepared", {
        branch: String(record.branch),
        worktree: null,
        migration: "legacy-dispatcher-v1",
      });
    }
    if (status === "completed") {
      journal.append("run/completed", {
        provider: "codex",
        migration: "legacy-dispatcher-v1",
      });
    } else if (status === "failed") {
      journal.append("run/failed", {
        provider: "codex",
        migration: "legacy-dispatcher-v1",
      });
    }
    // `running` intentionally stays non-terminal. V2 projects it as interrupted
    // and refuses automatic replay because the old process may have committed
    // repository side effects before it stopped.
    migrated += 1;
  }

  return Object.freeze({ found: true, migrated, skipped });
}
