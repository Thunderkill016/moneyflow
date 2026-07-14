import assert from "node:assert/strict";
import test from "node:test";
import {
  createRule,
  formatRuleSummary,
  isInboxRule,
  nextPriority,
  removeRuleFromList,
  sortRulesByPriority,
  updateRuleInList,
  upsertRule,
  type InboxRule,
} from "./rules-store.ts";

const base: InboxRule = {
  id: "rule-1",
  priority: 1,
  enabled: true,
  contains: "HIGHLANDS",
  field: "any",
  category: "Ăn uống",
  createdAt: "2026-07-12T02:10:00.000Z",
};

test("isInboxRule accepts complete rule", () => {
  assert.equal(isInboxRule(base), true);
  assert.equal(
    isInboxRule({ ...base, merchant: "Highlands Coffee", field: "merchant" }),
    true,
  );
});

test("isInboxRule rejects invalid", () => {
  assert.equal(isInboxRule({ ...base, contains: "" }), false);
  assert.equal(isInboxRule({ ...base, contains: "   " }), false);
  assert.equal(isInboxRule({ ...base, category: "" }), false);
  assert.equal(isInboxRule({ ...base, priority: 0 }), false);
  assert.equal(isInboxRule({ ...base, priority: 1.5 }), false);
  assert.equal(isInboxRule({ ...base, field: "amount" }), false);
  assert.equal(isInboxRule({ ...base, enabled: "yes" }), false);
});

test("createRule trims and defaults", () => {
  const rule = createRule({
    contains: "  grab  ",
    category: "  Di chuyển  ",
    field: "merchant",
  });
  assert.equal(rule.contains, "grab");
  assert.equal(rule.category, "Di chuyển");
  assert.equal(rule.field, "merchant");
  assert.equal(rule.enabled, true);
  assert.equal(rule.priority, 1);
  assert.ok(rule.id.startsWith("rule-"));
});

test("createRule requires contains and category", () => {
  assert.throws(() => createRule({ contains: "", category: "Ăn uống" }));
  assert.throws(() => createRule({ contains: "x", category: "  " }));
});

test("sortRulesByPriority lower number first", () => {
  const a = { ...base, id: "a", priority: 3 };
  const b = { ...base, id: "b", priority: 1 };
  const c = { ...base, id: "c", priority: 2 };
  const sorted = sortRulesByPriority([a, b, c]);
  assert.deepEqual(
    sorted.map((r) => r.id),
    ["b", "c", "a"],
  );
});

test("nextPriority and CRUD helpers", () => {
  assert.equal(nextPriority([]), 1);
  let list: InboxRule[] = [];
  list = upsertRule(list, base);
  assert.equal(list.length, 1);
  assert.equal(nextPriority(list), 2);
  list = upsertRule(list, {
    ...base,
    id: "rule-2",
    priority: 2,
    contains: "LUONG",
    category: "Lương",
  });
  assert.equal(list.length, 2);
  list = updateRuleInList(list, { id: "rule-1", enabled: false });
  assert.equal(list.find((r) => r.id === "rule-1")?.enabled, false);
  list = removeRuleFromList(list, "rule-1");
  assert.equal(list.length, 1);
  assert.equal(list[0]?.id, "rule-2");
});

test("formatRuleSummary is readable", () => {
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
