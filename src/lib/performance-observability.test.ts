import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync("src/app/layout.tsx", "utf8");
const component = readFileSync("src/components/privacy-safe-speed-insights.tsx", "utf8");
const hook = readFileSync("src/hooks/use-transactions.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  dependencies?: Record<string, string>;
};

test("root layout collects production web vitals through the privacy wrapper", () => {
  assert.match(layout, /PrivacySafeSpeedInsights/);
  assert.match(component, /@vercel\/speed-insights\/next/);
  assert.match(component, /sanitizeSpeedInsightsUrl/);
  assert.equal(packageJson.dependencies?.["@vercel/speed-insights"], "2.0.0");
});

test("real transaction creation uses React optimistic state", () => {
  assert.match(hook, /useOptimistic/);
  assert.match(hook, /startTransition\(async \(\) =>/);
  assert.match(hook, /addOptimisticTransaction\(optimistic\.transaction\)/);
  assert.match(hook, /transactions: optimisticTransactions/);
});
