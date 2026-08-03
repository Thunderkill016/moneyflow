/**
 * Deterministic categorization rules.
 *
 * Demo mode persists rules in localStorage. Authenticated mode uses the same
 * domain contract through Server Actions. Lower priority numbers win and only
 * the first enabled match is applied.
 */

export const RULES_STORAGE_KEY = "moneyflow-rules-v2";
export const LEGACY_RULES_STORAGE_KEY = "moneyflow-rules-v1";

export type RuleStage = "candidate";
export type RuleCategoryKind = "income" | "expense";
/** Field to scan for the contains pattern. */
export type RuleMatchField = "merchant" | "note" | "raw" | "any";

export type InboxRule = {
  id: string;
  /** The only supported execution stage: before an Inbox candidate is posted. */
  stage: RuleStage;
  /** Lower number = higher priority (wins conflicts). */
  priority: number;
  enabled: boolean;
  /** Case-insensitive substring match. */
  contains: string;
  field: RuleMatchField;
  /** Stable category identity for authenticated rules. */
  categoryId?: string;
  /** Category label retained for display and demo compatibility. */
  category: string;
  /** Derived category kind prevents income/expense cross-application. */
  categoryKind?: RuleCategoryKind;
  /** Optional merchant normalization when matched. */
  merchant?: string;
  /** Monotonic rule revision used as candidate provenance. */
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateRuleInput = {
  contains: string;
  category: string;
  categoryId?: string;
  categoryKind?: RuleCategoryKind;
  stage?: RuleStage;
  field?: RuleMatchField;
  merchant?: string;
  priority?: number;
  enabled?: boolean;
  id?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateRuleInput = Partial<
  Omit<InboxRule, "id" | "createdAt" | "version" | "updatedAt">
> & { id: string; updatedAt?: string };

const FIELDS: RuleMatchField[] = ["merchant", "note", "raw", "any"];
const STAGES: RuleStage[] = ["candidate"];
const CATEGORY_KINDS: RuleCategoryKind[] = ["income", "expense"];
const LEGACY_INCOME_CATEGORIES = new Set(["Lương", "Thưởng", "Thu nhập khác"]);

export const RULE_FIELD_LABELS: Record<RuleMatchField, string> = {
  merchant: "Nơi chi",
  note: "Ghi chú",
  raw: "Nội dung gốc",
  any: "Mọi trường",
};

export const RULE_STAGE_LABELS: Record<RuleStage, string> = {
  candidate: "Trước khi duyệt Inbox",
};

/** Demo fallback labels. Authenticated UI uses the user's actual categories. */
export const RULE_CATEGORY_OPTIONS = [
  "Ăn uống",
  "Di chuyển",
  "Mua sắm",
  "Nhà ở",
  "Hóa đơn",
  "Giải trí",
  "Sức khỏe",
  "Giáo dục",
  "Lương",
  "Thưởng",
  "Thu nhập khác",
] as const;

export function isRuleMatchField(value: unknown): value is RuleMatchField {
  return typeof value === "string" && (FIELDS as string[]).includes(value);
}

export function isRuleStage(value: unknown): value is RuleStage {
  return typeof value === "string" && (STAGES as string[]).includes(value);
}

export function isRuleCategoryKind(value: unknown): value is RuleCategoryKind {
  return typeof value === "string" && (CATEGORY_KINDS as string[]).includes(value);
}

/** Legacy built-in labels can be upgraded without inventing a category UUID. */
export function inferLegacyRuleCategoryKind(category: string): RuleCategoryKind {
  return LEGACY_INCOME_CATEGORIES.has(category.trim()) ? "income" : "expense";
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function isInboxRule(value: unknown): value is InboxRule {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<InboxRule>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    isRuleStage(item.stage) &&
    typeof item.priority === "number" &&
    Number.isSafeInteger(item.priority) &&
    item.priority >= 1 &&
    typeof item.enabled === "boolean" &&
    typeof item.contains === "string" &&
    item.contains.trim().length > 0 &&
    isRuleMatchField(item.field) &&
    (item.categoryId === undefined ||
      (typeof item.categoryId === "string" && item.categoryId.length > 0)) &&
    typeof item.category === "string" &&
    item.category.trim().length > 0 &&
    (item.categoryKind === undefined || isRuleCategoryKind(item.categoryKind)) &&
    typeof item.version === "number" &&
    Number.isSafeInteger(item.version) &&
    item.version >= 1 &&
    validTimestamp(item.createdAt) &&
    validTimestamp(item.updatedAt) &&
    (item.merchant === undefined || typeof item.merchant === "string")
  );
}

/** Upgrade the v1 local shape without inventing category IDs. */
export function normalizeStoredRule(value: unknown): InboxRule | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<InboxRule> & {
    stage?: unknown;
    version?: unknown;
    updatedAt?: unknown;
  };
  const createdAt = validTimestamp(item.createdAt)
    ? item.createdAt
    : new Date(0).toISOString();
  const category = typeof item.category === "string" ? item.category.trim() : "";
  const normalized: InboxRule = {
    id: typeof item.id === "string" ? item.id : "",
    stage: isRuleStage(item.stage) ? item.stage : "candidate",
    priority: typeof item.priority === "number" ? item.priority : 0,
    enabled: item.enabled === true,
    contains: typeof item.contains === "string" ? item.contains.trim() : "",
    field: isRuleMatchField(item.field) ? item.field : "any",
    categoryId:
      typeof item.categoryId === "string" && item.categoryId.length > 0
        ? item.categoryId
        : undefined,
    category,
    categoryKind: isRuleCategoryKind(item.categoryKind)
      ? item.categoryKind
      : inferLegacyRuleCategoryKind(category),
    merchant:
      typeof item.merchant === "string" && item.merchant.trim().length > 0
        ? item.merchant.trim()
        : undefined,
    version:
      typeof item.version === "number" && Number.isSafeInteger(item.version)
        ? item.version
        : 1,
    createdAt,
    updatedAt: validTimestamp(item.updatedAt) ? item.updatedAt : createdAt,
  };
  return isInboxRule(normalized) ? normalized : null;
}

export function sortRulesByPriority(rules: InboxRule[]): InboxRule[] {
  return [...rules].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
    return a.id.localeCompare(b.id);
  });
}

export function nextPriority(rules: InboxRule[]): number {
  if (rules.length === 0) return 1;
  return Math.max(...rules.map((rule) => rule.priority)) + 1;
}

export function createRule(input: CreateRuleInput): InboxRule {
  const contains = input.contains.trim();
  const category = input.category.trim();
  if (!contains) throw new Error("contains is required");
  if (!category) throw new Error("category is required");
  if (
    input.priority !== undefined &&
    (!Number.isSafeInteger(input.priority) || input.priority < 1)
  ) {
    throw new Error("priority must be a positive integer");
  }
  const merchant =
    input.merchant !== undefined && input.merchant.trim().length > 0
      ? input.merchant.trim()
      : undefined;
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    id:
      input.id ??
      `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    stage: input.stage ?? "candidate",
    priority: input.priority ?? 1,
    enabled: input.enabled ?? true,
    contains,
    field: input.field ?? "any",
    categoryId: input.categoryId,
    category,
    categoryKind: input.categoryKind ?? inferLegacyRuleCategoryKind(category),
    merchant,
    version: input.version ?? 1,
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
  };
}

export function upsertRule(list: InboxRule[], rule: InboxRule): InboxRule[] {
  const index = list.findIndex((item) => item.id === rule.id);
  if (index === -1) return sortRulesByPriority([...list, rule]);
  const next = [...list];
  next[index] = rule;
  return sortRulesByPriority(next);
}

export function updateRuleInList(
  list: InboxRule[],
  input: UpdateRuleInput,
): InboxRule[] {
  return sortRulesByPriority(
    list.map((item) => {
      if (item.id !== input.id) return item;
      const patch = { ...input };
      delete (patch as { id?: string }).id;
      const updatedAt = input.updatedAt ?? new Date().toISOString();
      const merged: InboxRule = {
        ...item,
        ...patch,
        id: item.id,
        createdAt: item.createdAt,
        version: item.version + 1,
        updatedAt,
      };
      merged.contains = merged.contains.trim();
      merged.category = merged.category.trim();
      if (merged.merchant !== undefined) {
        const merchant = merged.merchant.trim();
        merged.merchant = merchant.length > 0 ? merchant : undefined;
      }
      return isInboxRule(merged) ? merged : item;
    }),
  );
}

export function removeRuleFromList(list: InboxRule[], id: string): InboxRule[] {
  return list.filter((item) => item.id !== id);
}

export function reorderRules(list: InboxRule[], orderedIds: string[]): InboxRule[] {
  if (orderedIds.length !== list.length || new Set(orderedIds).size !== list.length) {
    return sortRulesByPriority(list);
  }
  const byId = new Map(list.map((rule) => [rule.id, rule] as const));
  if (orderedIds.some((id) => !byId.has(id))) return sortRulesByPriority(list);
  const now = new Date().toISOString();
  return orderedIds.map((id, index) => {
    const rule = byId.get(id)!;
    const priority = index + 1;
    if (rule.priority === priority) return rule;
    return { ...rule, priority, version: rule.version + 1, updatedAt: now };
  });
}

export function formatRuleSummary(rule: InboxRule): string {
  const fieldLabel =
    rule.field === "any" ? "" : `${RULE_FIELD_LABELS[rule.field]} ~ `;
  const merchantPart = rule.merchant ? ` → ${rule.merchant}` : "";
  return `${fieldLabel}“${rule.contains}”${merchantPart} → ${rule.category}`;
}

function readRulePayload(storageKey: string): unknown[] | null {
  const saved = localStorage.getItem(storageKey);
  if (saved === null) return null;
  const parsed: unknown = JSON.parse(saved);
  return Array.isArray(parsed) ? parsed : null;
}

export function readStoredRules(): InboxRule[] {
  if (typeof window === "undefined") return [];
  try {
    const current = readRulePayload(RULES_STORAGE_KEY);
    const legacy = current === null ? readRulePayload(LEGACY_RULES_STORAGE_KEY) : null;
    const payload = current ?? legacy ?? [];
    const normalized = payload.map(normalizeStoredRule);
    if (normalized.some((rule) => rule === null)) {
      localStorage.removeItem(RULES_STORAGE_KEY);
      localStorage.removeItem(LEGACY_RULES_STORAGE_KEY);
      return [];
    }
    const rules = sortRulesByPriority(normalized as InboxRule[]);
    if (legacy !== null) {
      writeStoredRules(rules);
      localStorage.removeItem(LEGACY_RULES_STORAGE_KEY);
    }
    return rules;
  } catch {
    try {
      localStorage.removeItem(RULES_STORAGE_KEY);
      localStorage.removeItem(LEGACY_RULES_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return [];
  }
}

export function writeStoredRules(rules: InboxRule[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    RULES_STORAGE_KEY,
    JSON.stringify(sortRulesByPriority(rules)),
  );
}

export function addStoredRule(input: CreateRuleInput): InboxRule {
  const existing = readStoredRules();
  const rule = createRule({
    ...input,
    priority: input.priority ?? nextPriority(existing),
  });
  writeStoredRules(upsertRule(existing, rule));
  return rule;
}

export function updateStoredRule(input: UpdateRuleInput): InboxRule[] {
  const next = updateRuleInList(readStoredRules(), input);
  writeStoredRules(next);
  return next;
}

export function reorderStoredRules(orderedIds: string[]): InboxRule[] {
  const next = reorderRules(readStoredRules(), orderedIds);
  writeStoredRules(next);
  return next;
}

export function removeStoredRule(id: string): InboxRule[] {
  const next = removeRuleFromList(readStoredRules(), id);
  writeStoredRules(next);
  return next;
}
