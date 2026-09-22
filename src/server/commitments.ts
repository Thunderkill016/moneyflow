import "server-only";

import { z } from "zod";
import { currentMonthStart } from "@/server/budgets";
import { requireViewer } from "@/server/auth";
import { createClient } from "@/lib/supabase/server";
import type { AccountOption, CategoryOption } from "@/lib/transactions/contracts";
import { demoAccounts, demoCategories } from "@/lib/demo/transaction-fixtures";
import { commitmentTotals, dueDateForMonth, type RecurringCommitment } from "@/lib/planning/commitments";
import {
  recurringDetectionStart,
  type RecurringDetectionRow,
} from "@/lib/planning/recurring-detection";
import { readAllPages } from "@/lib/paginated-read";
import { demoCommitmentSeeds } from "@/lib/demo/commitment-fixtures";
import { todayInVietnam } from "@/lib/vietnam-date";

export type CommitmentsWorkspace = {
  commitments: RecurringCommitment[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  /**
   * Detection-scoped ledger slice (expense/income/transfer notes, dates and
   * amounts) covering the recurring-pattern lookback window. Advisory only —
   * a failed read degrades to an empty list, never a page error.
   */
  detectionRows: RecurringDetectionRow[];
  monthStart: string;
  today: string;
  reservedTotal: number;
  dataError: string | null;
};

const feedSchema = z.object({
  id: z.string().uuid(), name: z.string().min(1), amount_minor: z.union([z.number(), z.string()]),
  due_day: z.number().int().min(1).max(31), account_id: z.string().uuid(), account_name: z.string().min(1),
  category_id: z.string().uuid(), category_name: z.string().min(1), category_icon: z.string().nullable(),
  category_color: z.string().nullable(), is_archived: z.boolean(),
});
const occurrenceSchema = z.object({ commitment_id: z.string().uuid(), transaction_id: z.string().uuid(), paid_at: z.string() });
const accountSchema = z.object({ id: z.string().uuid(), name: z.string().min(1) });
const categorySchema = z.object({ id: z.string().uuid(), name: z.string(), kind: z.literal("expense"), icon: z.string().nullable(), color: z.string().nullable() });
/** Lean transaction_feed row for recurring detection — no names needed. */
const detectionRowSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["income", "expense", "transfer"]),
  note: z.string(),
  occurred_on: z.string(),
  amount_minor: z.union([z.number(), z.string()]),
  account_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
});

export function mapCommitmentRow(value: unknown, monthStart: string, transactionId: string | null = null, paidOn: string | null = null): RecurringCommitment {
  const row = feedSchema.parse(value);
  const amount = Number(row.amount_minor);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("invalid_commitment_amount");
  return { id: row.id, name: row.name, amount, dueDay: row.due_day, dueDate: dueDateForMonth(monthStart, row.due_day),
    accountId: row.account_id, accountName: row.account_name, categoryId: row.category_id,
    categoryName: row.category_name, categoryIcon: row.category_icon, categoryColor: row.category_color,
    isArchived: row.is_archived, isPaid: Boolean(transactionId), transactionId, paidOn };
}

function demoWorkspace(monthStart: string): CommitmentsWorkspace {
  const rows = demoCommitmentSeeds(monthStart);
  /*
   * Demo detection rows stay empty server-side on purpose: the demo ledger
   * lives in browser localStorage, so the page reads it client-side after
   * hydration rather than trusting seed rows here.
   */
  return { commitments: rows, accounts: demoAccounts, categories: demoCategories.filter((item) => item.kind === "expense"), detectionRows: [], monthStart, today: todayInVietnam(), reservedTotal: commitmentTotals(rows).reserved, dataError: null };
}

export async function getCommitmentsWorkspace(): Promise<CommitmentsWorkspace> {
  const viewer = await requireViewer();
  const monthStart = currentMonthStart();
  if (viewer.isDemo) return demoWorkspace(monthStart);
  const supabase = await createClient();
  const today = todayInVietnam();
  const empty = { commitments: [], accounts: [], categories: [], detectionRows: [], monthStart, today, reservedTotal: 0 };
  if (!supabase) return { ...empty, dataError: "Không thể kết nối dữ liệu khoản định kỳ." };
  const [feed, occurrences, accounts, categories, detectionFeed] = await Promise.all([
    supabase.from("recurring_commitment_feed").select("id,name,amount_minor,due_day,account_id,account_name,category_id,category_name,category_icon,category_color,is_archived").order("due_day"),
    supabase.from("commitment_occurrences").select("commitment_id,transaction_id,paid_at").eq("month_start", monthStart),
    supabase.from("accounts").select("id,name").eq("is_archived", false).order("created_at"),
    supabase
      .from("categories")
      .select("id,name,kind,icon,color")
      .eq("kind", "expense")
      .eq("is_archived", false)
      .order("created_at"),
    readAllPages((from, to) =>
      supabase
        .from("transaction_feed")
        .select("id,kind,note,occurred_on,amount_minor,account_id,category_id")
        .eq("user_id", viewer.id)
        .gte("occurred_on", recurringDetectionStart(today))
        .order("occurred_on", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    ),
  ]);
  if (feed.error || occurrences.error || accounts.error || categories.error) return { ...empty, dataError: "Chưa tải được khoản định kỳ. Hãy thử lại." };
  try {
    const paid = new Map(z.array(occurrenceSchema).parse(occurrences.data).map((item) => [item.commitment_id, item]));
    const commitments = z.array(z.unknown()).parse(feed.data).map((row) => {
      const id = feedSchema.parse(row).id;
      const occurrence = paid.get(id);
      return mapCommitmentRow(
        row,
        monthStart,
        occurrence?.transaction_id ?? null,
        occurrence ? todayInVietnam(new Date(occurrence.paid_at)) : null,
      );
    });
    return { commitments, accounts: z.array(accountSchema).parse(accounts.data), categories: z.array(categorySchema).parse(categories.data), detectionRows: mapDetectionRows(detectionFeed), monthStart, today, reservedTotal: commitmentTotals(commitments).reserved, dataError: null };
  } catch { return { ...empty, dataError: "Dữ liệu khoản định kỳ không đúng định dạng." }; }
}

/**
 * Advisory read: unparseable or failed detection rows degrade to an empty
 * list. Suggestions disappearing must never take the commitments page down.
 */
function mapDetectionRows(
  result: { data: unknown[] | null; error: unknown },
): RecurringDetectionRow[] {
  if (result.error) return [];
  const rows: RecurringDetectionRow[] = [];
  for (const value of result.data ?? []) {
    const parsed = detectionRowSchema.safeParse(value);
    if (!parsed.success) continue;
    const amount = Math.abs(Number(parsed.data.amount_minor));
    if (!Number.isSafeInteger(amount) || amount <= 0) continue;
    rows.push({
      id: parsed.data.id,
      kind: parsed.data.kind,
      note: parsed.data.note,
      amount,
      occurredOn: parsed.data.occurred_on.slice(0, 10),
      accountId: parsed.data.account_id,
      categoryId: parsed.data.category_id ?? undefined,
    });
  }
  return rows;
}
