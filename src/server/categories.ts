import "server-only";

import { z } from "zod";
import type { CategorySummary } from "@/lib/categories";
import type { TransactionKind } from "@/lib/transactions/contracts";
import { demoCategories } from "@/lib/demo/transaction-fixtures";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";

export type CategoriesWorkspace = {
  categories: CategorySummary[];
  dataError: string | null;
};

const categoryRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  kind: z.enum(["income", "expense"]),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  is_default: z.boolean(),
  is_archived: z.boolean(),
});

export function mapCategoryRow(value: unknown): CategorySummary {
  const row = categoryRowSchema.parse(value);
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as TransactionKind,
    icon: row.icon,
    color: row.color,
    isDefault: row.is_default,
    isArchived: row.is_archived,
  };
}

const demoCategoryRows: CategorySummary[] = demoCategories.map((item) => ({
  ...item,
  isDefault: true,
  isArchived: false,
}));

export async function getCategoriesWorkspace(): Promise<CategoriesWorkspace> {
  const viewer = await requireViewer();
  if (viewer.isDemo) return { categories: demoCategoryRows, dataError: null };

  const supabase = await createClient();
  if (!supabase) {
    return { categories: [], dataError: "Không thể kết nối dữ liệu danh mục." };
  }

  const result = await supabase
    .from("categories")
    .select("id,name,kind,icon,color,is_default,is_archived")
    .order("is_archived")
    .order("kind")
    .order("created_at");

  if (result.error) {
    return { categories: [], dataError: "Chưa tải được danh mục. Hãy thử lại." };
  }

  try {
    const categories = (result.data ?? []).map(mapCategoryRow);
    return { categories, dataError: null };
  } catch {
    return {
      categories: [],
      dataError: "Dữ liệu danh mục không đúng định dạng.",
    };
  }
}
