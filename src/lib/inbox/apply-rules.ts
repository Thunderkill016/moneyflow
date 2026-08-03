/**
 * Apply deterministic contains→normalization rules to Inbox candidates.
 * Priority: lower number wins; first enabled candidate-stage match only.
 */

import type { CandidateKind } from "./candidate-store.ts";
import type { ParsedCandidate } from "./parse-text.ts";
import {
  formatRuleSummary,
  sortRulesByPriority,
  type InboxRule,
  type RuleMatchField,
} from "./rules-store.ts";

export type RuleApplyTarget = {
  kind?: CandidateKind;
  merchant: string;
  note: string;
  rawSnippet?: string;
  categoryId?: string;
  category?: string;
  matchedRuleId?: string;
  matchedRuleVersion?: number;
  matchedRuleSummary?: string;
};

type RuleResultFields = Pick<
  RuleApplyTarget,
  | "categoryId"
  | "category"
  | "matchedRuleId"
  | "matchedRuleVersion"
  | "matchedRuleSummary"
>;

export type RuleAppliedTarget<T extends RuleApplyTarget> = T & RuleResultFields;

export type RuleApplicationPreview<T extends RuleApplyTarget> = {
  original: T;
  result: RuleAppliedTarget<T>;
  match: InboxRule | null;
  changed: boolean;
};

/** Haystack for one immutable/raw matching field. */
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
  target: Pick<RuleApplyTarget, "kind" | "merchant" | "note" | "rawSnippet">,
): boolean {
  if (!rule.enabled || rule.stage !== "candidate") return false;
  if (target.kind === "transfer") return false;
  if (rule.categoryKind && target.kind && rule.categoryKind !== target.kind) {
    return false;
  }
  const needle = rule.contains.trim().toLocaleLowerCase("vi");
  if (!needle) return false;
  const haystack = ruleHaystack(target, rule.field).toLocaleLowerCase("vi");
  return haystack.includes(needle);
}

/** Find the first enabled matching rule by stable priority order. */
export function findMatchingRule(
  rules: InboxRule[],
  target: Pick<RuleApplyTarget, "kind" | "merchant" | "note" | "rawSnippet">,
): InboxRule | null {
  for (const rule of sortRulesByPriority(rules)) {
    if (ruleMatches(rule, target)) return rule;
  }
  return null;
}

function unchangedResult<T extends RuleApplyTarget>(
  target: T,
): RuleAppliedTarget<T> {
  return target as RuleAppliedTarget<T>;
}

function applyKnownMatch<T extends RuleApplyTarget>(
  target: T,
  match: InboxRule,
): RuleAppliedTarget<T> {
  return {
    ...target,
    categoryId: match.categoryId ?? target.categoryId,
    category: match.category,
    merchant:
      match.merchant && match.merchant.length > 0
        ? match.merchant
        : target.merchant,
    matchedRuleId: match.id,
    matchedRuleVersion: match.version,
    matchedRuleSummary: formatRuleSummary(match),
  };
}

/**
 * Preview the exact deterministic result without persisting or posting it.
 * Existing normalized category is retained unless force=true.
 */
export function previewRuleApplication<T extends RuleApplyTarget>(
  target: T,
  rules: InboxRule[],
  options: { force?: boolean } = {},
): RuleApplicationPreview<T> {
  if ((target.category || target.categoryId) && !options.force) {
    return {
      original: target,
      result: unchangedResult(target),
      match: null,
      changed: false,
    };
  }
  const match = findMatchingRule(rules, target);
  if (!match) {
    return {
      original: target,
      result: unchangedResult(target),
      match: null,
      changed: false,
    };
  }
  const result = applyKnownMatch(target, match);
  return {
    original: target,
    result,
    match,
    changed:
      result.categoryId !== target.categoryId ||
      result.category !== target.category ||
      result.merchant !== target.merchant,
  };
}

/** Apply the preview result. This never posts a transaction. */
export function applyRuleToTarget<T extends RuleApplyTarget>(
  target: T,
  rules: InboxRule[],
  options: { force?: boolean } = {},
): RuleAppliedTarget<T> {
  return previewRuleApplication(target, rules, options).result;
}

export function applyRulesToTargets<T extends RuleApplyTarget>(
  targets: T[],
  rules: InboxRule[],
  options: { force?: boolean } = {},
): RuleAppliedTarget<T>[] {
  if (rules.length === 0) return targets.map(unchangedResult);
  return targets.map((item) => applyRuleToTarget(item, rules, options));
}

/** Apply rules to paste-parsed candidates after parse, before Inbox persistence. */
export function applyRulesToParsed(
  candidates: ParsedCandidate[],
  rules: InboxRule[],
  options: { force?: boolean } = {},
): RuleAppliedTarget<ParsedCandidate>[] {
  return applyRulesToTargets(candidates, rules, options);
}

/** Resolve legacy label-only rules to a concrete category ID for the given kind. */
export function resolveCategoryIdForRuleMatch(
  match: InboxRule | null,
  categories: Array<{ id: string; name: string; kind: string }>,
  kind: string,
): string | null {
  if (!match) return null;
  if (
    match.categoryId &&
    categories.some(
      (item) => item.id === match.categoryId && item.kind === kind,
    )
  ) {
    return match.categoryId;
  }
  const found = categories.find(
    (item) => item.kind === kind && item.name === match.category,
  );
  return found?.id ?? null;
}
