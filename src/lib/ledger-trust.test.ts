import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  isConsistentLedgerTrust,
  presentLedgerTrust,
  type LedgerTrustSummary,
} from "./ledger-trust.ts";

function summary(
  patch: Partial<LedgerTrustSummary> = {},
): LedgerTrustSummary {
  return {
    trustedThrough: "2026-08-31",
    baseReconciliationThrough: "2026-08-31",
    status: "trusted",
    reason: "clean_reconciliation_boundary",
    activeAccountCount: 2,
    cleanReconciledAccountCount: 2,
    pendingInboxCount: 0,
    needsReviewTransactionCount: 0,
    unreconciledAccountLegCount: 0,
    earliestUnresolvedOn: null,
    coverageScope: "known_ledger_state_only",
    ...patch,
  };
}

test("trusted copy names the reconciled boundary without claiming source completeness", () => {
  const result = presentLedgerTrust(summary());

  assert.equal(result.headline, "Sổ tin cậy đến 31/08/2026");
  assert.match(result.detail, /đối soát/iu);
  assert.match(result.detail, /không xác nhận mọi hoạt động từ nguồn bên ngoài/iu);
  assert.equal(result.action, null);
});

test("limited trust picks one Inbox action first and preserves the unresolved boundary", () => {
  const result = presentLedgerTrust(
    summary({
      trustedThrough: "2026-08-19",
      status: "trusted_limited",
      reason: "known_unresolved_work",
      pendingInboxCount: 2,
      needsReviewTransactionCount: 3,
      unreconciledAccountLegCount: 4,
      earliestUnresolvedOn: "2026-08-20",
    }),
  );

  assert.equal(result.headline, "Sổ tin cậy đến 19/08/2026");
  assert.match(result.detail, /20\/08\/2026/u);
  assert.match(result.detail, /không khẳng định nguồn bên ngoài đã đầy đủ/iu);
  assert.deepEqual(result.action, { href: "/inbox", label: "Mở Hộp thư" });
});

test("limited trust falls through to review then account maintenance without inventing a second action", () => {
  assert.deepEqual(
    presentLedgerTrust(
      summary({
        trustedThrough: "2026-08-19",
        status: "trusted_limited",
        reason: "known_unresolved_work",
        needsReviewTransactionCount: 1,
        earliestUnresolvedOn: "2026-08-20",
      }),
    ).action,
    {
      href: "/transactions?review=needs_review",
      label: "Xem giao dịch cần xem lại",
    },
  );

  assert.deepEqual(
    presentLedgerTrust(
      summary({
        trustedThrough: "2026-08-19",
        status: "trusted_limited",
        reason: "known_unresolved_work",
        unreconciledAccountLegCount: 1,
        earliestUnresolvedOn: "2026-08-20",
      }),
    ).action,
    { href: "/accounts", label: "Mở tài khoản" },
  );
});

test("missing clean reconciliation reports the uncovered active-account count", () => {
  const result = presentLedgerTrust(
    summary({
      trustedThrough: null,
      baseReconciliationThrough: "2026-08-31",
      status: "blocked",
      reason: "missing_clean_reconciliation",
      activeAccountCount: 3,
      cleanReconciledAccountCount: 1,
    }),
  );

  assert.equal(result.headline, "Chưa có mốc tin cậy");
  assert.match(result.detail, /Còn 2 tài khoản/iu);
  assert.deepEqual(result.action, {
    href: "/accounts",
    label: "Đối soát tài khoản",
  });
});

test("no active account stays an explicit blocked state", () => {
  const result = presentLedgerTrust(
    summary({
      trustedThrough: null,
      baseReconciliationThrough: null,
      status: "blocked",
      reason: "no_active_accounts",
      activeAccountCount: 0,
      cleanReconciledAccountCount: 0,
    }),
  );

  assert.match(result.detail, /Chưa có tài khoản đang dùng/iu);
  assert.deepEqual(result.action, { href: "/accounts", label: "Mở tài khoản" });
});

test("trust validation accepts each existing SQL state without upgrading external coverage", () => {
  const states = [
    summary(),
    summary({
      trustedThrough: "2026-08-19",
      status: "trusted_limited",
      reason: "known_unresolved_work",
      pendingInboxCount: 1,
      earliestUnresolvedOn: "2026-08-20",
    }),
    summary({
      trustedThrough: null,
      status: "blocked",
      reason: "missing_clean_reconciliation",
      cleanReconciledAccountCount: 1,
    }),
    summary({
      trustedThrough: null,
      baseReconciliationThrough: null,
      status: "blocked",
      reason: "missing_clean_reconciliation",
      cleanReconciledAccountCount: 0,
    }),
    summary({
      trustedThrough: null,
      baseReconciliationThrough: null,
      status: "blocked",
      reason: "no_active_accounts",
      activeAccountCount: 0,
      cleanReconciledAccountCount: 0,
    }),
  ];
  for (const state of states) assert.equal(isConsistentLedgerTrust(state), true);
});

test("trust validation withholds contradictory dates, counts, reasons and coverage", () => {
  const patches: Partial<LedgerTrustSummary>[] = [
    { trustedThrough: null },
    { baseReconciliationThrough: null },
    { trustedThrough: "2026-02-30", baseReconciliationThrough: "2026-02-30" },
    { trustedThrough: "2026-09-01" },
    { reason: "known_unresolved_work" },
    { pendingInboxCount: 1 },
    { earliestUnresolvedOn: "2026-08-20" },
    { activeAccountCount: 0, cleanReconciledAccountCount: 0 },
    { cleanReconciledAccountCount: 1 },
    { cleanReconciledAccountCount: 3 },
    { pendingInboxCount: -1 },
    { needsReviewTransactionCount: 0.5 },
    { unreconciledAccountLegCount: Number.NaN },
    { activeAccountCount: Number.MAX_SAFE_INTEGER + 1 },
    { coverageScope: "all_sources" as LedgerTrustSummary["coverageScope"] },
  ];
  for (const patch of patches) {
    const state = summary(patch);
    assert.equal(isConsistentLedgerTrust(state), false, JSON.stringify(patch));
    const copy = presentLedgerTrust(state);
    assert.equal(copy.headline, "Chưa xác nhận được mốc tin cậy");
    assert.equal(copy.action, null);
  }
});

test("limited trust ends exactly before unresolved work across month/year/leap boundaries", () => {
  const dates = [
    ["2026-08-20", "2026-08-19"],
    ["2026-09-01", "2026-08-31"],
    ["2026-01-01", "2025-12-31"],
    ["2028-03-01", "2028-02-29"],
  ];
  for (const [earliestUnresolvedOn, trustedThrough] of dates) {
    const state = summary({
      status: "trusted_limited",
      reason: "known_unresolved_work",
      baseReconciliationThrough: earliestUnresolvedOn,
      earliestUnresolvedOn,
      trustedThrough,
      pendingInboxCount: 1,
    });
    assert.equal(isConsistentLedgerTrust(state), true);
    assert.equal(isConsistentLedgerTrust({ ...state, trustedThrough: earliestUnresolvedOn }), false);
    assert.equal(isConsistentLedgerTrust({ ...state, pendingInboxCount: 0 }), false);
    assert.equal(isConsistentLedgerTrust({ ...state, baseReconciliationThrough: trustedThrough }), false);
    assert.equal(isConsistentLedgerTrust({ ...state, earliestUnresolvedOn: "2026-02-30" }), false);
  }
});

test("blocked states cannot carry trust or impersonate a clean reconciliation", () => {
  const state = summary({
    status: "blocked",
    reason: "missing_clean_reconciliation",
    trustedThrough: null,
    cleanReconciledAccountCount: 1,
  });
  for (const patch of [
    { trustedThrough: "2026-08-31" },
    { cleanReconciledAccountCount: 2 },
    { baseReconciliationThrough: null },
    { earliestUnresolvedOn: "2026-08-20" },
    { needsReviewTransactionCount: 1 },
    { reason: "clean_reconciliation_boundary" as const },
    { reason: "no_active_accounts" as const },
  ]) {
    assert.equal(isConsistentLedgerTrust({ ...state, ...patch }), false);
  }
});

test("shared server mapping withholds inconsistent trust for dashboard and capabilities", () => {
  const server = readFileSync(new URL("../server/ledger-trust.ts", import.meta.url), "utf8");
  assert.match(server, /if \(!isConsistentLedgerTrust\(summary\)\)\s*\{[\s\S]*?return null;/u);
  assert.match(server, /return summary;/u);
});
