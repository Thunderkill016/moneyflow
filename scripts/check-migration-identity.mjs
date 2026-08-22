#!/usr/bin/env node
/**
 * Migration identity contract.
 *
 * A migration's version is its identity once production has run it. Renaming or
 * retimestamping one silently forks history: the database still records the old
 * version, the repository claims a new one, and `supabase db push` then offers to
 * re-apply work that is already live. That is exactly how this project ended up
 * with five MoneyFlow migrations recorded under one timestamp remotely and a
 * different one locally, which blocked deployment until it was reconciled by hand.
 *
 * This gate makes that impossible to do by accident. It pins every migration's
 * version, filename and a raw-byte SHA-256 content hash. Any rename, retimestamp or
 * post-hoc edit fails until the baseline is updated deliberately.
 *
 * Deliberately offline: no database connection, no network. It compares the
 * repository against its own recorded baseline.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";
const BASELINE_PATH = "supabase/migration-identity.json";

/**
 * Hash the raw file, byte for byte.
 *
 * An earlier version normalized comments, whitespace and case before hashing, so
 * that cosmetic edits would not trip the gate. That was wrong in a way that
 * mattered: lowercasing the whole file also lowercases *string literals*, so
 * changing a default note from 'Chuyển tiền' to 'CHUYỂN TIỀN' produced an
 * identical hash while a fresh database would genuinely behave differently.
 *
 * Any normalizer that is not SQL-aware has this class of hole, and an SQL parser
 * is far too much machinery for one guard. Raw bytes have no holes: the cost is
 * that even a comment edit needs a deliberate `--write`, which for a migration
 * the database has already run is the right amount of friction.
 */
function fingerprint(sql) {
  return createHash("sha256").update(sql).digest("hex").slice(0, 32);
}

function readMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => {
      const version = /^(\d{14})_/u.exec(name)?.[1];
      if (!version) throw new Error(`${name} does not start with a 14-digit version`);
      return { version, name, hash: fingerprint(readFileSync(join(MIGRATIONS_DIR, name), "utf8")) };
    });
}

const current = readMigrations();

if (process.argv.includes("--write")) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify({ migrations: current }, null, 2)}\n`);
  console.log(`Migration identity baseline written: ${current.length} migrations.`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")).migrations;
} catch {
  console.error(
    `Missing ${BASELINE_PATH}. Create it with: node scripts/check-migration-identity.mjs --write`,
  );
  process.exit(1);
}

const byVersion = new Map(baseline.map((entry) => [entry.version, entry]));
const currentByVersion = new Map(current.map((entry) => [entry.version, entry]));
const failures = [];

for (const entry of baseline) {
  const now = currentByVersion.get(entry.version);
  if (!now) {
    failures.push(
      `migration ${entry.version} (${entry.name}) disappeared. A deployed migration's version is its identity — renaming or retimestamping it forks history from the database that already ran it.`,
    );
    continue;
  }
  if (now.name !== entry.name) {
    failures.push(`migration ${entry.version} was renamed: ${entry.name} -> ${now.name}`);
  }
  if (now.hash !== entry.hash) {
    failures.push(
      `migration ${entry.version} (${entry.name}) changed after being recorded. Editing an applied migration cannot change the database that already ran it; add a new migration instead.`,
    );
  }
}

for (const entry of current) {
  if (!byVersion.has(entry.version)) {
    failures.push(
      `migration ${entry.version} (${entry.name}) is not in the baseline. Add it deliberately: node scripts/check-migration-identity.mjs --write`,
    );
  }
}

// A duplicate logical migration under two versions is the failure mode that
// produced this gate in the first place.
const byHash = new Map();
for (const entry of current) {
  const seen = byHash.get(entry.hash);
  if (seen) {
    failures.push(
      `migrations ${seen.version} and ${entry.version} are byte-identical — the same migration must not exist under two versions.`,
    );
  } else {
    byHash.set(entry.hash, entry);
  }
}

if (failures.length > 0) {
  console.error("Migration identity contract failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Migration identity contract passed (${current.length} migrations pinned).`);
