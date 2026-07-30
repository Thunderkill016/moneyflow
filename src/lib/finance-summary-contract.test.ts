import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

test("active finance summary does not export withdrawn spending advice", () => {
  const source = [
    read("src/lib/finance.ts"),
    read("src/components/moneyflow-dashboard.tsx"),
  ].join("\n");

  for (const retiredToken of [
    "DAILY_ALLOWANCE",
    "calculateDailySpendingGuide",
    "safeToday",
    "dailyAllowance",
    "forecast",
    "budgetPlanIsComplete",
    "plannedDailySavings",
  ]) {
    assert.ok(
      !source.includes(retiredToken),
      `Retired spending-advice token returned to active source: ${retiredToken}`,
    );
  }
});
