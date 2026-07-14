import assert from "node:assert/strict";
import test from "node:test";
import {
  isPlanningPath,
  MORE_OTHER_LINKS,
  PLANNING_LINKS,
  PLANNING_PATHS,
} from "./nav-ia.ts";

/** Mirrors app-shell desktop primary hrefs — budgets must never appear here. */
const PRIMARY_HREFS = [
  "/inbox",
  "/timeline",
  "/accounts",
  "/rules",
  "/imports",
  "/insights",
] as const;

test("primary nav stays inbox-first without budgets/goals/commitments", () => {
  for (const path of PLANNING_PATHS) {
    assert.equal(
      PRIMARY_HREFS.includes(path as (typeof PRIMARY_HREFS)[number]),
      false,
      `${path} must not be a primary nav href`,
    );
  }
  assert.equal(PRIMARY_HREFS[0], "/inbox");
});

test("planning links cover budgets, commitments, goals", () => {
  const hrefs = PLANNING_LINKS.map((item) => item.href).sort();
  assert.deepEqual(hrefs, ["/budgets", "/commitments", "/goals"].sort());
  assert.ok(PLANNING_LINKS.every((item) => item.label && item.icon));
});

test("isPlanningPath matches planning routes only", () => {
  assert.equal(isPlanningPath("/budgets"), true);
  assert.equal(isPlanningPath("/commitments/foo"), true);
  assert.equal(isPlanningPath("/goals"), true);
  assert.equal(isPlanningPath("/inbox"), false);
  assert.equal(isPlanningPath("/insights"), false);
  assert.equal(isPlanningPath("/transactions"), false);
});

test("More other links stay secondary", () => {
  const hrefs = MORE_OTHER_LINKS.map((item) => item.href);
  assert.ok(hrefs.includes("/transactions"));
  assert.ok(hrefs.includes("/reports"));
  for (const path of PLANNING_PATHS) {
    assert.equal(hrefs.includes(path), false);
  }
});
