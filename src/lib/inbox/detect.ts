/**
 * Duplicate fingerprint + transfer-pair heuristics for inbox candidates.
 * Money = integer minor units (VND đồng). Pure functions — no I/O.
 *
 * Fingerprint: hash(account_hint|date|amount|desc_norm)
 * Transfer pair: opposite direction (income↔expense), same amount, same day.
 * Near tier: same fields but date within ±NEAR_MATCH_WINDOW_DAYS — flag-only
 * for posting-date lag; a human still reviews every flag.
 */

import type { InboxCandidate } from "./candidate-store.ts";

/** Minimal ledger row used when matching candidates against approved transactions. */
export type LedgerLike = {
  id: string;
  kind: "expense" | "income" | "transfer";
  amount: number;
  occurredOn: string;
  note?: string;
  account?: string;
  accountId?: string;
};

export type DetectionFlags = {
  fingerprint: string;
  possibleDuplicate: boolean;
  /** Other candidate id that shares this fingerprint (if any). */
  duplicateOfId?: string;
  /** Ledger transaction id that shares this fingerprint (if any). */
  duplicateOfLedgerId?: string;
  /** Suggested internal transfer with another candidate. */
  possibleTransfer: boolean;
  transferPairId?: string;
  /** Date distance of the duplicate flag: 0 = exact fingerprint, >0 = near tier. */
  duplicateDayDiff?: number;
  /** Date distance of the transfer-pair flag: 0 = same day, >0 = near tier. */
  transferDayDiff?: number;
  /**
   * At least one flag on this candidate came from the ±N-day near tier
   * rather than an exact fingerprint/same-day match.
   */
  nearMatch?: boolean;
};

export type DetectedCandidate = InboxCandidate & DetectionFlags;

/**
 * Normalize free text for fingerprinting: lowercase, strip diacritics-safe
 * collapse, keep letters/digits, collapse whitespace.
 */
export function normalizeDesc(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("vi")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function accountHint(
  item: Pick<InboxCandidate, "accountId" | "account"> | Pick<LedgerLike, "accountId" | "account">,
): string {
  const id = "accountId" in item && item.accountId ? item.accountId.trim() : "";
  if (id) return id.toLocaleLowerCase("vi");
  const name = "account" in item && item.account ? item.account.trim() : "";
  return name ? normalizeDesc(name) : "";
}

/**
 * Description material: prefer raw snippet, else merchant + note.
 */
export function descMaterial(
  item: Pick<InboxCandidate, "merchant" | "note" | "rawSnippet"> | Pick<LedgerLike, "note">,
): string {
  if ("rawSnippet" in item && item.rawSnippet && item.rawSnippet.trim()) {
    return normalizeDesc(item.rawSnippet);
  }
  if ("merchant" in item) {
    const parts = [item.merchant ?? "", item.note ?? ""].filter((p) => p.trim().length > 0);
    return normalizeDesc(parts.join(" "));
  }
  return normalizeDesc(item.note ?? "");
}

/** FNV-1a 32-bit → 8 hex chars (stable, dependency-free). */
export function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Fingerprint key parts joined then hashed.
 * account_hint|date|amount|desc_norm
 */
export function fingerprintParts(
  item: {
    amount: number;
    occurredOn: string;
  } & (
    | Pick<InboxCandidate, "accountId" | "account" | "merchant" | "note" | "rawSnippet">
    | Pick<LedgerLike, "accountId" | "account" | "note">
  ),
): string {
  const account = accountHint(item);
  const date = item.occurredOn.slice(0, 10);
  const amount = String(item.amount);
  const desc = descMaterial(item as Pick<InboxCandidate, "merchant" | "note" | "rawSnippet">);
  return `${account}|${date}|${amount}|${desc}`;
}

export function candidateFingerprint(
  item: Pick<
    InboxCandidate,
    "amount" | "occurredOn" | "accountId" | "account" | "merchant" | "note" | "rawSnippet"
  >,
): string {
  return fnv1aHex(fingerprintParts(item));
}

export function ledgerFingerprint(item: LedgerLike): string {
  return fnv1aHex(
    fingerprintParts({
      amount: item.amount,
      occurredOn: item.occurredOn,
      accountId: item.accountId,
      account: item.account,
      note: item.note,
    }),
  );
}

/** Calendar-day distance between two YYYY-MM-DD prefixes (UTC, DST-safe). */
export function dayDiff(a: string, b: string): number {
  const da = Date.parse(`${a.slice(0, 10)}T00:00:00Z`);
  const db = Date.parse(`${b.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(da) || !Number.isFinite(db)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.round(Math.abs(da - db) / 86_400_000);
}

/**
 * Maximum date distance for the near tier. Chosen for T+1/T+2 posting lag on
 * Vietnamese interbank transfers and card settlements — deliberately narrower
 * than Actual Budget's ±7d, which suits a different ledger shape.
 */
export const NEAR_MATCH_WINDOW_DAYS = 2;

/** Loose match key ignoring the date: account_hint|amount|desc_norm. */
function looseKey(
  item: { amount: number } & (
    | Pick<InboxCandidate, "accountId" | "account" | "merchant" | "note" | "rawSnippet">
    | Pick<LedgerLike, "accountId" | "account" | "note">
  ),
): string {
  return `${accountHint(item)}|${item.amount}|${descMaterial(
    item as Pick<InboxCandidate, "merchant" | "note" | "rawSnippet">,
  )}`;
}

export type DuplicateMatch = {
  candidateId: string;
  fingerprint: string;
  otherCandidateId?: string;
  ledgerId?: string;
  /** 0 = exact fingerprint; >0 = near-tier date distance in days. */
  dayDiff?: number;
};

/**
 * Find candidates that share a fingerprint with another pending/active candidate
 * or with a ledger row (approved money already on books).
 * Only pending candidates are flagged as possible duplicates.
 */
export function findDuplicateMatches(
  candidates: InboxCandidate[],
  ledger: LedgerLike[] = [],
): DuplicateMatch[] {
  const byFp = new Map<string, string[]>();
  for (const c of candidates) {
    if (c.status === "rejected") continue;
    const fp = candidateFingerprint(c);
    const list = byFp.get(fp) ?? [];
    list.push(c.id);
    byFp.set(fp, list);
  }

  const ledgerByFp = new Map<string, string>();
  for (const row of ledger) {
    if (row.kind === "transfer") continue;
    const fp = ledgerFingerprint(row);
    if (!ledgerByFp.has(fp)) ledgerByFp.set(fp, row.id);
  }

  const matches: DuplicateMatch[] = [];
  const seen = new Set<string>();

  for (const c of candidates) {
    if (c.status !== "pending") continue;
    const fp = candidateFingerprint(c);
    const peers = (byFp.get(fp) ?? []).filter((id) => id !== c.id);
    const ledgerId = ledgerByFp.get(fp);
    if (peers.length === 0 && !ledgerId) continue;
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    matches.push({
      candidateId: c.id,
      fingerprint: fp,
      otherCandidateId: peers[0],
      ledgerId,
      dayDiff: 0,
    });
  }

  /*
   * Near tier: same account/amount/description but posted 1–2 days apart.
   * Bank posting lag and manual-entry date slips make exact fingerprints miss
   * real duplicates; flag-only — the reviewer still decides.
   */
  const looseBuckets = new Map<string, { id: string; date: string; ledger: boolean }[]>();
  const addLoose = (key: string, id: string, date: string, ledger: boolean) => {
    const list = looseBuckets.get(key) ?? [];
    list.push({ id, date, ledger });
    looseBuckets.set(key, list);
  };
  for (const c of candidates) {
    // An empty description would reduce the near tier to amount+date noise.
    if (c.status === "rejected" || descMaterial(c) === "") continue;
    addLoose(looseKey(c), c.id, c.occurredOn, false);
  }
  for (const row of ledger) {
    if (row.kind === "transfer") continue;
    if (descMaterial(row) === "") continue;
    addLoose(looseKey(row), row.id, row.occurredOn, true);
  }

  for (const c of candidates) {
    if (c.status !== "pending" || seen.has(c.id)) continue;
    const peers = looseBuckets.get(looseKey(c)) ?? [];
    let best: { id: string; ledger: boolean; dayDiff: number } | null = null;
    for (const peer of peers) {
      if (peer.id === c.id) continue;
      const diff = dayDiff(c.occurredOn, peer.date);
      if (diff < 1 || diff > NEAR_MATCH_WINDOW_DAYS) continue;
      if (!best || diff < best.dayDiff) {
        best = { id: peer.id, ledger: peer.ledger, dayDiff: diff };
      }
    }
    if (!best) continue;
    seen.add(c.id);
    matches.push({
      candidateId: c.id,
      fingerprint: candidateFingerprint(c),
      otherCandidateId: best.ledger ? undefined : best.id,
      ledgerId: best.ledger ? best.id : undefined,
      dayDiff: best.dayDiff,
    });
  }

  return matches;
}

export type TransferPair = {
  aId: string;
  bId: string;
  amount: number;
  occurredOn: string;
  /** 0 = same day; >0 = near-tier date distance in days. */
  dayDiff: number;
};

function isOutKind(kind: InboxCandidate["kind"]): boolean {
  return kind === "expense";
}

function isInKind(kind: InboxCandidate["kind"]): boolean {
  return kind === "income";
}

/**
 * Suggest transfer pairs: pending expense + income, same absolute amount,
 * dates within NEAR_MATCH_WINDOW_DAYS (same day preferred — settlement lag
 * between two own accounts often posts on adjacent days).
 * Prefer different accounts when both have account hints.
 * Greedy: each candidate at most one pair (stable by id order).
 */
export function findTransferPairs(candidates: InboxCandidate[]): TransferPair[] {
  const pending = candidates
    .filter((c) => c.status === "pending" && (isOutKind(c.kind) || isInKind(c.kind)))
    .slice()
    .sort((a, b) => {
      if (a.occurredOn !== b.occurredOn) return a.occurredOn.localeCompare(b.occurredOn);
      return a.id.localeCompare(b.id);
    });

  const used = new Set<string>();
  const pairs: TransferPair[] = [];

  for (let i = 0; i < pending.length; i += 1) {
    const a = pending[i]!;
    if (used.has(a.id)) continue;
    if (!isOutKind(a.kind) && !isInKind(a.kind)) continue;

    let best: InboxCandidate | null = null;
    let bestScore = -1;
    let bestDiff = 0;

    for (let j = i + 1; j < pending.length; j += 1) {
      const b = pending[j]!;
      if (used.has(b.id)) continue;
      const diff = dayDiff(a.occurredOn, b.occurredOn);
      if (diff > NEAR_MATCH_WINDOW_DAYS) {
        if (b.occurredOn > a.occurredOn) break;
        continue;
      }
      if (b.amount !== a.amount) continue;
      // Need opposite directions
      const opposite =
        (isOutKind(a.kind) && isInKind(b.kind)) || (isInKind(a.kind) && isOutKind(b.kind));
      if (!opposite) continue;

      let accountScore = 1;
      const ha = accountHint(a);
      const hb = accountHint(b);
      if (ha && hb) {
        if (ha === hb) accountScore = 0; // same account → never a transfer
        else accountScore = 3; // different accounts → strong
      } else if (ha || hb) {
        accountScore = 2;
      }
      // Prefer account evidence, then closer dates.
      const score = accountScore * 10 - diff;

      if (score > bestScore) {
        bestScore = score;
        best = b;
        bestDiff = diff;
      }
    }

    if (best && bestScore > 0) {
      used.add(a.id);
      used.add(best.id);
      pairs.push({
        aId: a.id,
        bId: best.id,
        amount: a.amount,
        occurredOn: a.occurredOn,
        dayDiff: bestDiff,
      });
    }
  }

  return pairs;
}

/**
 * Annotate candidates with fingerprint + duplicate/transfer flags.
 * Does not mutate input. Preserves existing possibleDuplicate=true if already set.
 */
export function annotateCandidates(
  candidates: InboxCandidate[],
  ledger: LedgerLike[] = [],
): DetectedCandidate[] {
  const dupMatches = findDuplicateMatches(candidates, ledger);
  const dupById = new Map(dupMatches.map((m) => [m.candidateId, m]));
  // Also flag peer of each match
  for (const m of dupMatches) {
    if (m.otherCandidateId && !dupById.has(m.otherCandidateId)) {
      const peer = candidates.find((c) => c.id === m.otherCandidateId);
      if (peer && peer.status === "pending") {
        dupById.set(m.otherCandidateId, {
          candidateId: m.otherCandidateId,
          fingerprint: m.fingerprint,
          otherCandidateId: m.candidateId,
          ledgerId: m.ledgerId,
          dayDiff: m.dayDiff,
        });
      }
    }
  }

  const pairs = findTransferPairs(candidates);
  const pairById = new Map<string, { peerId: string; dayDiff: number }>();
  for (const p of pairs) {
    pairById.set(p.aId, { peerId: p.bId, dayDiff: p.dayDiff });
    pairById.set(p.bId, { peerId: p.aId, dayDiff: p.dayDiff });
  }

  return candidates.map((c) => {
    const fp = candidateFingerprint(c);
    const dup = dupById.get(c.id);
    const transferPeer = pairById.get(c.id);
    const possibleDuplicate =
      c.possibleDuplicate === true || Boolean(dup);
    const duplicateDayDiff = dup?.dayDiff;
    const transferDayDiff = transferPeer?.dayDiff;
    const nearMatch =
      (duplicateDayDiff ?? 0) > 0 || (transferDayDiff ?? 0) > 0;
    return {
      ...c,
      fingerprint: fp,
      possibleDuplicate,
      duplicateOfId: dup?.otherCandidateId,
      duplicateOfLedgerId: dup?.ledgerId,
      possibleTransfer: Boolean(transferPeer),
      transferPairId: transferPeer?.peerId,
      duplicateDayDiff,
      transferDayDiff,
      nearMatch: nearMatch || undefined,
    };
  });
}

/**
 * Filter helper: pending candidates that look like transfers
 * (kind=transfer OR suggested pair).
 */
export function isTransferLike(
  item: Pick<InboxCandidate, "kind"> & { possibleTransfer?: boolean },
): boolean {
  return item.kind === "transfer" || item.possibleTransfer === true;
}
