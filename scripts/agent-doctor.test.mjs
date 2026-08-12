import assert from "node:assert/strict";
import test from "node:test";

import { buildGatePlan, requiredCapabilities } from "./agent-doctor.mjs";

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

test("docs-only gate plan stays lightweight but preserves policy contracts", () => {
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

test("database changes require database capabilities and gate", () => {
  const classification = { ...base, database: true };
  assert.deepEqual(buildGatePlan(classification), [...always, "npm run test:db"]);
  assert.equal(requiredCapabilities(classification).supabase, true);
  assert.equal(requiredCapabilities(classification).docker, true);
});

test("runtime and UI changes produce one deduplicated gate plan", () => {
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
