import assert from "node:assert/strict";
import test from "node:test";
import {
  budgetBarColor,
  budgetProgress,
  budgetRemaining,
  budgetStatusLabel,
  budgetThreshold,
} from "./budgets.ts";

test("budget progress can report overspending without hiding it", () => {
  assert.equal(budgetProgress({ spent: 750_000, limit: 1_000_000 }), 75);
  assert.equal(budgetProgress({ spent: 1_250_000, limit: 1_000_000 }), 125);
});

test("budget remaining becomes negative when over limit", () => {
  assert.equal(budgetRemaining({ spent: 1_250_000, limit: 1_000_000 }), -250_000);
});

test("budgetThreshold maps progress bands calmly", () => {
  // Bands use rounded percent (same as budgetProgress).
  assert.equal(budgetThreshold({ spent: 400_000, limit: 1_000_000 }), "ok"); // 40%
  assert.equal(budgetThreshold({ spent: 500_000, limit: 1_000_000 }), "watch"); // 50%
  assert.equal(budgetThreshold({ spent: 790_000, limit: 1_000_000 }), "watch"); // 79%
  assert.equal(budgetThreshold({ spent: 800_000, limit: 1_000_000 }), "near"); // 80%
  assert.equal(budgetThreshold({ spent: 990_000, limit: 1_000_000 }), "near"); // 99%
  assert.equal(budgetThreshold({ spent: 1_000_000, limit: 1_000_000 }), "over"); // 100%
  assert.equal(budgetThreshold({ spent: 1_250_000, limit: 1_000_000 }), "over"); // 125%
});

test("budgetStatusLabel uses calm copy: Gần hạn mức / Đã vượt X / Còn X", () => {
  const format = (n: number) => `${n}`;
  assert.equal(budgetStatusLabel({ spent: 400_000, limit: 1_000_000 }, format), "Còn 600000");
  assert.equal(budgetStatusLabel({ spent: 850_000, limit: 1_000_000 }, format), "Gần hạn mức");
  assert.equal(budgetStatusLabel({ spent: 1_250_000, limit: 1_000_000 }, format), "Đã vượt 250000");
  // No guilt words
  const over = budgetStatusLabel({ spent: 1_100_000, limit: 1_000_000 }, format);
  assert.match(over, /^Đã vượt /);
  assert.doesNotMatch(over, /lãng phí|sai|tệ|tội|phải/i);
});

test("budgetBarColor returns distinct tokens per threshold (pair with text)", () => {
  const ok = budgetBarColor("ok");
  const near = budgetBarColor("near");
  const over = budgetBarColor("over");
  assert.notEqual(ok, near);
  assert.notEqual(near, over);
  assert.ok(over.includes("danger") || over.includes("EF4444") || over.includes("DC2626") || over.includes("var(--color-danger"));
});
