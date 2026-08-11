/**
 * D2 — MoneyFlow archive restore v1 is **empty-only**.
 *
 * No merge into an existing ledger, no deduplication, no row replacement, no
 * best-effort, no silently skipped conflicts. A restore either goes into a
 * target that satisfies the precondition below, or it is refused before any
 * write.
 *
 * Pure: this evaluates an already-collected snapshot. The query that produces
 * the snapshot belongs to a later slice, not here.
 */

import { ARCHIVE_TABLE_INVENTORY } from "./moneyflow-archive.ts";

/**
 * Signup is not a blank slate. `handle_new_user` fires on `auth.users` insert
 * and creates, in one trigger:
 *
 * - one `profiles` row;
 * - one `accounts` row (`Tiền mặt`, `cash`, `VND`);
 * - eleven `categories` rows with `is_default = true`.
 *
 * So a freshly created MoneyFlow account can never be literally empty, and an
 * "all counts zero" precondition would make restore impossible for exactly the
 * user who needs it — someone who just made a new account to recover into.
 * These three are the smallest exact exception, and nothing else is allowed.
 */
export const BOOTSTRAP_MAX_PROFILES = 1;
export const BOOTSTRAP_MAX_ACCOUNTS = 1;

export type TenantStateSnapshot = {
  /** Row count per tenant table name, exactly as named in `purge_user_tenant_data`. */
  readonly counts: Readonly<Record<string, number>>;
  /**
   * Categories with `is_default = false`. Bootstrap creates only defaults, so a
   * single user-made category proves the tenant has been used.
   *
   * Counted rather than bounded by eleven on purpose: a later migration may add
   * or remove a default category, and this contract should not silently break
   * when it does.
   */
  readonly nonDefaultCategoryCount: number;
};

export type RestoreTargetRejectionCode =
  | "snapshot_malformed"
  | "table_count_missing"
  | "table_count_malformed"
  | "table_not_empty"
  | "profiles_exceed_bootstrap"
  | "accounts_exceed_bootstrap"
  | "categories_beyond_bootstrap";

export type RestoreTargetRejection = {
  readonly code: RestoreTargetRejectionCode;
  readonly table: string;
};

export type RestoreTargetEligibility =
  | { readonly eligible: true; readonly bootstrapOnly: boolean }
  | { readonly eligible: false; readonly reasons: readonly RestoreTargetRejection[] };

/**
 * Decide whether a tenant may receive a restore.
 *
 * Unknown state is a rejection, never a guess: a table absent from the snapshot
 * is treated as unproven, not as zero.
 */
export function evaluateRestoreTargetState(snapshot: unknown): RestoreTargetEligibility {
  if (
    typeof snapshot !== "object" ||
    snapshot === null ||
    Array.isArray(snapshot) ||
    !("counts" in snapshot) ||
    !("nonDefaultCategoryCount" in snapshot)
  ) {
    return { eligible: false, reasons: [{ code: "snapshot_malformed", table: "" }] };
  }

  const { counts, nonDefaultCategoryCount } = snapshot as TenantStateSnapshot;
  if (typeof counts !== "object" || counts === null || Array.isArray(counts)) {
    return { eligible: false, reasons: [{ code: "snapshot_malformed", table: "counts" }] };
  }
  if (!Number.isSafeInteger(nonDefaultCategoryCount) || nonDefaultCategoryCount < 0) {
    return {
      eligible: false,
      reasons: [{ code: "snapshot_malformed", table: "nonDefaultCategoryCount" }],
    };
  }

  const reasons: RestoreTargetRejection[] = [];
  let bootstrapOnly = false;

  for (const entry of ARCHIVE_TABLE_INVENTORY) {
    const table = entry.table;
    if (!(table in counts)) {
      reasons.push({ code: "table_count_missing", table });
      continue;
    }
    const count = counts[table];
    if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
      reasons.push({ code: "table_count_malformed", table });
      continue;
    }

    if (table === "profiles") {
      if (count > BOOTSTRAP_MAX_PROFILES) {
        reasons.push({ code: "profiles_exceed_bootstrap", table });
      } else if (count > 0) {
        bootstrapOnly = true;
      }
      continue;
    }

    if (table === "accounts") {
      // `accounts` has no `is_default` column, unlike `categories`, so the
      // bootstrap account cannot be identified structurally. The allowance is
      // therefore count-based: at most one. Recorded as a named limitation.
      if (count > BOOTSTRAP_MAX_ACCOUNTS) {
        reasons.push({ code: "accounts_exceed_bootstrap", table });
      } else if (count > 0) {
        bootstrapOnly = true;
      }
      continue;
    }

    if (table === "categories") {
      if (nonDefaultCategoryCount > 0) {
        reasons.push({ code: "categories_beyond_bootstrap", table });
      } else if (count > 0) {
        bootstrapOnly = true;
      }
      continue;
    }

    if (count > 0) {
      reasons.push({ code: "table_not_empty", table });
    }
  }

  if (reasons.length > 0) return { eligible: false, reasons };
  return { eligible: true, bootstrapOnly };
}
