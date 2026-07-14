/**
 * Duplicate fingerprint + transfer-pair heuristics for inbox candidates.
 * Money = integer minor units (VND đồng). Pure functions — no I/O.
 *
 * Fingerprint: hash(account_hint|date|amount|desc_norm)
 * Transfer pair: opposite direction (income↔expense), same amount, same day.
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

export type DuplicateMatch = {
  candidateId: string;
  fingerprint: string;
  otherCandidateId?: string;
  ledgerId?: string;
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
    });
  }

  return matches;
}

export type TransferPair = {
  aId: string;
  bId: string;
  amount: number;
  occurredOn: string;
};

function isOutKind(kind: InboxCandidate["kind"]): boolean {
  return kind === "expense";
}

function isInKind(kind: InboxCandidate["kind"]): boolean {
  return kind === "income";
}

/**
 * Suggest transfer pairs: pending expense + income, same absolute amount, same day.
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

    for (let j = i + 1; j < pending.length; j += 1) {
      const b = pending[j]!;
      if (used.has(b.id)) continue;
      if (b.occurredOn !== a.occurredOn) {
        if (b.occurredOn > a.occurredOn) break;
        continue;
      }
      if (b.amount !== a.amount) continue;
      // Need opposite directions
      const opposite =
        (isOutKind(a.kind) && isInKind(b.kind)) || (isInKind(a.kind) && isOutKind(b.kind));
      if (!opposite) continue;

      let score = 1;
      const ha = accountHint(a);
      const hb = accountHint(b);
      if (ha && hb) {
        if (ha === hb) score = 0; // same account → weak (skip unless no better)
        else score = 3; // different accounts → strong
      } else if (ha || hb) {
        score = 2;
      }

      if (score > bestScore) {
        bestScore = score;
        best = b;
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
        });
      }
    }
  }

  const pairs = findTransferPairs(candidates);
  const pairById = new Map<string, string>();
  for (const p of pairs) {
    pairById.set(p.aId, p.bId);
    pairById.set(p.bId, p.aId);
  }

  return candidates.map((c) => {
    const fp = candidateFingerprint(c);
    const dup = dupById.get(c.id);
    const transferPeer = pairById.get(c.id);
    const possibleDuplicate =
      c.possibleDuplicate === true || Boolean(dup);
    return {
      ...c,
      fingerprint: fp,
      possibleDuplicate,
      duplicateOfId: dup?.otherCandidateId,
      duplicateOfLedgerId: dup?.ledgerId,
      possibleTransfer: Boolean(transferPeer),
      transferPairId: transferPeer,
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
