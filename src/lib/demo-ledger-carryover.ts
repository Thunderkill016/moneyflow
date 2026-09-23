import { TRANSACTION_STORAGE_KEY } from "./transaction-store.ts";
import { isTransaction } from "./transaction-store.ts";
import type { Transaction } from "./transactions/contracts.ts";
import type { CreateCandidateWithProvenanceInput } from "./inbox/provenance.ts";

/**
 * Demo → account carryover.
 *
 * Reads the browser-local demo ledger and prepares the rows a user actually
 * entered for the consented Inbox path. Fixture content (sample-* demo rows),
 * transfers and split expenses are never carried — transfers/splits cannot be
 * represented as Inbox candidates without flattening their structure, and the
 * consent copy must say so rather than silently dropping them.
 */

export const DEMO_CARRYOVER_MARKER_KEY = "moneyflow-demo-ledger-carryover-v1";
export const DEMO_CARRYOVER_EXTERNAL_PREFIX = "demo-tx-";
export const DEMO_CARRYOVER_BATCH_NAME = "moneyflow-demo-ledger";

function isFixtureTransactionId(id: string): boolean {
  return (
    id.startsWith("sample-") ||
    id.startsWith("demo-") ||
    id.startsWith("cand-demo-")
  );
}

export type DemoCarryoverState = {
  /** Expense/income rows the user actually entered — carryable. */
  carryable: Transaction[];
  /** Transfers and split rows — structurally not representable in Inbox. */
  skippedStructured: number;
  /** Product fixture rows — never user facts. */
  fixtureCount: number;
};

/**
 * Raw localStorage read — deliberately bypasses `readStoredTransactions`,
 * which falls back to fixture rows when storage is empty.
 */
export function readDemoCarryoverState(
  storage?: Pick<Storage, "getItem"> | null,
): DemoCarryoverState | null {
  const store =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return null;

  let parsed: unknown;
  try {
    const raw = store.getItem(TRANSACTION_STORAGE_KEY);
    if (!raw) return null;
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const valid = parsed.filter(isTransaction);
  const userRows = valid.filter((tx) => !isFixtureTransactionId(tx.id));

  const carryable: Transaction[] = [];
  let skippedStructured = 0;
  for (const tx of userRows) {
    if (tx.kind === "transfer" || tx.splits !== undefined) {
      skippedStructured += 1;
    } else {
      carryable.push(tx);
    }
  }

  const fixtureCount = valid.length - userRows.length;
  if (carryable.length === 0 && skippedStructured === 0) return null;
  return { carryable, skippedStructured, fixtureCount };
}

export function readCarryoverMarker(
  storage?: Pick<Storage, "getItem"> | null,
): string | null {
  const store =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return null;
  try {
    return store.getItem(DEMO_CARRYOVER_MARKER_KEY);
  } catch {
    return null;
  }
}

export function writeCarryoverMarker(
  outcome: "accepted" | "declined",
  storage?: Pick<Storage, "setItem"> | null,
): void {
  const store =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return;
  try {
    store.setItem(DEMO_CARRYOVER_MARKER_KEY, outcome);
  } catch {
    /* ignore quota */
  }
}

/**
 * Map one user-entered demo transaction to an Inbox candidate input.
 * Account/category names travel as text provenance only — no id mapping,
 * because demo entities do not exist on the server tenant. The reviewer
 * assigns the real account/category during the normal Inbox review.
 */
export function toCarryoverCandidateInput(
  tx: Transaction,
): CreateCandidateWithProvenanceInput {
  return {
    kind: tx.kind,
    amount: tx.amount,
    merchant: (tx.payee ?? tx.note).slice(0, 200) || "Không rõ",
    note: tx.note.slice(0, 500) || undefined,
    occurredOn: tx.occurredOn,
    source: "manual",
    confidence: "high",
    category: tx.category.slice(0, 60) || undefined,
    account: tx.account.slice(0, 80) || undefined,
    sourceExternalId: `${DEMO_CARRYOVER_EXTERNAL_PREFIX}${tx.id}`,
    sourceLifecycleState: "pending",
    parserVersion: "demo-ledger-v1",
    mappingVersion: 1,
  };
}

/** True when the server inbox already holds a carried-over demo row. */
export function hasCarriedDemoRows(candidates: readonly object[]): boolean {
  return candidates.some(
    (c) =>
      "sourceExternalId" in c &&
      typeof c.sourceExternalId === "string" &&
      c.sourceExternalId.startsWith(DEMO_CARRYOVER_EXTERNAL_PREFIX),
  );
}
