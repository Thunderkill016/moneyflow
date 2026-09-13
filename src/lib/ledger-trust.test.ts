import assert from "node:assert/strict";
import test from "node:test";
import {
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
