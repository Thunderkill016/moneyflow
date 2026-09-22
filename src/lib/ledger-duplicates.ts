/**
 * Ledger-level duplicate finder — advisory flags over committed transactions.
 * Pure functions: no I/O, deterministic output.
 *
 * The rule is deliberately conservative. Every flag lands in front of a human
 * in a review strip; nothing is merged or deleted automatically, and flag
 * noise burns the review trust this feature exists to build.
 *
 * Buckets — account | kind | amount | normalized description:
 * - The account hint prefers accountId and falls back to the normalized
 *   account name, the same shape the inbox fingerprint uses (#668).
 * - Kind stays in the key: an expense and an income sharing amount and note
 *   are a reversal, not a double-entry.
 * - Transfers are excluded entirely: a transfer's two legs are one balanced
 *   movement, and transfer rows are never income/expense candidates here.
 * - Recurring-payment rows are excluded: they are managed on Định kỳ and the
 *   workspace delete path refuses them, so a flag would be unactionable.
 * - Optimistic pending rows (id "pending:*") are excluded — they supersede on
 *   confirm and would flash phantom duplicates.
 *
 * A group flags when its rows connect through flagged pairs:
 * - Same-day pair (dayDiff = 0): always flags — two identical fingerprints on
 *   one day is the classic accidental double-entry, and the strongest signal
 *   we have. This tier mirrors the inbox fingerprint tier, so it fires even
 *   for an empty note.
 * - Near-day pair (1–NEAR_MATCH_WINDOW_DAYS): flags only when the description
 *   is non-empty (amount+account+date alone is noise — the same reason the
 *   inbox near tier refuses empty descriptions) AND the bucket is not an
 *   established habit. A lone pair exactly NEAR_MATCH_WINDOW_DAYS apart is the
 *   weakest signal, so it needs company: it flags only inside a cluster of
 *   ≥3 rows within the window.
 *
 * "Established habit": the same account+kind+amount+description already occurs
 * ≥ HABIT_MIN_OCCURRENCES times with a median gap ≤ NEAR_MATCH_WINDOW_DAYS —
 * "Cà phê 30k" every day is a cadence, so near-day proximity is the norm, not
 * an anomaly. A same-day collision still flags inside a habit: two identical
 * rows on one day is suspicious even for a daily spend.
 *
 * Dismissal identity: group.key hashes the whole bucket key (account|kind|
 * amount|desc), not the member rows — matching the recurring-dismissals
 * convention. Dismissing means "this exact combination is a known repeat";
 * the trade-off is that a genuinely new duplicate of the same combination
 * stays suppressed until the pattern changes.
 */

import { isValidDateOnly } from "./date-only.ts";
import {
  accountHint,
  dayDiff,
  fnv1aHex,
  NEAR_MATCH_WINDOW_DAYS,
  normalizeDesc,
} from "./inbox/detect.ts";
import { OPTIMISTIC_TRANSACTION_ID_PREFIX } from "./optimistic-transactions.ts";
import { normalizeSearchText } from "./search-text.ts";

export { NEAR_MATCH_WINDOW_DAYS as LEDGER_DUPE_WINDOW_DAYS };

/**
 * A committed row that qualifies as a near-day match must sit within this many
 * days of a neighbour. Same-day pairs (0) always qualify; the window edge (2)
 * only qualifies inside a cluster — see the module comment.
 */
export const LEDGER_DUPE_NEAR_PAIR_DAYS = 1;

/**
 * A cross-day cluster of at least this many rows within the window flags even
 * without a same-day pair — "count > 1 in a short window" is stronger than a
 * lone edge-of-window pair.
 */
export const LEDGER_DUPE_MIN_CLUSTER_ROWS = 3;

/**
 * A bucket reads as a habit — and near-day matches inside it are suppressed —
 * once the same account+kind+amount+description occurs at least this many
 * times with a median gap at or under the near-match window.
 */
export const LEDGER_DUPE_HABIT_MIN_OCCURRENCES = 4;

/** Minimal committed row the detector needs — `Transaction` satisfies it. */
export type LedgerDupeRow = {
  id: string;
  kind: "expense" | "income" | "transfer";
  amount: number;
  occurredOn: string;
  note: string;
  accountId?: string;
  account?: string;
  isRecurringPayment?: boolean;
};

export type LedgerDuplicateGroup<T extends LedgerDupeRow = LedgerDupeRow> = {
  /** Dismissal key — fnv1a of the bucket key, stable across member changes. */
  key: string;
  kind: "expense" | "income";
  amount: number;
  /** Display account name from the first row ("" if the row had none). */
  account: string;
  /** Representative raw note for display (first row's). */
  note: string;
  /** Members sorted by occurredOn, then id. */
  rows: T[];
  /** True when the group contains an identical same-day fingerprint pair. */
  hasSameDayPair: boolean;
  /** Calendar days between the earliest and latest member. */
  spanDays: number;
};

/**
 * Description identity for ledger rows: `normalizeDesc` handles case, marks,
 * punctuation and whitespace, and `normalizeSearchText` folds đ→d, which NFD
 * normalization alone cannot reach (đ carries no decomposition mapping).
 */
function dupeDescKey(note: string): string {
  return normalizeDesc(normalizeSearchText(note));
}

function isEligibleDupeRow(row: LedgerDupeRow): boolean {
  if (row.kind === "transfer") return false;
  if (row.isRecurringPayment) return false;
  if (row.id.startsWith(OPTIMISTIC_TRANSACTION_ID_PREFIX)) return false;
  if (!Number.isSafeInteger(row.amount) || row.amount <= 0) return false;
  return isValidDateOnly(row.occurredOn);
}

function lowerMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)]!;
}

/**
 * Find groups of committed transactions that look like accidental
 * double-entries. Pure and deterministic — the same rows always produce the
 * same groups, ordered newest-first.
 */
export function findLedgerDuplicateGroups<T extends LedgerDupeRow>(
  rows: readonly T[],
): LedgerDuplicateGroup<T>[] {
  const buckets = new Map<string, { desc: string; rows: T[] }>();
  for (const row of rows) {
    if (!isEligibleDupeRow(row)) continue;
    const account = accountHint(row);
    if (!account) continue;
    const desc = dupeDescKey(row.note);
    const key = `${account}|${row.kind}|${row.amount}|${desc}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.rows.push(row);
    else buckets.set(key, { desc, rows: [row] });
  }

  const groups: LedgerDuplicateGroup<T>[] = [];
  for (const [bucketKey, bucket] of buckets) {
    if (bucket.rows.length < 2) continue;
    const sorted = [...bucket.rows].sort(
      (a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.id.localeCompare(b.id),
    );

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i += 1) {
      gaps.push(dayDiff(sorted[i - 1]!.occurredOn, sorted[i]!.occurredOn));
    }
    const habitual =
      sorted.length >= LEDGER_DUPE_HABIT_MIN_OCCURRENCES &&
      lowerMedian(gaps) <= NEAR_MATCH_WINDOW_DAYS;

    const emitGroup = (cluster: T[], hasSameDayPair: boolean) => {
      const first = cluster[0]!;
      const last = cluster[cluster.length - 1]!;
      groups.push({
        key: fnv1aHex(`ledger-dupe|${bucketKey}`),
        kind: first.kind as "expense" | "income",
        amount: first.amount,
        account: first.account ?? "",
        note: first.note,
        rows: cluster,
        hasSameDayPair,
        spanDays: dayDiff(first.occurredOn, last.occurredOn),
      });
    };

    if (habitual) {
      // Inside an established cadence the only flaggable anomaly is an
      // identical same-day fingerprint — and the group stays tight: just the
      // colliding rows, not the whole chained run of the habit.
      let run = 0;
      for (let i = 1; i <= sorted.length; i += 1) {
        if (i < sorted.length && gaps[i - 1] === 0) continue;
        if (i - run >= 2) emitGroup(sorted.slice(run, i), true);
        run = i;
      }
      continue;
    }

    // Rows chain into one cluster while consecutive gaps stay inside the
    // ±NEAR_MATCH_WINDOW_DAYS window — a wider gap starts a fresh cluster.
    let start = 0;
    for (let i = 1; i <= sorted.length; i += 1) {
      const continues = i < sorted.length && gaps[i - 1]! <= NEAR_MATCH_WINDOW_DAYS;
      if (continues) continue;

      const cluster = sorted.slice(start, i);
      // gaps[j] is the distance between sorted[j] and sorted[j+1], so the
      // gaps inside cluster sorted[start..i-1] are gaps[start..i-2].
      const clusterGaps = gaps.slice(start, i - 1);
      start = i;
      if (cluster.length < 2) continue;

      const hasSameDayPair = clusterGaps.some((gap) => gap === 0);
      const hasNearPair = clusterGaps.some(
        (gap) => gap <= LEDGER_DUPE_NEAR_PAIR_DAYS,
      );

      // Near-day tier needs a real description — account+amount+date alone is
      // the noise the inbox near tier already refuses to flag on. A same-day
      // collision is the exact-fingerprint tier and flags regardless.
      if (
        !hasSameDayPair &&
        (bucket.desc.length === 0 ||
          (!hasNearPair && cluster.length < LEDGER_DUPE_MIN_CLUSTER_ROWS))
      ) {
        continue;
      }
      emitGroup(cluster, hasSameDayPair);
    }
  }

  // Newest activity first; the bucket key hash breaks ties deterministically.
  groups.sort(
    (a, b) =>
      b.rows[b.rows.length - 1]!.occurredOn.localeCompare(
        a.rows[a.rows.length - 1]!.occurredOn,
      ) || a.key.localeCompare(b.key),
  );
  return groups;
}
