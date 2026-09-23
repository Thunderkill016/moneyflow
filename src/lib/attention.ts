/**
 * “Cần chú ý” strip for Insights — Copilot-style attention without noise.
 * Calm Vietnamese copy; no guilt language.
 */

import {
  budgetStatusLabel,
  budgetThreshold,
  type BudgetSummary,
} from "./planning/budgets.ts";
import { formatMoney } from "./money.ts";
import type { RecurringCommitment } from "./planning/commitments.ts";

export type AttentionItem = {
  id: string;
  label: string;
  href: string;
  tone: "warning" | "info" | "neutral";
};

/**
 * Days without a fresh archive before Home nudges toward `/settings/backup`.
 * Thirty is calm rather than naggy: the chip reappears monthly at most, and a
 * brand-new account (baseline `accountCreatedAt`) gets the same grace.
 */
export const BACKUP_REMINDER_DAYS = 30;

/**
 * What the workspace knows about backup recency. `null` means the state is
 * unavailable — demo mode, error paths and pre-migration deploys — in which
 * case the strip must stay silent rather than invent a reminder.
 */
export type BackupReminderState = {
  lastBackupAt: string | null;
  accountCreatedAt: string;
} | null;

const DAY_MS = 86_400_000;

/*
 * Chips are single-line pills (`white-space: nowrap`), so a full
 * "12.500.000 ₫" can crowd the strip. Compact VND ("12,5 tr") keeps the nudge
 * on one line; the linked page always shows exact đồng.
 */
const chipMoney = (minorUnits: number) =>
  formatMoney(minorUnits, /* compact */ true);

function daysBetweenIso(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );
}

export function buildAttentionItems(input: {
  budgets: BudgetSummary[];
  commitments: RecurringCommitment[];
  inboxCount?: number;
  needsReviewCount?: number;
  /**
   * Count of goals that are overdue or behind their declared deadline pace —
   * a number only, so goal objects stay outside the dashboard client boundary.
   * Absent/zero renders nothing.
   */
  goalPaceAttentionCount?: number;
  today: string;
  /**
   * Null/absent means the state is unknown (demo, deploy skew) — no chip,
   * because a reminder must not be invented. `lastBackupAt` null with a real
   * `accountCreatedAt` means "never backed up": the account's own age decides
   * whether the reader has had time to learn backups exist.
   */
  backup?: BackupReminderState;
}): AttentionItem[] {
  const items: AttentionItem[] = [];
  const {
    budgets,
    commitments,
    inboxCount = 0,
    needsReviewCount = 0,
    goalPaceAttentionCount = 0,
    today,
    backup = null,
  } = input;

  for (const budget of budgets) {
    const level = budgetThreshold(budget);
    if (level === "over" || level === "near") {
      items.push({
        id: `budget-${budget.id}`,
        label: `${budget.categoryName}: ${budgetStatusLabel(budget, chipMoney)}`,
        href: "/budgets",
        tone: level === "over" ? "warning" : "info",
      });
    }
  }

  const unpaidDue = commitments.filter(
    (c) => !c.isArchived && !c.isPaid && c.dueDate <= today,
  );
  if (unpaidDue.length === 1) {
    const c = unpaidDue[0]!;
    items.push({
      id: `bill-${c.id}`,
      label: `Hóa đơn tới hạn: ${c.name} (${chipMoney(c.amount)})`,
      href: "/commitments",
      tone: "warning",
    });
  } else if (unpaidDue.length > 1) {
    items.push({
      id: "bills-many",
      label: `${unpaidDue.length} hóa đơn tới hạn hoặc quá hạn`,
      href: "/commitments",
      tone: "warning",
    });
  }

  if (goalPaceAttentionCount > 0) {
    items.push({
      id: "goals-pace",
      label: `${goalPaceAttentionCount} mục tiêu quá hạn hoặc chậm nhịp`,
      href: "/goals",
      tone: "info",
    });
  }

  if (inboxCount > 0) {
    items.push({
      id: "inbox",
      label: `${inboxCount} mục cần xem trước khi ghi sổ`,
      href: "/inbox",
      tone: "neutral",
    });
  }

  if (needsReviewCount > 0) {
    items.push({
      id: "needs-review",
      label: `${needsReviewCount} giao dịch cần kiểm tra`,
      href: "/transactions?review=needs_review",
      tone: "neutral",
    });
  }

  if (backup) {
    const daysSinceBaseline = daysBetweenIso(
      backup.lastBackupAt ?? backup.accountCreatedAt,
      today,
    );
    if (daysSinceBaseline > BACKUP_REMINDER_DAYS) {
      items.push({
        id: "backup-reminder",
        // A missing backup states the fact plainly; an aging one carries the
        // day count. Never print the account's age as if it were backup age.
        label: backup.lastBackupAt
          ? `Bản sao lưu gần nhất đã ${daysSinceBaseline} ngày trước`
          : "Chưa có bản sao lưu nào",
        href: "/settings/backup",
        tone: "info",
      });
    }
  }

  return items.slice(0, 4);
}
