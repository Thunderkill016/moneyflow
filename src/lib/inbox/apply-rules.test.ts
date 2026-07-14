import assert from "node:assert/strict";
import test from "node:test";
import {
  applyRuleToTarget,
  applyRulesToParsed,
  findMatchingRule,
  ruleMatches,
} from "./apply-rules.ts";
import type { ParsedCandidate } from "./parse-text.ts";
import type { InboxRule } from "./rules-store.ts";

const highlands: InboxRule = {
  id: "rule-1",
  priority: 1,
  enabled: true,
  contains: "HIGHLANDS",
  field: "any",
  category: "Ăn uống",
  merchant: "Highlands Coffee",
  createdAt: "2026-07-12T02:10:00.000Z",
};

const luong: InboxRule = {
  id: "rule-2",
  priority: 2,
  enabled: true,
  contains: "LUONG",
  field: "raw",
  category: "Lương",
  createdAt: "2026-07-12T03:00:00.000Z",
};

const grabDisabled: InboxRule = {
  id: "rule-3",
  priority: 1,
  enabled: false,
  contains: "GRAB",
  field: "merchant",
  category: "Di chuyển",
  createdAt: "2026-07-12T04:00:00.000Z",
};

test("ruleMatches is case-insensitive contains", () => {
  assert.equal(
    ruleMatches(highlands, {
      merchant: "highlands 45k",
      note: "",
      rawSnippet: "HIGHLANDS 45k",
    }),
    true,
  );
  assert.equal(
    ruleMatches(highlands, { merchant: "Circle K", note: "", rawSnippet: "" }),
    false,
  );
});

test("field merchant ignores raw-only match", () => {
  const merchantOnly: InboxRule = {
    ...highlands,
    field: "merchant",
    contains: "HIGHLANDS",
  };
  assert.equal(
    ruleMatches(merchantOnly, {
      merchant: "Cafe",
      note: "",
      rawSnippet: "HIGHLANDS 45k",
    }),
    false,
  );
  assert.equal(
    ruleMatches(merchantOnly, {
      merchant: "HIGHLANDS",
      note: "",
      rawSnippet: "",
    }),
    true,
  );
});

test("priority: lower number wins when both match", () => {
  const lowPrio: InboxRule = {
    ...highlands,
    id: "rule-low",
    priority: 5,
    category: "Mua sắm",
  };
  const match = findMatchingRule(
    [lowPrio, highlands],
    { merchant: "HIGHLANDS", note: "", rawSnippet: "" },
  );
  assert.equal(match?.id, "rule-1");
  assert.equal(match?.category, "Ăn uống");
});

test("disabled rules are skipped", () => {
  assert.equal(
    findMatchingRule([grabDisabled], {
      merchant: "GRAB *TRIP",
      note: "",
    }),
    null,
  );
});

test("applyRuleToTarget sets category and optional merchant", () => {
  const result = applyRuleToTarget(
    {
      merchant: "HIGHLANDS 45K",
      note: "",
      rawSnippet: "HIGHLANDS 45k",
      category: undefined as string | undefined,
      matchedRuleId: undefined as string | undefined,
      matchedRuleSummary: undefined as string | undefined,
    },
    [highlands, luong],
  );
  assert.equal(result.category, "Ăn uống");
  assert.equal(result.merchant, "Highlands Coffee");
  assert.equal(result.matchedRuleId, "rule-1");
  assert.ok(result.matchedRuleSummary?.includes("Ăn uống"));
});

test("applyRuleToTarget does not overwrite category unless force", () => {
  const kept = applyRuleToTarget(
    {
      merchant: "HIGHLANDS",
      note: "",
      category: "Giải trí",
    },
    [highlands],
  );
  assert.equal(kept.category, "Giải trí");
  const forced = applyRuleToTarget(
    {
      merchant: "HIGHLANDS",
      note: "",
      category: "Giải trí",
    },
    [highlands],
    { force: true },
  );
  assert.equal(forced.category, "Ăn uống");
});

test("applyRulesToParsed enriches candidates", () => {
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
