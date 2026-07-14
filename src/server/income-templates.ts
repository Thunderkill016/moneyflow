import "server-only";

import { z } from "zod";
import { currentMonthStart } from "@/server/budgets";
import { requireViewer } from "@/server/auth";
import { createClient } from "@/lib/supabase/server";
import { demoAccounts, demoCategories, type AccountOption, type CategoryOption } from "@/lib/sample-data";
import {
  dueDateForMonth,
  incomeTemplateTotals,
  type RecurringIncomeTemplate,
} from "@/lib/income-templates";
import { currentDateInVietnam } from "@/server/commitments";

export type IncomeTemplatesWorkspace = {
  templates: RecurringIncomeTemplate[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  monthStart: string;
  today: string;
  expectedTotal: number;
  dataError: string | null;
};

const feedSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  amount_minor: z.union([z.number(), z.string()]),
  due_day: z.number().int().min(1).max(31),
  account_id: z.string().uuid(),
  account_name: z.string().min(1),
  category_id: z.string().uuid(),
  category_name: z.string().min(1),
  category_icon: z.string().nullable(),
  category_color: z.string().nullable(),
  is_archived: z.boolean(),
});
const occurrenceSchema = z.object({
  template_id: z.string().uuid(),
  transaction_id: z.string().uuid(),
});
const accountSchema = z.object({ id: z.string().uuid(), name: z.string().min(1) });
const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  kind: z.literal("income"),
  icon: z.string().nullable(),
  color: z.string().nullable(),
});

export function mapIncomeTemplateRow(
  value: unknown,
  monthStart: string,
  transactionId: string | null = null,
): RecurringIncomeTemplate {
  const row = feedSchema.parse(value);
  const amount = Number(row.amount_minor);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("invalid_income_template_amount");
  return {
    id: row.id,
    name: row.name,
    amount,
    dueDay: row.due_day,
    dueDate: dueDateForMonth(monthStart, row.due_day),
    accountId: row.account_id,
    accountName: row.account_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    categoryColor: row.category_color,
    isArchived: row.is_archived,
    isReceived: Boolean(transactionId),
    transactionId,
  };
}

function demoWorkspace(monthStart: string): IncomeTemplatesWorkspace {
  const account = demoAccounts[0];
  const category = (name: string) => demoCategories.find((item) => item.name === name)!;
  const rows: RecurringIncomeTemplate[] = [
    {
      id: "demo-salary",
      name: "Lương tháng",
      amount: 20_000_000,
      dueDay: 5,
      dueDate: dueDateForMonth(monthStart, 5),
      accountId: account.id,
      accountName: account.name,
      categoryId: category("Lương").id,
      categoryName: "Lương",
      categoryIcon: "wallet",
      categoryColor: "green",
      isArchived: false,
      isReceived: false,
      transactionId: null,
    },
    {
      id: "demo-side",
      name: "Thu nhập phụ",
      amount: 3_000_000,
      dueDay: 20,
      dueDate: dueDateForMonth(monthStart, 20),
      accountId: account.id,
      accountName: account.name,
      categoryId: category("Thu nhập khác").id,
      categoryName: "Thu nhập khác",
      categoryIcon: "plus",
      categoryColor: "green",
      isArchived: false,
      isReceived: false,
      transactionId: null,
    },
  ];
  return {
    templates: rows,
    accounts: demoAccounts,
    categories: demoCategories.filter((item) => item.kind === "income"),
    monthStart,
    today: currentDateInVietnam(),
    expectedTotal: incomeTemplateTotals(rows).expected,
    dataError: null,
  };
}

export async function getIncomeTemplatesWorkspace(): Promise<IncomeTemplatesWorkspace> {
  const viewer = await requireViewer();
  const monthStart = currentMonthStart();
  if (viewer.isDemo) return demoWorkspace(monthStart);
  const supabase = await createClient();
  const empty = {
    templates: [] as RecurringIncomeTemplate[],
    accounts: [] as AccountOption[],
    categories: [] as CategoryOption[],
    monthStart,
    today: currentDateInVietnam(),
    expectedTotal: 0,
  };
  if (!supabase) {
    return { ...empty, dataError: "Không thể kết nối dữ liệu lương định kỳ." };
  }
  const [feed, occurrences, accounts, categories] = await Promise.all([
    supabase
      .from("recurring_income_template_feed")
      .select(
        "id,name,amount_minor,due_day,account_id,account_name,category_id,category_name,category_icon,category_color,is_archived",
      )
      .order("due_day"),
    supabase
      .from("income_template_occurrences")
      .select("template_id,transaction_id")
      .eq("month_start", monthStart),
    supabase.from("accounts").select("id,name").eq("is_archived", false).order("created_at"),
    supabase
      .from("categories")
      .select("id,name,kind,icon,color")
      .eq("kind", "income")
      .eq("is_archived", false)
      .order("created_at"),
  ]);
  if (feed.error || occurrences.error || accounts.error || categories.error) {
    return { ...empty, dataError: "Chưa tải được lương định kỳ. Hãy thử lại." };
  }
  try {
    const received = new Map(
      z
        .array(occurrenceSchema)
        .parse(occurrences.data)
        .map((item) => [item.template_id, item.transaction_id]),
    );
    const templates = z
      .array(z.unknown())
      .parse(feed.data)
      .map((row) => {
        const id = feedSchema.parse(row).id;
        return mapIncomeTemplateRow(row, monthStart, received.get(id) ?? null);
      });
    return {
      templates,
      accounts: z.array(accountSchema).parse(accounts.data),
      categories: z.array(categorySchema).parse(categories.data),
      monthStart,
      today: currentDateInVietnam(),
      expectedTotal: incomeTemplateTotals(templates).expected,
      dataError: null,
    };
  } catch {
    return { ...empty, dataError: "Dữ liệu lương định kỳ không đúng định dạng." };
  }
}
