import assert from "node:assert/strict";
import test from "node:test";
import {
  applyRuleToTarget,
  applyRulesToParsed,
  findMatchingRule,
  previewRuleApplication,
  resolveCategoryIdForRuleMatch,
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
