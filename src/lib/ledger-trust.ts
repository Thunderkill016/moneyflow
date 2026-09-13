export type LedgerTrustStatus = "trusted" | "trusted_limited" | "blocked";

export type LedgerTrustReason =
  | "clean_reconciliation_boundary"
  | "known_unresolved_work"
  | "missing_clean_reconciliation"
  | "no_active_accounts";

export type LedgerTrustSummary = {
  trustedThrough: string | null;
  baseReconciliationThrough: string | null;
  status: LedgerTrustStatus;
  reason: LedgerTrustReason;
  activeAccountCount: number;
  cleanReconciledAccountCount: number;
  pendingInboxCount: number;
  needsReviewTransactionCount: number;
  unreconciledAccountLegCount: number;
  earliestUnresolvedOn: string | null;
  coverageScope: "known_ledger_state_only";
};

export type LedgerTrustPresentation = {
  headline: string;
  detail: string;
  action: { href: string; label: string } | null;
};

function formatIsoDate(value: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return null;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function limitedAction(summary: LedgerTrustSummary) {
  if (summary.pendingInboxCount > 0) {
    return { href: "/inbox", label: "Mở Hộp thư" };
  }
  if (summary.needsReviewTransactionCount > 0) {
    return {
      href: "/transactions?review=needs_review",
      label: "Xem giao dịch cần xem lại",
    };
  }
  if (summary.unreconciledAccountLegCount > 0) {
    return { href: "/accounts", label: "Mở tài khoản" };
  }
  return null;
}

/**
 * Turns the database trust contract into bounded Home copy and, at most, one
 * existing maintenance destination. It intentionally never turns the result
 * into a score and never upgrades known-ledger coverage into source completeness.
 */
export function presentLedgerTrust(
  summary: LedgerTrustSummary,
): LedgerTrustPresentation {
  const trustedThrough = formatIsoDate(summary.trustedThrough);
  const earliestUnresolved = formatIsoDate(summary.earliestUnresolvedOn);

  if (summary.status === "trusted") {
    return {
      headline: trustedThrough
        ? `Sổ tin cậy đến ${trustedThrough}`
        : "Sổ đã được đối soát sạch",
      detail:
        "Dựa trên các tài khoản đã đối soát và việc MoneyFlow đã biết; không xác nhận mọi hoạt động từ nguồn bên ngoài đã được ghi nhận.",
      action: null,
    };
  }

  if (summary.status === "trusted_limited") {
    return {
      headline: trustedThrough
        ? `Sổ tin cậy đến ${trustedThrough}`
        : "Mốc tin cậy đang bị giới hạn",
      detail: earliestUnresolved
        ? `Có việc MoneyFlow đã biết từ ${earliestUnresolved} cần xử lý trước khi mốc tin cậy tiến xa hơn. Phạm vi này không khẳng định nguồn bên ngoài đã đầy đủ.`
        : "Có việc MoneyFlow đã biết cần xử lý trước khi mốc tin cậy tiến xa hơn. Phạm vi này không khẳng định nguồn bên ngoài đã đầy đủ.",
      action: limitedAction(summary),
    };
  }

  if (summary.reason === "no_active_accounts") {
    return {
      headline: "Chưa có mốc tin cậy",
      detail:
        "Chưa có tài khoản đang dùng để xác định phạm vi sổ MoneyFlow.",
      action: { href: "/accounts", label: "Mở tài khoản" },
    };
  }

  const missingAccounts = Math.max(
    0,
    summary.activeAccountCount - summary.cleanReconciledAccountCount,
  );
  return {
    headline: "Chưa có mốc tin cậy",
    detail:
      missingAccounts > 0
        ? `Còn ${missingAccounts} tài khoản đang dùng chưa có lần đối soát sạch. MoneyFlow chưa thể xác nhận mốc tin cậy cho toàn bộ sổ.`
        : "Chưa có đủ đối soát sạch để xác nhận mốc tin cậy cho toàn bộ sổ MoneyFlow.",
    action: { href: "/accounts", label: "Đối soát tài khoản" },
  };
}
