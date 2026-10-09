/*
 * Deploy-gate contract tests for scripts/deploy-prod.mjs (#779).
 *
 * Every test exercises the pure gate functions only — nothing here spawns
 * git, npx or `vercel`, and nothing can produce a production deploy. The
 * assertions exist because the gate failed open once already: reachability
 * from ANY origin branch used to suffice, so a pushed-but-unreviewed feature
 * branch could ship to production.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { checkProjectLink, evaluateDeployGate } from "./deploy-prod.mjs";

const TIP = "a".repeat(40);
const ANCESTOR = "b".repeat(40);
const FEATURE = "c".repeat(40);
const UNPUSHED = "d".repeat(40);

const base = {
  dirty: "",
  allowAncestor: false,
  allowNonMain: false,
  mainTip: TIP,
};

test("reviewed origin/main tip is permitted as an ordinary release", () => {
  const gate = evaluateDeployGate({
    ...base,
    head: TIP,
    containing: ["origin/main"],
  });
  assert.equal(gate.allowed, true);
  assert.equal(gate.kind, "release");
  assert.deepEqual(gate.failures, []);
});

test("an unmerged origin feature branch is denied", () => {
  const gate = evaluateDeployGate({
    ...base,
    head: FEATURE,
    containing: ["origin/feat/post-neon-release-safety"],
  });
  assert.equal(gate.allowed, false);
  assert.equal(gate.kind, "denied");
  assert.match(gate.failures.join("\n"), /not merged/u);
});

test("an unpushed HEAD is denied — no operator flag can override invisibility", () => {
  for (const allowNonMain of [false, true]) {
    const gate = evaluateDeployGate({
      ...base,
      head: UNPUSHED,
      containing: [],
      allowNonMain,
    });
    assert.equal(gate.allowed, false);
    assert.equal(gate.kind, "denied");
    assert.match(gate.failures.join("\n"), /not on any origin branch/u);
  }
});

test("a dirty checkout is denied before the branch question is even asked", () => {
  const gate = evaluateDeployGate({
    ...base,
    head: TIP,
    containing: ["origin/main"],
    dirty: " M src/app/page.tsx",
  });
  assert.equal(gate.allowed, false);
  assert.match(gate.failures.join("\n"), /worktree is not clean/u);
});

test("an ancestor of origin/main is denied without --allow-ancestor (rollback must be deliberate)", () => {
  const gate = evaluateDeployGate({
    ...base,
    head: ANCESTOR,
    containing: ["origin/main", "origin/feat/old"],
  });
  assert.equal(gate.allowed, false);
  assert.match(gate.failures.join("\n"), /--allow-ancestor/u);
});

test("--allow-ancestor permits an older reviewed commit and labels the plan loudly", () => {
  const gate = evaluateDeployGate({
    ...base,
    head: ANCESTOR,
    containing: ["origin/main"],
    allowAncestor: true,
  });
  assert.equal(gate.allowed, true);
  assert.equal(gate.kind, "ancestor-rollback");
  assert.match(gate.notes.join("\n"), /ROLLBACK/u);
});

test("--allow-non-main permits a pushed emergency cutover and labels it loudly", () => {
  const gate = evaluateDeployGate({
    ...base,
    head: FEATURE,
    containing: ["origin/feat/emergency"],
    allowNonMain: true,
  });
  assert.equal(gate.allowed, true);
  assert.equal(gate.kind, "emergency-non-main");
  assert.match(gate.notes.join("\n"), /EMERGENCY/u);
});

test("a missing origin/main tip does not fake a release shape", () => {
  const gate = evaluateDeployGate({
    ...base,
    head: ANCESTOR,
    containing: ["origin/main"],
    mainTip: null,
  });
  assert.equal(gate.allowed, false);
});

test("the linked Vercel project must be moneyflow production", () => {
  assert.equal(
    checkProjectLink({
      projectId: "prj_eAusnkm1X1HzAt4wMFbuMnRXela7",
      orgId: "team_1MZEcAVjG3nrOnklJxYIqGQs",
    }).ok,
    true,
  );
  // Wrong project id.
  assert.equal(
    checkProjectLink({
      projectId: "prj_other",
      orgId: "team_1MZEcAVjG3nrOnklJxYIqGQs",
    }).ok,
    false,
  );
  // Right project, wrong org — a personal-scope lookalike.
  assert.equal(
    checkProjectLink({
      projectId: "prj_eAusnkm1X1HzAt4wMFbuMnRXela7",
      orgId: "team_other",
    }).ok,
    false,
  );
  // Unlinked checkout would silently create a new project on deploy --yes.
  assert.equal(checkProjectLink(null).ok, false);
});
