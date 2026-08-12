import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGatePlan,
  requiredCapabilities,
  requiredProviderChecks,
} from "./agent-doctor.mjs";

const base = {
  fullVerify: false,
  database: false,
  browserSmoke: false,
  uiAudit: false,
};

const always = [
  "npm run check:migrations",
  "npm run check:knowledge",
  "npm run test:ci-policy",
];

test("docs-only local gate plan stays lightweight but preserves policy contracts", () => {
  assert.deepEqual(buildGatePlan(base), always);
  assert.deepEqual(requiredCapabilities(base), {
    node: true,
    npm: true,
    git: true,
    supabase: false,
    docker: false,
    playwright: false,
  });
});

test("provider checks remain separate from local commands", () => {
  assert.deepEqual(requiredProviderChecks(), [
    "verify",
    "database",
    "e2e",
    "Gitleaks all refs",
    "Analyze JavaScript and TypeScript",
  ]);
});

test("database changes require database capabilities and gate", () => {
  const classification = { ...base, database: true };
  assert.deepEqual(buildGatePlan(classification), [...always, "npm run test:db"]);
  assert.equal(requiredCapabilities(classification).supabase, true);
  assert.equal(requiredCapabilities(classification).docker, true);
});

test("runtime and UI changes produce one deduplicated local gate plan", () => {
  const classification = {
    ...base,
    fullVerify: true,
    browserSmoke: true,
    uiAudit: true,
  };
  assert.deepEqual(buildGatePlan(classification), [
    ...always,
    "npm run verify:prepush",
    "npm run test:e2e",
    "npm run test:ui-audit:pr",
  ]);
  assert.equal(requiredCapabilities(classification).playwright, true);
});
