import assert from "node:assert/strict";
import test from "node:test";
import {
  applyRuleToTarget,
  applyRulesToParsed,
  findMatchingRule,
  previewRuleApplication,
  resolveCategoryIdForRuleMatch,
  resolveRuleCategoryFill,
  ruleMatches,
} from "./apply-rules.ts";
import type { ParsedCandidate } from "./parse-text.ts";
import type { InboxRule } from "./rules-store.ts";

function rule(input: Partial<InboxRule> & Pick<InboxRule, "id" | "contains" | "category">): InboxRule {
  return {
    stage: "candidate",
    priority: 1,
    enabled: true,
    field: "any",
    version: 1,
    createdAt: "2026-07-12T02:10:00.000Z",
    updatedAt: "2026-07-12T02:10:00.000Z",
    ...input,
  };
}

const highlands = rule({
  id: "rule-1",
  contains: "HIGHLANDS",
  categoryId: "cat-food",
  category: "Ăn uống",
  categoryKind: "expense",
  merchant: "Highlands Coffee",
  version: 4,
});

const luong = rule({
  id: "rule-2",
  priority: 2,
  contains: "LUONG",
  field: "raw",
  categoryId: "cat-salary",
  category: "Lương",
  categoryKind: "income",
});

const grabDisabled = rule({
  id: "rule-3",
  enabled: false,
  contains: "GRAB",
  field: "merchant",
  category: "Di chuyển",
  categoryKind: "expense",
});

test("ruleMatches is case-insensitive and stage bounded", () => {
  assert.equal(
    ruleMatches(highlands, {
      kind: "expense",
      merchant: "highlands 45k",
      note: "",
      rawSnippet: "HIGHLANDS 45k",
    }),
    true,
  );
  assert.equal(
    ruleMatches({ ...highlands, enabled: false }, {
      kind: "expense",
      merchant: "HIGHLANDS",
      note: "",
    }),
    false,
  );
});

test("category kind and transfer boundaries block wrong candidate matches", () => {
  assert.equal(
    ruleMatches(luong, {
      kind: "expense",
      merchant: "LUONG",
      note: "",
      rawSnippet: "LUONG CT +25000000",
    }),
    false,
  );
  assert.equal(
    ruleMatches(highlands, {
      kind: "transfer",
      merchant: "HIGHLANDS",
      note: "",
    }),
    false,
  );
});

test("field merchant ignores a raw-only match", () => {
  const merchantOnly = { ...highlands, field: "merchant" as const };
  assert.equal(
    ruleMatches(merchantOnly, {
      kind: "expense",
      merchant: "Cafe",
      note: "",
      rawSnippet: "HIGHLANDS 45k",
    }),
    false,
  );
  assert.equal(
    ruleMatches(merchantOnly, { kind: "expense", merchant: "HIGHLANDS", note: "" }),
    true,
  );
});

test("lower priority wins and disabled rules are skipped", () => {
  const lower = rule({
    id: "rule-low",
    priority: 5,
    contains: "HIGHLANDS",
    category: "Mua sắm",
    categoryKind: "expense",
  });
  const match = findMatchingRule([lower, grabDisabled, highlands], {
    kind: "expense",
    merchant: "HIGHLANDS",
    note: "",
  });
  assert.equal(match?.id, "rule-1");
});

test("preview exposes normalized output and immutable rule revision", () => {
  const preview = previewRuleApplication(
    {
      kind: "expense" as const,
      merchant: "HIGHLANDS 45K",
      note: "",
      rawSnippet: "HIGHLANDS 45k",
    },
    [highlands, luong],
  );
  assert.equal(preview.changed, true);
  assert.equal(preview.match?.id, "rule-1");
  assert.equal(preview.result.categoryId, "cat-food");
  assert.equal(preview.result.category, "Ăn uống");
  assert.equal(preview.result.merchant, "Highlands Coffee");
  assert.equal(preview.result.matchedRuleId, "rule-1");
  assert.equal(preview.result.matchedRuleVersion, 4);
  assert.ok(preview.result.matchedRuleSummary?.includes("Ăn uống"));
});

test("existing normalized category is retained unless force is explicit", () => {
  const target = {
    kind: "expense" as const,
    merchant: "HIGHLANDS",
    note: "",
    category: "Giải trí",
  };
  assert.equal(applyRuleToTarget(target, [highlands]).category, "Giải trí");
  assert.equal(
    applyRuleToTarget(target, [highlands], { force: true }).category,
    "Ăn uống",
  );
});

test("applyRulesToParsed enriches candidates without posting", () => {
  const parsed: ParsedCandidate[] = [
    {
      kind: "expense",
      amount: 45_000,
      merchant: "Highlands",
      note: "",
      occurredOn: "2026-07-12",
      confidence: "medium",
      uncertainFields: ["date"],
      explanations: [],
      rawSnippet: "HIGHLANDS 45k",
    },
    {
      kind: "income",
      amount: 25_000_000,
      merchant: "CT",
      note: "",
      occurredOn: "2026-07-12",
      confidence: "high",
      uncertainFields: [],
      explanations: [],
      rawSnippet: "LUONG CT +25000000",
    },
  ];
  const next = applyRulesToParsed(parsed, [highlands, luong]);
  assert.equal(next[0]?.category, "Ăn uống");
  assert.equal(next[0]?.merchant, "Highlands Coffee");
  assert.equal(next[1]?.category, "Lương");
});

const categories = [
  { id: "cat-food", name: "Ăn uống", kind: "expense" },
  { id: "cat-shopping", name: "Mua sắm", kind: "expense" },
  { id: "cat-salary", name: "Lương", kind: "income" },
];

test("category resolution prefers stable ID and enforces transaction kind", () => {
  assert.equal(resolveCategoryIdForRuleMatch(highlands, categories, "expense"), "cat-food");
  assert.equal(resolveCategoryIdForRuleMatch(luong, categories, "expense"), null);
  assert.equal(resolveCategoryIdForRuleMatch(null, categories, "expense"), null);
});

/*
 * Manual-capture draft fill: the add-transaction dialog evaluates saved rules
 * against the LIVE payee (merchant haystack) and note, fills only the draft
 * category with visible attribution, and never rewrites the typed payee.
 */
const captureCategories = [
  { id: "cat-food", name: "Ăn uống", kind: "expense" },
  { id: "cat-travel", name: "Di chuyển", kind: "expense" },
  { id: "cat-salary", name: "Lương", kind: "income" },
];

const grabMerchantRule = rule({
  id: "rule-grab-merchant",
  contains: "grab",
  field: "merchant",
  categoryId: "cat-travel",
  category: "Di chuyển",
  categoryKind: "expense",
});

test("capture fill: a merchant-field rule fires on the typed payee", () => {
  const fill = resolveRuleCategoryFill(
    [grabMerchantRule],
    { kind: "expense", merchant: "Grab bike đêm", note: "" },
    captureCategories,
  );
  assert.equal(fill?.categoryId, "cat-travel");
  assert.equal(fill?.match.id, "rule-grab-merchant");
  assert.equal(fill?.hint, "tự động theo quy tắc “grab” → Di chuyển");
});

test("capture fill: an any-field rule sees payee text on the note-change path", () => {
  // The note-change evaluation passes the live payee as merchant, so an
  // any-field rule matches payee text even when the note itself is unrelated.
  const grabAny = rule({ ...grabMerchantRule, id: "rule-grab-any", field: "any" });
  const fill = resolveRuleCategoryFill(
    [grabAny],
    { kind: "expense", merchant: "Grab bike", note: "cà phê với bạn" },
    captureCategories,
  );
  assert.equal(fill?.categoryId, "cat-travel");
  assert.equal(fill?.match.id, "rule-grab-any");
});

test("capture fill: the rule category is returned, not any learned suggestion", () => {
  // Deterministic rules are authoritative: when a saved rule and learned
  // ledger history would point at different categories, the fill carries the
  // rule's category — the dialog suppresses the learned chip while the rule
  // attribution hint is visible.
  const learnedWouldSuggest = "cat-food";
  const fill = resolveRuleCategoryFill(
    [grabMerchantRule],
    { kind: "expense", merchant: "Grab", note: "" },
    captureCategories,
  );
  assert.equal(fill?.categoryId, "cat-travel");
  assert.notEqual(fill?.categoryId, learnedWouldSuggest);
});

test("capture fill: a merchant normalization action never rewrites the payee", () => {
  // highlands carries merchant: "Highlands Coffee"; the fill result has no
  // payee output at all, so applying it can only touch the draft category.
  const fill = resolveRuleCategoryFill(
    [highlands],
    { kind: "expense", merchant: "HIGHLANDS 45k", note: "" },
    captureCategories,
  );
  assert.equal(fill?.categoryId, "cat-food");
  assert.deepEqual(
    Object.keys(fill ?? {}).sort(),
    ["categoryId", "hint", "match"],
  );
});

test("capture fill: no match returns null so the learned chip still offers", () => {
  assert.equal(
    resolveRuleCategoryFill(
      [grabMerchantRule, highlands],
      { kind: "expense", merchant: "Circle K", note: "" },
      captureCategories,
    ),
    null,
  );
  // A rule that matches text but resolves to no existing category of the
  // draft kind must not fill either — there is nothing truthful to attribute.
  const ghostCategory = rule({
    id: "rule-ghost",
    contains: "circle",
    field: "merchant",
    categoryId: "cat-gone",
    category: "Danh mục đã xóa",
    categoryKind: "expense",
  });
  assert.equal(
    resolveRuleCategoryFill(
      [ghostCategory],
      { kind: "expense", merchant: "Circle K", note: "" },
      captureCategories,
    ),
    null,
  );
});

test("capture fill: a wrong-kind rule cannot shadow a same-kind match", () => {
  const incomeShadow = rule({
    id: "rule-income-shadow",
    priority: 1,
    contains: "grab",
    field: "merchant",
    categoryId: "cat-salary",
    category: "Lương",
    categoryKind: "income",
  });
  const lowerExpense = rule({
    ...grabMerchantRule,
    id: "rule-grab-expense",
    priority: 2,
  });
  const fill = resolveRuleCategoryFill(
    [incomeShadow, lowerExpense],
    { kind: "expense", merchant: "Grab bike", note: "" },
    captureCategories,
  );
  assert.equal(fill?.match.id, "rule-grab-expense");
  assert.equal(fill?.categoryId, "cat-travel");
});
