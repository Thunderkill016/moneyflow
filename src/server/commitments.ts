import "server-only";

import { z } from "zod";
import { currentMonthStart } from "@/server/budgets";
import { requireViewer } from "@/server/auth";
import { createClient } from "@/lib/supabase/server";
import { demoAccounts, demoCategories, type AccountOption, type CategoryOption } from "@/lib/sample-data";
import { commitmentTotals, dueDateForMonth, type RecurringCommitment } from "@/lib/commitments";

export type CommitmentsWorkspace = {
  commitments: RecurringCommitment[];
  accounts: AccountOption[];
  categories: CategoryOption[];
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
const occurrenceSchema = z.object({ commitment_id: z.string().uuid(), transaction_id: z.string().uuid() });
const accountSchema = z.object({ id: z.string().uuid(), name: z.string().min(1) });
const categorySchema = z.object({ id: z.string().uuid(), name: z.string(), kind: z.literal("expense"), icon: z.string().nullable(), color: z.string().nullable() });

export function currentDateInVietnam() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function mapCommitmentRow(value: unknown, monthStart: string, transactionId: string | null = null): RecurringCommitment {
  const row = feedSchema.parse(value);
  const amount = Number(row.amount_minor);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("invalid_commitment_amount");
  return { id: row.id, name: row.name, amount, dueDay: row.due_day, dueDate: dueDateForMonth(monthStart, row.due_day),
    accountId: row.account_id, accountName: row.account_name, categoryId: row.category_id,
    categoryName: row.category_name, categoryIcon: row.category_icon, categoryColor: row.category_color,
    isArchived: row.is_archived, isPaid: Boolean(transactionId), transactionId };
}

function demoWorkspace(monthStart: string): CommitmentsWorkspace {
  const account = demoAccounts[0];
  const category = (name: string) => demoCategories.find((item) => item.name === name)!;
  const rows: RecurringCommitment[] = [
    { id: "demo-rent", name: "Tiền thuê nhà", amount: 4_500_000, dueDay: 5, dueDate: dueDateForMonth(monthStart, 5), accountId: account.id, accountName: account.name, categoryId: category("Nhà ở").id, categoryName: "Nhà ở", categoryIcon: "home", categoryColor: "amber", isArchived: false, isPaid: true, transactionId: "demo-rent-paid" },
    { id: "demo-internet", name: "Internet gia đình", amount: 250_000, dueDay: 18, dueDate: dueDateForMonth(monthStart, 18), accountId: account.id, accountName: account.name, categoryId: category("Hóa đơn").id, categoryName: "Hóa đơn", categoryIcon: "receipt", categoryColor: "cyan", isArchived: false, isPaid: false, transactionId: null },
    { id: "demo-electricity", name: "Tiền điện", amount: 650_000, dueDay: 25, dueDate: dueDateForMonth(monthStart, 25), accountId: account.id, accountName: account.name, categoryId: category("Hóa đơn").id, categoryName: "Hóa đơn", categoryIcon: "receipt", categoryColor: "cyan", isArchived: false, isPaid: false, transactionId: null },
  ];
  return { commitments: rows, accounts: demoAccounts, categories: demoCategories.filter((item) => item.kind === "expense"), monthStart, today: currentDateInVietnam(), reservedTotal: commitmentTotals(rows).reserved, dataError: null };
}

export async function getCommitmentsWorkspace(): Promise<CommitmentsWorkspace> {
  const viewer = await requireViewer();
  const monthStart = currentMonthStart();
  if (viewer.isDemo) return demoWorkspace(monthStart);
  const supabase = await createClient();
  const empty = { commitments: [], accounts: [], categories: [], monthStart, today: currentDateInVietnam(), reservedTotal: 0 };
  if (!supabase) return { ...empty, dataError: "Không thể kết nối dữ liệu khoản định kỳ." };
  const [feed, occurrences, accounts, categories] = await Promise.all([
    supabase.from("recurring_commitment_feed").select("id,name,amount_minor,due_day,account_id,account_name,category_id,category_name,category_icon,category_color,is_archived").order("due_day"),
    supabase.from("commitment_occurrences").select("commitment_id,transaction_id").eq("month_start", monthStart),
    supabase.from("accounts").select("id,name").eq("is_archived", false).order("created_at"),
    supabase
      .from("categories")
      .select("id,name,kind,icon,color")
      .eq("kind", "expense")
      .eq("is_archived", false)
      .order("created_at"),
  ]);
  if (feed.error || occurrences.error || accounts.error || categories.error) return { ...empty, dataError: "Chưa tải được khoản định kỳ. Hãy thử lại." };
  try {
    const paid = new Map(z.array(occurrenceSchema).parse(occurrences.data).map((item) => [item.commitment_id, item.transaction_id]));
    const commitments = z.array(z.unknown()).parse(feed.data).map((row) => {
      const id = feedSchema.parse(row).id;
      return mapCommitmentRow(row, monthStart, paid.get(id) ?? null);
    });
    return { commitments, accounts: z.array(accountSchema).parse(accounts.data), categories: z.array(categorySchema).parse(categories.data), monthStart, today: currentDateInVietnam(), reservedTotal: commitmentTotals(commitments).reserved, dataError: null };
  } catch { return { ...empty, dataError: "Dữ liệu khoản định kỳ không đúng định dạng." }; }
}
