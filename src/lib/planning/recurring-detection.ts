/**
 * Recurring-pattern detection over the loaded ledger (Stage-1 bounded slice).
 *
 * MoneyFlow commitments are manually declared today. This module scans expense
 * rows for repeated monthly patterns so /commitments can suggest declaring them.
 * Pure functions — no I/O; detection runs client-side over already-loaded data
 * in both demo (localStorage ledger) and authenticated (transaction_feed
 * window) modes. Suggestions are advisory: nothing here writes to the ledger.
 *
 * A suggestion requires, for one normalized note:
 * - at least MIN_PATTERN_MONTHS occurrences in distinct calendar months,
 * - consecutive kept occurrences MIN_CHAIN_GAP_DAYS..MAX_CHAIN_GAP_DAYS apart
 *   (a gap past one cycle starts a new chain),
 * - a density bound: inside a candidate chain's span the same note may appear
 *   at most ~1.5× per month — weekly/daily rows would otherwise let every
 *   fourth occurrence re-anchor a fake monthly chain,
 * - amounts within ±AMOUNT_TOLERANCE_PERCENT of the median (integer floor),
 * - day-of-month within DUE_DAY_WINDOW (circular, month-end aware) of the
 *   median day for at least three distinct months,
 * - the newest occurrence inside RECENCY_WINDOW_DAYS of `today` — a pattern
 *   that stopped more than about two cycles ago is no longer recurring.
 *
 * The pattern key hashes only `expense|<normalized note>`, so a pattern keeps
 * the same dismissal key while its amounts drift inside the tolerance.
 */

import { isValidDateOnly } from "../date-only.ts";
import { dayDiff, fnv1aHex, normalizeDesc } from "../inbox/detect.ts";
import type { RecurringCommitment } from "./commitments.ts";

/** Minimal ledger row detection needs; Transaction satisfies this shape. */
export type RecurringDetectionRow = {
  id: string;
  kind: "expense" | "income" | "transfer";
  note: string;
  /** Integer đồng. */
  amount: number;
  /** `YYYY-MM-DD`. */
  occurredOn: string;
  accountId?: string;
  categoryId?: string;
};

export type RecurringPatternSuggestion = {
  /** Stable dismissal key — amount-insensitive by contract. */
  key: string;
  /** Raw note of the newest coherent occurrence (display + dialog prefill). */
  name: string;
  /** Normalized text the pattern grouped on. */
  normalizedName: string;
  /** Median amount of the coherent occurrences (an observed value). */
  amount: number;
  /** Median day-of-month of the coherent occurrences. */
  dueDay: number;
  /** Newest coherent occurrence date, `YYYY-MM-DD`. */
  lastSeen: string;
  /** Number of occurrences supporting the suggestion. */
  occurrenceCount: number;
  accountId?: string;
  categoryId?: string;
};

/** Distinct calendar months a chain must span to read as recurring. */
export const MIN_PATTERN_MONTHS = 3;
/** ±10% around the median amount, applied as an integer floor. */
export const AMOUNT_TOLERANCE_PERCENT = 10;
/** Circular day-of-month slack around the median day (month-end aware). */
export const DUE_DAY_WINDOW = 5;
/** Nearer than this reads as the same billing cycle, not the next one. */
export const MIN_CHAIN_GAP_DAYS = 23;
/** Farther than this means a cycle was skipped — the chain breaks. */
export const MAX_CHAIN_GAP_DAYS = 45;
/** Roughly two monthly cycles; older last-seen patterns are treated as dead. */
export const RECENCY_WINDOW_DAYS = 62;
/** Bounded card list on /commitments. */
export const MAX_SUGGESTIONS = 5;
/** Ledger lookback the server loads for detection (whole months). */
export const RECURRING_DETECTION_WINDOW_MONTHS = 12;

const DAYS_IN_LONGEST_MONTH = 31;

/**
 * First ledger date detection can use: day 1 of the month
 * RECURRING_DETECTION_WINDOW_MONTHS - 1 before `today`'s month.
 */
export function recurringDetectionStart(today: string): string {
  const year = Number(today.slice(0, 4));
  const monthIndex = Number(today.slice(5, 7)) - 1;
  const start = new Date(
    Date.UTC(year, monthIndex - (RECURRING_DETECTION_WINDOW_MONTHS - 1), 1),
  );
  return start.toISOString().slice(0, 10);
}

/**
 * Pattern grouping text: shared description normalization plus removal of
 * "tháng N" / "tháng N YYYY" month markers — the common Vietnamese shape for
 * recurring-bill notes ("Tiền điện tháng 8") that would otherwise make every
 * month a different key.
 */
export function recurringPatternText(note: string): string {
  return normalizeDesc(note)
    .replace(/\bthang \d{1,2}( \d{4})?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function recurringPatternKey(normalized: string): string {
  return fnv1aHex(`expense|${normalized}`);
}

/**
 * Display name for a suggestion: the newest occurrence's note with its
 * "tháng N" marker removed, so the prefill reads "Tiền điện" rather than
 * pinning one month into the commitment name. Falls back to the raw note.
 */
function suggestedName(note: string): string {
  const cleaned = note
    .replace(/\bth[aá]ng\s+\d{1,2}(\s+\d{4})?\b/giu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || note.trim();
}

/** Lower median — always an observed value, so amounts stay integer đồng. */
function lowerMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)]!;
}

/** Circular distance on a 31-day dial: 31 vs 2 reads as 2 days, not 29. */
function circularDayDiff(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, DAYS_IN_LONGEST_MONTH - diff);
}

type Occurrence = {
  row: RecurringDetectionRow;
  /** `YYYY-MM` bucket. */
  month: string;
  day: number;
};

function monthOf(occurredOn: string): string {
  return occurredOn.slice(0, 7);
}

function dayOf(occurredOn: string): number {
  return Number(occurredOn.slice(8, 10));
}

/**
 * Split sorted occurrences into chains of roughly-monthly repeats. A gap below
 * MIN_CHAIN_GAP_DAYS is same-cycle noise and is absorbed without moving the
 * anchor (so a duplicate payment inside one cycle neither extends nor breaks
 * the chain). A gap past MAX_CHAIN_GAP_DAYS ends the chain.
 */
function buildChains(occurrences: Occurrence[]): Occurrence[][] {
  const chains: Occurrence[][] = [];
  let current: Occurrence[] = [];
  let anchor: Occurrence | null = null;
  for (const occurrence of occurrences) {
    if (!anchor) {
      current = [occurrence];
      anchor = occurrence;
      continue;
    }
    const gap = dayDiff(anchor.row.occurredOn, occurrence.row.occurredOn);
    if (gap < MIN_CHAIN_GAP_DAYS) continue;
    if (gap > MAX_CHAIN_GAP_DAYS) {
      chains.push(current);
      current = [occurrence];
      anchor = occurrence;
      continue;
    }
    current.push(occurrence);
    anchor = occurrence;
  }
  if (current.length > 0) chains.push(current);
  return chains;
}

/**
 * The day-coherent core of a chain: members within DUE_DAY_WINDOW of the
 * chain's median day, spanning at least MIN_PATTERN_MONTHS months. Returns
 * null when the chain cannot support a single suggested due day.
 */
function coherentCore(chain: Occurrence[]): Occurrence[] | null {
  const months = new Set(chain.map((occurrence) => occurrence.month));
  if (months.size < MIN_PATTERN_MONTHS) return null;
  const medianDay = lowerMedian(chain.map((occurrence) => occurrence.day));
  const core = chain.filter(
    (occurrence) => circularDayDiff(occurrence.day, medianDay) <= DUE_DAY_WINDOW,
  );
  const coreMonths = new Set(core.map((occurrence) => occurrence.month));
  return coreMonths.size >= MIN_PATTERN_MONTHS ? core : null;
}

/**
 * Reject chains whose span is too dense to be monthly. Kept members are at
 * least MIN_CHAIN_GAP_DAYS apart, so absorbed same-cycle extras (a duplicate
 * payment) stay allowed up to ~1.5 occurrences per month; weekly activity
 * blows through that bound even though only a few of its rows were kept.
 */
function withinDensity(
  core: Occurrence[],
  inAmount: Occurrence[],
): boolean {
  const months = new Set(core.map((occurrence) => occurrence.month)).size;
  const start = core[0]!.row.occurredOn;
  const end = core[core.length - 1]!.row.occurredOn;
  const spanCount = inAmount.filter(
    (occurrence) =>
      occurrence.row.occurredOn >= start && occurrence.row.occurredOn <= end,
  ).length;
  return spanCount <= months + Math.floor(months / 2);
}

/**
 * Detect recurring expense patterns. Deterministic: same input → same ordered
 * output (last seen desc, occurrence count desc, key asc).
 */
export function detectRecurringPatterns(
  rows: readonly RecurringDetectionRow[],
  commitments: readonly Pick<RecurringCommitment, "name" | "isArchived">[],
  today: string,
): RecurringPatternSuggestion[] {
  const declaredNames = new Set(
    commitments
      .filter((item) => !item.isArchived)
      .map((item) => recurringPatternText(item.name))
      .filter((name) => name.length > 0),
  );

  const groups = new Map<string, Occurrence[]>();
  for (const row of rows) {
    if (row.kind !== "expense") continue;
    if (!Number.isSafeInteger(row.amount) || row.amount <= 0) continue;
    if (!isValidDateOnly(row.occurredOn)) continue;
    const normalized = recurringPatternText(row.note);
    if (!normalized || declaredNames.has(normalized)) continue;
    const list = groups.get(normalized) ?? [];
    list.push({ row, month: monthOf(row.occurredOn), day: dayOf(row.occurredOn) });
    groups.set(normalized, list);
  }

  const suggestions: RecurringPatternSuggestion[] = [];
  for (const [normalized, occurrences] of groups) {
    if (occurrences.length < MIN_PATTERN_MONTHS) continue;
    occurrences.sort(
      (a, b) =>
        a.row.occurredOn.localeCompare(b.row.occurredOn) ||
        a.row.id.localeCompare(b.row.id),
    );

    const medianAmount = lowerMedian(
      occurrences.map((occurrence) => occurrence.row.amount),
    );
    const tolerance = Math.floor(
      (medianAmount * AMOUNT_TOLERANCE_PERCENT) / 100,
    );
    const inAmount = occurrences.filter(
      (occurrence) =>
        Math.abs(occurrence.row.amount - medianAmount) <= tolerance,
    );
    if (inAmount.length < MIN_PATTERN_MONTHS) continue;

    // Best chain = qualifying chain with the newest activity; size and build
    // order break ties so the choice never depends on input order.
    let best: Occurrence[] | null = null;
    for (const chain of buildChains(inAmount)) {
      const core = coherentCore(chain);
      if (!core || !withinDensity(core, inAmount)) continue;
      const lastSeen = core[core.length - 1]!.row.occurredOn;
      if (!best) {
        best = core;
        continue;
      }
      const bestSeen = best[best.length - 1]!.row.occurredOn;
      if (
        lastSeen > bestSeen ||
        (lastSeen === bestSeen && core.length > best.length)
      ) {
        best = core;
      }
    }
    if (!best) continue;

    const newest = best[best.length - 1]!;
    if (dayDiff(newest.row.occurredOn, today) > RECENCY_WINDOW_DAYS) continue;

    suggestions.push({
      key: recurringPatternKey(normalized),
      name: suggestedName(newest.row.note),
      normalizedName: normalized,
      amount: lowerMedian(best.map((occurrence) => occurrence.row.amount)),
      dueDay: lowerMedian(best.map((occurrence) => occurrence.day)),
      lastSeen: newest.row.occurredOn,
      occurrenceCount: best.length,
      accountId: newest.row.accountId,
      categoryId: newest.row.categoryId,
    });
  }

  return suggestions
    .sort(
      (a, b) =>
        b.lastSeen.localeCompare(a.lastSeen) ||
        b.occurrenceCount - a.occurrenceCount ||
        a.key.localeCompare(b.key),
    )
    .slice(0, MAX_SUGGESTIONS);
}
