import assert from "node:assert/strict";
import test from "node:test";
import { budgetProgress, budgetRemaining } from "./budgets.ts";

test("budget progress can report overspending without hiding it", () => {
  assert.equal(budgetProgress({ spent: 750_000, limit: 1_000_000 }), 75);
  assert.equal(budgetProgress({ spent: 1_250_000, limit: 1_000_000 }), 125);
});

test("budget remaining becomes negative when over limit", () => {
  assert.equal(budgetRemaining({ spent: 1_250_000, limit: 1_000_000 }), -250_000);
});
