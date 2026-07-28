import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const runtimeSources = [
  "src/lib/finance.ts",
  "src/components/moneyflow-dashboard.tsx",
  "src/components/planning/goal-dialogs.tsx",
  "src/components/planning/commitments-page.tsx",
  "src/lib/planning/income-templates.ts",
  "src/server/finance.ts",
  "src/app/dashboard/page.tsx",
  "src/app/goals/page.tsx",
];

const forbiddenRuntimeTerms = [
  "calculateDailySpendingGuide",
  "safeToday",
  "dailyAllowance",
  "safe-to-spend",
  "có thể chi",
] as const;

test("withdrawn spending advice is absent from current runtime sources", () => {
  for (const path of runtimeSources) {
    const source = readFileSync(path, "utf8");
    for (const term of forbiddenRuntimeTerms) {
      assert.equal(
        source.toLocaleLowerCase("vi").includes(term.toLocaleLowerCase("vi")),
        false,
        `${path} must not contain withdrawn term: ${term}`,
      );
    }
  }
});

test("legacy CSS no longer hides or styles the withdrawn card", () => {
  const legacy = readFileSync("src/app/legacy.css", "utf8");
  const ownershipContract = readFileSync(
    "scripts/check-css-ownership.mjs",
    "utf8",
  );
  const globals = readFileSync("src/app/globals.css", "utf8");
  const refresh = readFileSync("src/app/ui-refresh.css", "utf8");
  const dashboard = readFileSync(
    "src/app/dashboard/calm-ledger-overview.css",
    "utf8",
  );

  for (const source of [legacy, ownershipContract]) {
    assert.doesNotMatch(source, /safe-to-spend-withdrawal\.css/);
  }
  for (const source of [globals, refresh, dashboard]) {
    assert.doesNotMatch(source, /\.safe-card\b/);
    assert.doesNotMatch(source, /\.safe-meter\b/);
  }
});
