import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const auditConfig = readFileSync("playwright.audit.config.ts", "utf8");
const safetySpec = readFileSync(
  "e2e/audit/safety-review-states.audit.spec.ts",
  "utf8",
);

function countMatches(source: string, pattern: RegExp) {
  return [...source.matchAll(pattern)].length;
}

test("safety review states are selected by the cross-device audit projects", () => {
  assert.match(
    auditConfig,
    /const safetyReviewSpec = \/safety-review-states\\\.audit\\\.spec\\\.ts\//,
  );
  assert.match(
    auditConfig,
    /const responsiveWithSafety = \[responsiveSpec, safetyReviewSpec\]/,
  );
  assert.match(
    auditConfig,
    /const criticalWithSafety = \[criticalBrowserSpec, safetyReviewSpec\]/,
  );
  assert.equal(
    countMatches(auditConfig, /testMatch: responsiveWithSafety/g),
    7,
    "all phone, tablet and desktop Chromium responsive projects must run the safety states",
  );
  assert.equal(
    countMatches(auditConfig, /testMatch: criticalWithSafety/g),
    5,
    "dark-mode, WebKit and optional Firefox projects must keep the safety states discoverable",
  );
});

test("the audit captures every required safety-state artifact", () => {
  for (const label of [
    "paste-validation-error",
    "paste-review-preview",
    "inbox-review-validation",
    "delete-confirmation-invalid",
    "delete-confirmation-valid",
  ]) {
    assert.match(safetySpec, new RegExp(`auditCurrentState\\([^;]*"${label}"`));
  }
});

test("destructive confirmation uses review-before-delete without submitting deletion", () => {
  assert.match(safetySpec, /page\.goto\("\/settings\/delete-account"/);
  assert.match(safetySpec, /confirmation\.fill\("XOA"\)/);
  assert.match(safetySpec, /confirmation\.fill\("XÓA"\)/);
  assert.match(safetySpec, /expect\(reviewSubmit\)\.toBeDisabled\(\)/);
  assert.match(safetySpec, /expect\(reviewSubmit\)\.toBeEnabled\(\)/);
  assert.match(safetySpec, /await reviewSubmit\.click\(\)/);
  assert.match(
    safetySpec,
    /name: "Xóa vĩnh viễn tài khoản và dữ liệu\?"/,
  );
  assert.match(safetySpec, /name: "Xóa vĩnh viễn",\s*exact: true/);
  assert.match(safetySpec, /expect\(afterReview\)\.toEqual\(before\)/);
  assert.match(safetySpec, /name: "Hủy", exact: true/);
  assert.doesNotMatch(
    safetySpec,
    /getByRole\("button",\s*\{\s*name: "Xóa vĩnh viễn"[^}]*\}\s*\)\s*\.click\(/,
  );
});

test("failed Inbox review validation proves candidate and ledger state are unchanged", () => {
  assert.match(safetySpec, /const before = await readDemoMutationState\(page\)/);
  assert.match(safetySpec, /const after = await readDemoMutationState\(page\)/);
  assert.match(
    safetySpec,
    /expect\(after\.transactionCount\)\.toBe\(before\.transactionCount\)/,
  );
  assert.match(
    safetySpec,
    /expect\(after\.candidateStatuses\)\.toEqual\(before\.candidateStatuses\)/,
  );
});
