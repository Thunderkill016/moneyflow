/**
 * Local-first auto-categorization rules (wireframes-inbox §14).
 * Simple contains → category; priority high → low (lower number wins).
 */

export const RULES_STORAGE_KEY = "moneyflow-rules-v1";

/** Field to scan for the contains pattern. */
export type RuleMatchField = "merchant" | "note" | "raw" | "any";

export type InboxRule = {
  id: string;
  /** Lower number = higher priority (wins conflicts). */
  priority: number;
  enabled: boolean;
  /** Case-insensitive substring match. */
  contains: string;
  field: RuleMatchField;
  /** Category label to set when matched (Vietnamese name). */
  category: string;
  /** Optional merchant rename when matched. */
  merchant?: string;
  createdAt: string;
};

export type CreateRuleInput = {
  contains: string;
  category: string;
  field?: RuleMatchField;
  merchant?: string;
  priority?: number;
  enabled?: boolean;
  id?: string;
  createdAt?: string;
};

export type UpdateRuleInput = Partial<
  Omit<InboxRule, "id" | "createdAt">
> & { id: string };

const FIELDS: RuleMatchField[] = ["merchant", "note", "raw", "any"];

export const RULE_FIELD_LABELS: Record<RuleMatchField, string> = {
  merchant: "Nơi chi",
  note: "Ghi chú",
  raw: "Raw text",
  any: "Mọi trường",
};

/** Common category labels for the add form (expense + income). */
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

export function isInboxRule(value: unknown): value is InboxRule {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<InboxRule>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.priority === "number" &&
    Number.isSafeInteger(item.priority) &&
    item.priority >= 1 &&
    typeof item.enabled === "boolean" &&
    typeof item.contains === "string" &&
    item.contains.trim().length > 0 &&
    isRuleMatchField(item.field) &&
    typeof item.category === "string" &&
    item.category.trim().length > 0 &&
    typeof item.createdAt === "string" &&
    Number.isFinite(Date.parse(item.createdAt)) &&
    (item.merchant === undefined || typeof item.merchant === "string")
  );
}

export function sortRulesByPriority(rules: InboxRule[]): InboxRule[] {
  return [...rules].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function nextPriority(rules: InboxRule[]): number {
  if (rules.length === 0) return 1;
  return Math.max(...rules.map((r) => r.priority)) + 1;
}

export function createRule(input: CreateRuleInput): InboxRule {
  const contains = input.contains.trim();
  const category = input.category.trim();
  if (!contains) throw new Error("contains is required");
  if (!category) throw new Error("category is required");
  const merchant =
    input.merchant !== undefined && input.merchant.trim().length > 0
      ? input.merchant.trim()
      : undefined;
  return {
    id: input.id ?? `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    priority: input.priority ?? 1,
    enabled: input.enabled ?? true,
    contains,
    field: input.field ?? "any",
    category,
    merchant,
    createdAt: input.createdAt ?? new Date().toISOString(),
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
      const merged = { ...item, ...patch, id: item.id };
      if (typeof merged.contains === "string") {
        merged.contains = merged.contains.trim();
      }
      if (typeof merged.category === "string") {
        merged.category = merged.category.trim();
      }
      if (merged.merchant !== undefined) {
        const m = merged.merchant.trim();
        merged.merchant = m.length > 0 ? m : undefined;
      }
      if (!isInboxRule(merged)) return item;
      return merged;
    }),
  );
}

export function removeRuleFromList(list: InboxRule[], id: string): InboxRule[] {
  return list.filter((item) => item.id !== id);
}

export function formatRuleSummary(rule: InboxRule): string {
  const fieldLabel =
    rule.field === "any" ? "" : `${RULE_FIELD_LABELS[rule.field]} ~ `;
  const merchantPart = rule.merchant ? ` → ${rule.merchant}` : "";
  return `${fieldLabel}“${rule.contains}”${merchantPart} → ${rule.category}`;
}

export function readStoredRules(): InboxRule[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(RULES_STORAGE_KEY);
    if (saved === null) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isInboxRule)) {
      localStorage.removeItem(RULES_STORAGE_KEY);
      return [];
    }
    return sortRulesByPriority(parsed);
  } catch {
    try {
      localStorage.removeItem(RULES_STORAGE_KEY);
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

export function removeStoredRule(id: string): InboxRule[] {
  const next = removeRuleFromList(readStoredRules(), id);
  writeStoredRules(next);
  return next;
}
