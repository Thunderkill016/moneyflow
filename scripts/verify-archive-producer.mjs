/**
 * R6 round-trip evidence: real database tenant state → archive producer →
 * parsed archive → R5 validator.
 *
 * The producer's output is fed to the validator **unmodified**. Nothing here
 * reshapes, fills in or repairs the payload — if the archive only validates
 * after a fix-up, that is a producer defect, not a test detail.
 *
 * Usage: node --experimental-strip-types scripts/verify-archive-producer.mjs <archive.json>
 */

import { readFileSync } from "node:fs";
import {
  ALL_ARCHIVE_COLLECTIONS,
  ARCHIVE_ROW_SPECS,
} from "../src/lib/archive/moneyflow-archive.ts";
import { validateMoneyFlowArchive } from "../src/lib/archive/moneyflow-archive-validator.ts";

const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

const path = process.argv[2];
if (!path) {
  console.error("usage: verify-archive-producer.mjs <archive.json>");
  process.exit(2);
}

const raw = readFileSync(path, "utf8").trim();
if (raw === "") {
  console.error(`${path} is empty — the producer emitted nothing.`);
  process.exit(1);
}

let archive;
try {
  archive = JSON.parse(raw);
} catch (error) {
  console.error(`${path} is not valid JSON: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

// 1. The acceptance proof: raw producer output must satisfy the R5 contract.
const result = validateMoneyFlowArchive(archive);
if (!result.ok) {
  for (const rejection of result.errors) {
    failures.push(`validator rejected ${rejection.code} at ${rejection.path || "<root>"}`);
  }
}

const tables = archive?.tables ?? {};

// 2. Every collection must have been exercised. A thin fixture could otherwise
//    make an incomplete producer look correct.
for (const collection of ALL_ARCHIVE_COLLECTIONS) {
  if (collection === "profile") {
    check(
      tables.profile && typeof tables.profile === "object",
      "profile must be an object in the exported archive",
    );
    continue;
  }
  check(Array.isArray(tables[collection]), `${collection} must be a JSON array, not null`);
  check(
    Array.isArray(tables[collection]) && tables[collection].length > 0,
    `${collection} is empty — the fixture must exercise every collection so an incomplete producer cannot pass`,
  );
}

// 3. Field-level completeness against the contract, row by row, on real output.
for (const [collection, spec] of Object.entries(ARCHIVE_ROW_SPECS)) {
  const rows = collection === "profile" ? [tables.profile] : tables[collection];
  if (!Array.isArray(rows) && collection !== "profile") continue;
  const list = collection === "profile" ? [tables.profile] : rows;
  for (const [index, row] of list.entries()) {
    if (!row || typeof row !== "object") continue;
    for (const field of Object.keys(spec.fields)) {
      check(
        field in row,
        `${collection}[${index}] is missing the contract field ${field}`,
      );
    }
    for (const field of Object.keys(row)) {
      check(
        field in spec.fields,
        `${collection}[${index}] carries ${field}, which is not in the contract`,
      );
    }
  }
}

// 4. Ownership and secrecy, checked against the serialized text so nesting
//    cannot hide anything.
const serialized = JSON.stringify(archive);
for (const forbidden of [
  '"user_id"',
  '"actor_user_id"',
  '"request_id"',
  '"owner_id"',
  '"tenant_id"',
  '"password"',
  '"access_token"',
  '"refresh_token"',
  '"service_role"',
]) {
  check(!serialized.includes(forbidden), `the archive must not contain ${forbidden}`);
}
check(
  !("id" in (tables.profile ?? {})),
  "the profile must not carry the source tenant identity",
);

// 5. Money must survive as exact integers, not through a lossy float path.
const entries = Array.isArray(tables.transactionEntries) ? tables.transactionEntries : [];
check(
  entries.some((entry) => entry.amount_minor === 9007199254740991),
  "the largest safe integer amount must survive the export exactly",
);
for (const entry of entries) {
  check(
    Number.isSafeInteger(entry.amount_minor),
    `entry ${entry.id} carries a non-safe-integer amount`,
  );
}

// 6. Counts must describe the payload actually emitted.
for (const collection of ALL_ARCHIVE_COLLECTIONS) {
  const expected = collection === "profile" ? 1 : (tables[collection] ?? []).length;
  check(
    archive.tenant_row_counts?.[collection] === expected,
    `tenant_row_counts.${collection} does not match the serialized payload`,
  );
}

// 7. Historical state must not be filtered out by the producer.
const transactions = Array.isArray(tables.transactions) ? tables.transactions : [];
check(
  transactions.some((transaction) => transaction.deleted_at !== null),
  "a soft-deleted transaction must survive the export",
);
check(
  (tables.categories ?? []).some((category) => category.is_archived === true),
  "an archived category must survive the export",
);
check(
  (tables.accounts ?? []).some((account) => account.is_archived === true),
  "an archived account must survive the export",
);

// 8. The self-reference the contract singles out.
const candidates = Array.isArray(tables.inboxCandidates) ? tables.inboxCandidates : [];
check(
  candidates.filter((candidate) => candidate.transfer_pair_id !== null).length >= 2,
  "mutually paired inbox candidates must survive the export",
);

if (failures.length > 0) {
  console.error(`Archive producer verification failed (${failures.length}):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const counts = ALL_ARCHIVE_COLLECTIONS.map(
  (collection) => `${collection}=${archive.tenant_row_counts[collection]}`,
).join(" ");
console.log("Archive producer verification passed.");
console.log(`  archive_version=${archive.archive_version} schema_generation=${archive.schema_generation}`);
console.log(`  ${counts}`);
