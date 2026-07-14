/**
 * Apply local contains→category rules to parsed candidates.
 * Priority: lower number wins; first enabled match only.
 */

import type { ParsedCandidate } from "./parse-text.ts";
import {
  formatRuleSummary,
  sortRulesByPriority,
  type InboxRule,
  type RuleMatchField,
} from "./rules-store.ts";

export type RuleApplyTarget = {
  merchant: string;
  note: string;
  rawSnippet?: string;
  category?: string;
  matchedRuleId?: string;
  matchedRuleSummary?: string;
};

/**
 * Haystack for a rule field. `any` joins merchant + note + raw.
 */
export function ruleHaystack(
  target: Pick<RuleApplyTarget, "merchant" | "note" | "rawSnippet">,
  field: RuleMatchField,
): string {
  const merchant = target.merchant ?? "";
  const note = target.note ?? "";
  const raw = target.rawSnippet ?? "";
  switch (field) {
    case "merchant":
      return merchant;
    case "note":
      return note;
    case "raw":
      return raw;
    case "any":
    default:
      return `${merchant} ${note} ${raw}`;
  }
}

export function ruleMatches(
  rule: InboxRule,
  target: Pick<RuleApplyTarget, "merchant" | "note" | "rawSnippet">,
): boolean {
  if (!rule.enabled) return false;
  const needle = rule.contains.trim().toLowerCase();
  if (!needle) return false;
  const hay = ruleHaystack(target, rule.field).toLowerCase();
  return hay.includes(needle);
}

/**
 * Find first matching rule by priority (high → low).
 */
export function findMatchingRule(
  rules: InboxRule[],
  target: Pick<RuleApplyTarget, "merchant" | "note" | "rawSnippet">,
): InboxRule | null {
  const ordered = sortRulesByPriority(rules).filter((r) => r.enabled);
  for (const rule of ordered) {
    if (ruleMatches(rule, target)) return rule;
  }
  return null;
}

/**
 * Apply first matching rule: set category (+ optional merchant rename).
 * Does not overwrite category if already set unless `force` is true.
 */
export function applyRuleToTarget<T extends RuleApplyTarget>(
  target: T,
  rules: InboxRule[],
  options: { force?: boolean } = {},
): T {
  if (target.category && !options.force) return target;
  const match = findMatchingRule(rules, target);
  if (!match) return target;
  return {
    ...target,
    category: match.category,
    merchant:
      match.merchant && match.merchant.length > 0
        ? match.merchant
        : target.merchant,
    matchedRuleId: match.id,
    matchedRuleSummary: formatRuleSummary(match),
  };
}

export function applyRulesToTargets<T extends RuleApplyTarget>(
  targets: T[],
  rules: InboxRule[],
  options: { force?: boolean } = {},
): T[] {
  if (rules.length === 0) return targets;
  return targets.map((item) => applyRuleToTarget(item, rules, options));
}

/** Apply rules to paste-parsed candidates (optional step after parse). */
export function applyRulesToParsed(
  candidates: ParsedCandidate[],
  rules: InboxRule[],
  options: { force?: boolean } = {},
): ParsedCandidate[] {
  return applyRulesToTargets(candidates, rules, options);
}
