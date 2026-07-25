import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  buildCommand?: string;
  git?: { deploymentEnabled?: Record<string, boolean> };
};
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

test("Vercel deploys automatically only from main", () => {
  assert.equal(vercelConfig.git?.deploymentEnabled?.["*"], false);
  assert.equal(vercelConfig.git?.deploymentEnabled?.main, true);
});

test("Vercel validates deployment config without repeating GitHub verification work", () => {
  assert.equal(
    vercelConfig.buildCommand,
    "npm run check:deployment-env && npm run build",
  );
  assert.doesNotMatch(vercelConfig.buildCommand ?? "", /npm run (lint|typecheck|test)/);
});

test("GitHub CI cancels stale runs and skips draft PR verification", () => {
  assert.match(workflow, /cancel-in-progress:\s*true/);
  assert.match(workflow, /ready_for_review/);
  assert.match(workflow, /github\.event\.pull_request\.draft == false/);
  assert.match(workflow, /Deployment configuration contract/);
  assert.match(workflow, /workflow_dispatch:/);
});
