/**
 * Delete account helpers (wireframes-inbox §20).
 * Typed confirm "XÓA", delete the authenticated Supabase account through a
 * JWT-protected Edge Function, then clear local MoneyFlow stores.
 */

import { CANDIDATE_STORAGE_KEY } from "./inbox/candidate-store.ts";
import { IMPORT_BATCH_STORAGE_KEY } from "./inbox/import-batch-store.ts";
import { IMPORT_DRAFT_STORAGE_KEY } from "./inbox/import-draft-store.ts";
import {
  LEGACY_RULES_STORAGE_KEY,
  RULES_STORAGE_KEY,
} from "./inbox/rules-store.ts";
import { ONBOARDING_STORAGE_KEY } from "./onboarding.ts";
import { PRIVACY_PREFS_KEY } from "./privacy-prefs.ts";
import { PUSH_PREFS_KEY } from "./push-prefs.ts";
import { QUICK_ADD_PREFS_KEY } from "./quick-add-prefs.ts";
import { THEME_STORAGE_KEY } from "./theme-prefs.ts";
import { TRANSACTION_STORAGE_KEY } from "./transaction-store.ts";
import { COMMITMENT_OCCURRENCE_STORAGE_KEY } from "./planning/commitment-occurrence-store.ts";
import {
  INCOME_TEMPLATE_OCCURRENCE_STORAGE_KEY,
  INCOME_TEMPLATE_STORAGE_KEY,
} from "./planning/income-template-store.ts";

/** Exact typed confirmation required (Vietnamese uppercase per wireframe). */
export const DELETE_CONFIRM_TEXT = "XÓA";

/**
 * Known localStorage keys owned by Money Flow product data / prefs.
 * Theme key is intentionally excluded so UI preference can remain after wipe.
 */
export const LOCAL_DATA_STORAGE_KEYS: readonly string[] = [
  CANDIDATE_STORAGE_KEY,
  IMPORT_BATCH_STORAGE_KEY,
  IMPORT_DRAFT_STORAGE_KEY,
  RULES_STORAGE_KEY,
  LEGACY_RULES_STORAGE_KEY,
  TRANSACTION_STORAGE_KEY,
  COMMITMENT_OCCURRENCE_STORAGE_KEY,
  INCOME_TEMPLATE_STORAGE_KEY,
  INCOME_TEMPLATE_OCCURRENCE_STORAGE_KEY,
  PRIVACY_PREFS_KEY,
  PUSH_PREFS_KEY,
  QUICK_ADD_PREFS_KEY,
  ONBOARDING_STORAGE_KEY,
];

/** Prefix for sweeping any additional moneyflow-* keys (except theme). */
export const LOCAL_DATA_KEY_PREFIX = "moneyflow-";
/** Re-export for wipe tests and consumers that import from delete-account. */
export { THEME_STORAGE_KEY };

export function isDeleteConfirmValid(value: string): boolean {
  return value.trim() === DELETE_CONFIRM_TEXT;
}

export type ClearLocalStoresResult = {
  clearedKeys: string[];
  failedKeys: string[];
};

/**
 * Remove product localStorage keys on this device.
 * Safe to call in browser only; no-ops on server.
 */
export function clearLocalMoneyFlowStores(
  storage: Pick<Storage, "getItem" | "removeItem" | "key" | "length"> | null = typeof window !==
  "undefined"
    ? window.localStorage
    : null,
): ClearLocalStoresResult {
  const clearedKeys: string[] = [];
  const failedKeys: string[] = [];
  if (!storage) return { clearedKeys, failedKeys };

  const toRemove = new Set<string>(LOCAL_DATA_STORAGE_KEYS);

  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key) continue;
      if (key === THEME_STORAGE_KEY) continue;
      if (key.startsWith(LOCAL_DATA_KEY_PREFIX)) toRemove.add(key);
    }
  } catch {
    /* length/key may throw in restricted environments — still try known keys */
  }

  for (const key of toRemove) {
    try {
      storage.removeItem(key);
      clearedKeys.push(key);
    } catch {
      failedKeys.push(key);
    }
  }

  clearedKeys.sort();
  failedKeys.sort();
  return { clearedKeys, failedKeys };
}

/** Calm Vietnamese copy for the authenticated server-delete consequence. */
export const SERVER_DELETE_READY_VI =
  "Tài khoản đăng nhập và toàn bộ sổ MoneyFlow gắn với tài khoản này trên Supabase sẽ bị xóa vĩnh viễn. Các thiết bị khác sẽ không thể tải lại dữ liệu và phải đăng nhập lại.";
