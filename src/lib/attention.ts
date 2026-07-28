/**
 * “Cần chú ý” strip for Insights — Copilot-style attention without noise.
 * Calm Vietnamese copy; no guilt language.
 */

import { budgetStatusLabel, budgetThreshold, type BudgetSummary } from "./planning/budgets.ts";
import { formatMoney } from "./money.ts";
import type { RecurringCommitment } from "./planning/commitments.ts";

export type AttentionItem = {
  id: string;
  label: string;
  href: string;
  tone: "warning" | "info" | "neutral";
};

export function buildAttentionItems(input: {
  budgets: BudgetSummary[];
  commitments: RecurringCommitment[];
  inboxCount?: number;
  today: string;
}): AttentionItem[] {
  const items: AttentionItem[] = [];
  const { budgets, commitments, inboxCount = 0, today } = input;

  for (const budget of budgets) {
    const level = budgetThreshold(budget);
    if (level === "over" || level === "near") {
      items.push({
        id: `budget-${budget.id}`,
        label: `${budget.categoryName}: ${budgetStatusLabel(budget, formatMoney)}`,
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
      label: `Hóa đơn tới hạn: ${c.name} (${formatMoney(c.amount)})`,
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

  if (inboxCount > 0) {
    items.push({
      id: "inbox",
      label: `${inboxCount} mục trong hộp thư chờ duyệt`,
      href: "/inbox",
      tone: "neutral",
    });
  }

  return items.slice(0, 4);
}
