/**
 * Shared contract for server-persisted advisory dismissals
 * (`pattern_dismissals` table). The scope whitelist mirrors the SQL CHECK —
 * adding a domain is a deliberate migration plus one entry here, never a
 * caller-supplied string.
 */

export const DISMISSAL_SCOPES = ["ledger_dupe", "recurring"] as const;
export type DismissalScope = (typeof DISMISSAL_SCOPES)[number];

/** fnv1a-hex pattern keys — same shape both dismissal modules already use. */
export const PATTERN_KEY_SHAPE = /^[0-9a-f]{8}$/;

/** Matches the RPC batch bound — one dismiss-all can carry many groups. */
export const DISMISSAL_BATCH_MAX = 500;

export function isDismissalScope(value: unknown): value is DismissalScope {
  return (
    typeof value === "string" &&
    (DISMISSAL_SCOPES as readonly string[]).includes(value)
  );
}
