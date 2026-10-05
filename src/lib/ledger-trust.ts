import { isValidDateOnly } from "./date-only.ts";

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

const TRUST_BOUNDARY_DAY_OFFSET = 1;

export function isConsistentLedgerTrust(summary: LedgerTrustSummary): boolean {
  const counts = [
    summary.activeAccountCount,
    summary.cleanReconciledAccountCount,
    summary.pendingInboxCount,
    summary.needsReviewTransactionCount,
    summary.unreconciledAccountLegCount,
  ];
  if (!counts.every((count) => Number.isSafeInteger(count) && count >= 0)) {
    return false;
  }
  if (
    summary.coverageScope !== "known_ledger_state_only" ||
    summary.cleanReconciledAccountCount > summary.activeAccountCount ||
    ![
      summary.trustedThrough,
      summary.baseReconciliationThrough,
      summary.earliestUnresolvedOn,
    ].every((date) => date === null || isValidDateOnly(date))
  ) {
    return false;
  }

  const hasUnresolvedWork =
    summary.pendingInboxCount > 0 ||
    summary.needsReviewTransactionCount > 0 ||
    summary.unreconciledAccountLegCount > 0;

  if (summary.status === "blocked") {
    if (
      summary.trustedThrough !== null ||
      summary.earliestUnresolvedOn !== null ||
      hasUnresolvedWork
    ) {
      return false;
    }
    if (summary.reason === "no_active_accounts") {
      return summary.activeAccountCount === 0 && summary.baseReconciliationThrough === null;
    }
    return (
      summary.reason === "missing_clean_reconciliation" &&
      summary.activeAccountCount > summary.cleanReconciledAccountCount &&
      (summary.cleanReconciledAccountCount === 0
        ? summary.baseReconciliationThrough === null
        : summary.baseReconciliationThrough !== null)
    );
  }

  if (
    summary.activeAccountCount === 0 ||
    summary.cleanReconciledAccountCount !== summary.activeAccountCount ||
    summary.baseReconciliationThrough === null ||
    summary.trustedThrough === null
  ) {
    return false;
  }
  if (summary.status === "trusted") {
    return (
      summary.reason === "clean_reconciliation_boundary" &&
      summary.trustedThrough === summary.baseReconciliationThrough &&
      !hasUnresolvedWork &&
      summary.earliestUnresolvedOn === null
    );
  }
  if (
    summary.status !== "trusted_limited" ||
    summary.reason !== "known_unresolved_work" ||
    !hasUnresolvedWork ||
    summary.earliestUnresolvedOn === null ||
    summary.earliestUnresolvedOn > summary.baseReconciliationThrough
  ) {
    return false;
  }
  const boundary = new Date(`${summary.earliestUnresolvedOn}T00:00:00.000Z`);
  boundary.setUTCDate(boundary.getUTCDate() - TRUST_BOUNDARY_DAY_OFFSET);
  return summary.trustedThrough === boundary.toISOString().slice(0, 10);
}

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
  if (!isConsistentLedgerTrust(summary)) {
    return {
      headline: "Chưa xác nhận được mốc tin cậy",
      detail: "Dữ liệu mốc tin cậy chưa nhất quán. MoneyFlow không xác nhận sổ đã đối soát sạch từ dữ liệu này.",
      action: null,
    };
  }
  const trustedThrough = formatIsoDate(summary.trustedThrough);
  const earliestUnresolved = formatIsoDate(summary.earliestUnresolvedOn);

  if (summary.status === "trusted") {
    return {
      headline: `Sổ tin cậy đến ${trustedThrough}`,
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
