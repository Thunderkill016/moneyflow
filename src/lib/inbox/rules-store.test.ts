import assert from "node:assert/strict";
import test from "node:test";
import {
  createRule,
  formatRuleSummary,
  isInboxRule,
  nextPriority,
  normalizeStoredRule,
  removeRuleFromList,
  reorderRules,
  sortRulesByPriority,
  updateRuleInList,
  upsertRule,
  type InboxRule,
} from "./rules-store.ts";

const base: InboxRule = {
  id: "rule-1",
  stage: "candidate",
  priority: 1,
  enabled: true,
  contains: "HIGHLANDS",
  field: "any",
  category: "Ăn uống",
  categoryKind: "expense",
  version: 1,
  createdAt: "2026-07-12T02:10:00.000Z",
  updatedAt: "2026-07-12T02:10:00.000Z",
};

test("isInboxRule accepts the complete versioned contract", () => {
  assert.equal(isInboxRule(base), true);
  assert.equal(
    isInboxRule({
      ...base,
      categoryId: "category-food",
      merchant: "Highlands Coffee",
      field: "merchant",
    }),
    true,
  );
});

test("isInboxRule rejects invalid contract fields", () => {
  assert.equal(isInboxRule({ ...base, contains: "" }), false);
  assert.equal(isInboxRule({ ...base, category: "" }), false);
  assert.equal(isInboxRule({ ...base, categoryKind: "transfer" }), false);
  assert.equal(isInboxRule({ ...base, priority: 0 }), false);
  assert.equal(isInboxRule({ ...base, priority: 1.5 }), false);
  assert.equal(isInboxRule({ ...base, field: "amount" }), false);
  assert.equal(isInboxRule({ ...base, stage: "transaction" }), false);
  assert.equal(isInboxRule({ ...base, version: 0 }), false);
});

test("normalizeStoredRule upgrades the legacy local shape to candidate v1", () => {
  assert.deepEqual(
    normalizeStoredRule({
      id: "legacy",
      priority: 2,
      enabled: true,
      contains: " GRAB ",
      field: "merchant",
      category: "Di chuyển",
      createdAt: "2026-07-12T02:10:00.000Z",
    }),
    {
      id: "legacy",
      stage: "candidate",
      priority: 2,
      enabled: true,
      contains: "GRAB",
      field: "merchant",
      categoryId: undefined,
      category: "Di chuyển",
      categoryKind: "expense",
      merchant: undefined,
      version: 1,
      createdAt: "2026-07-12T02:10:00.000Z",
      updatedAt: "2026-07-12T02:10:00.000Z",
    },
  );
});

test("normalizeStoredRule infers legacy income category kind", () => {
  assert.equal(
    normalizeStoredRule({
      id: "income-legacy",
      priority: 1,
      enabled: true,
      contains: "LUONG",
      field: "raw",
      category: "Lương",
      createdAt: "2026-07-12T02:10:00.000Z",
    })?.categoryKind,
    "income",
  );
});

test("createRule trims, versions and defaults", () => {
  const rule = createRule({
    contains: "  grab  ",
    category: "  Di chuyển  ",
    categoryId: "category-transport",
    categoryKind: "expense",
    field: "merchant",
    createdAt: "2026-08-04T00:00:00.000Z",
  });
  assert.equal(rule.contains, "grab");
  assert.equal(rule.category, "Di chuyển");
  assert.equal(rule.categoryId, "category-transport");
  assert.equal(rule.categoryKind, "expense");
  assert.equal(rule.stage, "candidate");
  assert.equal(rule.enabled, true);
  assert.equal(rule.priority, 1);
  assert.equal(rule.version, 1);
  assert.equal(rule.updatedAt, rule.createdAt);
});

test("createRule requires valid match and target", () => {
  assert.throws(() => createRule({ contains: "", category: "Ăn uống" }));
  assert.throws(() => createRule({ contains: "x", category: "  " }));
  assert.throws(() =>
    createRule({ contains: "x", category: "Ăn uống", priority: 0 }),
  );
});

test("sortRulesByPriority uses stable deterministic tie breakers", () => {
  const a = { ...base, id: "a", priority: 3 };
  const b = { ...base, id: "b", priority: 1 };
  const c = { ...base, id: "c", priority: 2 };
  assert.deepEqual(
    sortRulesByPriority([a, b, c]).map((rule) => rule.id),
    ["b", "c", "a"],
  );
});

test("update and reorder increment only changed rule versions", () => {
  let list: InboxRule[] = [
    base,
    {
      ...base,
      id: "rule-2",
      priority: 2,
      contains: "LUONG",
      category: "Lương",
      categoryKind: "income",
    },
  ];
  assert.equal(nextPriority(list), 3);
  list = updateRuleInList(list, {
    id: "rule-1",
    enabled: false,
    updatedAt: "2026-08-04T00:01:00.000Z",
  });
  assert.equal(list[0]?.enabled, false);
  assert.equal(list[0]?.version, 2);

  const reordered = reorderRules(list, ["rule-2", "rule-1"]);
  assert.deepEqual(reordered.map((rule) => rule.id), ["rule-2", "rule-1"]);
  assert.equal(reordered[0]?.priority, 1);
  assert.equal(reordered[0]?.version, 2);
  assert.equal(reordered[1]?.priority, 2);
  assert.equal(reordered[1]?.version, 3);
});

test("CRUD helpers and readable summary remain compatible", () => {
  let list = upsertRule([], base);
  list = removeRuleFromList(list, "missing");
  assert.equal(list.length, 1);
  assert.equal(formatRuleSummary(base), "“HIGHLANDS” → Ăn uống");
  assert.equal(
    formatRuleSummary({
      ...base,
      field: "merchant",
      merchant: "Highlands Coffee",
    }),
    "Nơi chi ~ “HIGHLANDS” → Highlands Coffee → Ăn uống",
  );
});
