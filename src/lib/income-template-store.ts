/**
 * Demo-mode persistence for income templates + monthly receipt occurrences.
 * Server path uses Supabase recurring_income_templates / income_template_occurrences.
 */

import {
  type IncomeTemplateOccurrenceMap,
  type RecurringIncomeTemplate,
  applyIncomeOccurrenceMap,
  clearIncomeOccurrence,
  recordIncomeOccurrence,
} from "./income-templates.ts";

export const INCOME_TEMPLATE_STORAGE_KEY = "moneyflow-demo-income-templates-v1";
export const INCOME_TEMPLATE_OCCURRENCE_STORAGE_KEY =
  "moneyflow-demo-income-template-occurrences-v1";

function isOccurrenceMap(value: unknown): value is IncomeTemplateOccurrenceMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  for (const [month, rows] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-01$/.test(month)) return false;
    if (!rows || typeof rows !== "object" || Array.isArray(rows)) return false;
    for (const [templateId, transactionId] of Object.entries(
      rows as Record<string, unknown>,
    )) {
      if (typeof templateId !== "string" || templateId.length === 0) return false;
      if (typeof transactionId !== "string" || transactionId.length === 0) return false;
    }
  }
  return true;
}

function isTemplateList(value: unknown): value is RecurringIncomeTemplate[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as RecurringIncomeTemplate;
    return (
      typeof row.id === "string" &&
      typeof row.name === "string" &&
      Number.isSafeInteger(row.amount) &&
      row.amount > 0 &&
      Number.isInteger(row.dueDay) &&
      row.dueDay >= 1 &&
      row.dueDay <= 31 &&
      typeof row.accountId === "string" &&
      typeof row.categoryId === "string" &&
      typeof row.isArchived === "boolean"
    );
  });
}

export function readIncomeOccurrenceMap(
  storage: Pick<Storage, "getItem" | "removeItem"> | null = typeof window !==
  "undefined"
    ? window.localStorage
    : null,
): IncomeTemplateOccurrenceMap {
  if (!storage) return {};
  try {
    const raw = storage.getItem(INCOME_TEMPLATE_OCCURRENCE_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!isOccurrenceMap(parsed)) {
      storage.removeItem(INCOME_TEMPLATE_OCCURRENCE_STORAGE_KEY);
      return {};
    }
    return parsed;
  } catch {
    try {
      storage.removeItem(INCOME_TEMPLATE_OCCURRENCE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return {};
  }
}

export function writeIncomeOccurrenceMap(
  map: IncomeTemplateOccurrenceMap,
  storage: Pick<Storage, "setItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): void {
  if (!storage) return;
  storage.setItem(INCOME_TEMPLATE_OCCURRENCE_STORAGE_KEY, JSON.stringify(map));
}

/** Optional override list for demo template edits (session-persisted). */
export function readStoredIncomeTemplates(
  storage: Pick<Storage, "getItem" | "removeItem"> | null = typeof window !==
  "undefined"
    ? window.localStorage
    : null,
): RecurringIncomeTemplate[] | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(INCOME_TEMPLATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isTemplateList(parsed)) {
      storage.removeItem(INCOME_TEMPLATE_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    try {
      storage.removeItem(INCOME_TEMPLATE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function writeStoredIncomeTemplates(
  items: RecurringIncomeTemplate[],
  storage: Pick<Storage, "setItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): void {
  if (!storage) return;
  // Persist template identity only; monthly received state lives in occurrence map.
  const stripped = items.map((item) => ({
    ...item,
    isReceived: false,
    transactionId: null,
  }));
  storage.setItem(INCOME_TEMPLATE_STORAGE_KEY, JSON.stringify(stripped));
}

export function hydrateIncomeTemplatesWithOccurrences(
  items: RecurringIncomeTemplate[],
  monthStart: string,
  storage: Pick<Storage, "getItem" | "removeItem"> | null = typeof window !==
  "undefined"
    ? window.localStorage
    : null,
): RecurringIncomeTemplate[] {
  const map = readIncomeOccurrenceMap(storage);
  if (!map[monthStart]) return items;
  return applyIncomeOccurrenceMap(items, monthStart, map);
}

export function persistIncomeReceiptOccurrence(
  monthStart: string,
  templateId: string,
  transactionId: string,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null = typeof window !==
  "undefined"
    ? window.localStorage
    : null,
): IncomeTemplateOccurrenceMap {
  const next = recordIncomeOccurrence(
    readIncomeOccurrenceMap(storage),
    monthStart,
    templateId,
    transactionId,
  );
  writeIncomeOccurrenceMap(next, storage);
  return next;
}

export function persistUndoIncomeReceipt(
  monthStart: string,
  templateId: string,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null = typeof window !==
  "undefined"
    ? window.localStorage
    : null,
): IncomeTemplateOccurrenceMap {
  const next = clearIncomeOccurrence(
    readIncomeOccurrenceMap(storage),
    monthStart,
    templateId,
  );
  writeIncomeOccurrenceMap(next, storage);
  return next;
}
