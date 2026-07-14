"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  defaultCategoryMeta,
  normalizeCategoryName,
  type CategorySummary,
  type SaveCategoryInput,
} from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import { mapCategoryRow } from "@/server/categories";
import { requireViewer } from "@/server/auth";

export type CategoryActionResult =
  | { ok: true; category?: CategorySummary }
  | { ok: false; message: string };

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(60),
  kind: z.enum(["income", "expense"]),
  icon: z.string().max(40).nullable().optional(),
  color: z.string().max(40).nullable().optional(),
});

const archiveSchema = z.object({
  id: z.string().uuid(),
  archived: z.boolean(),
});

function refreshCategoryPages() {
  revalidatePath("/categories");
  revalidatePath("/settings");
  revalidatePath("/insights");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/commitments");
  revalidatePath("/capture/quick");
}

function categoryError(message: string) {
  if (
    message.includes("categories_user_id_name_kind_key") ||
    message.includes("duplicate key") ||
    message.includes("unique")
  ) {
    return "Đã có danh mục cùng tên trong loại này.";
  }
  return "Không thể cập nhật danh mục. Hãy thử lại.";
}

export async function saveCategoryAction(
  input: SaveCategoryInput,
): Promise<CategoryActionResult> {
  const parsed = saveSchema.safeParse({
    ...input,
    name: normalizeCategoryName(input.name),
  });
  if (!parsed.success) {
    return { ok: false, message: "Thông tin danh mục chưa hợp lệ." };
  }

  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return { ok: false, message: "Chế độ demo không lưu danh mục lên máy chủ." };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const meta = defaultCategoryMeta(parsed.data.kind);
  const icon = parsed.data.icon ?? meta.icon;
  const color = parsed.data.color ?? meta.color;
  const name = parsed.data.name;

  let categoryId = parsed.data.id;
  if (categoryId) {
    const { data: existing, error: loadError } = await supabase
      .from("categories")
      .select("id,kind")
      .eq("id", categoryId)
      .maybeSingle();
    if (loadError || !existing) {
      return { ok: false, message: "Không tìm thấy danh mục." };
    }
    // Kind is immutable after create (no subcategory / reparent).
    if (existing.kind !== parsed.data.kind) {
      return { ok: false, message: "Không đổi được loại danh mục sau khi tạo." };
    }
    const { error } = await supabase
      .from("categories")
      .update({ name, icon, color })
      .eq("id", categoryId);
    if (error) return { ok: false, message: categoryError(error.message) };
  } else {
    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: viewer.id,
        name,
        kind: parsed.data.kind,
        icon,
        color,
        is_default: false,
        is_archived: false,
      })
      .select("id")
      .single();
    if (error || !data?.id) {
      return { ok: false, message: categoryError(error?.message ?? "create_failed") };
    }
    categoryId = data.id as string;
  }

  const { data: row, error: fetchError } = await supabase
    .from("categories")
    .select("id,name,kind,icon,color,is_default,is_archived")
    .eq("id", categoryId)
    .single();

  if (fetchError || !row) {
    refreshCategoryPages();
    return { ok: false, message: "Đã lưu nhưng chưa tải lại được danh mục." };
  }

  try {
    const category = mapCategoryRow(row);
    refreshCategoryPages();
    return { ok: true, category };
  } catch {
    refreshCategoryPages();
    return { ok: false, message: "Dữ liệu danh mục trả về không hợp lệ." };
  }
}

export async function setCategoryArchivedAction(
  id: string,
  archived: boolean,
): Promise<CategoryActionResult> {
  const parsed = archiveSchema.safeParse({ id, archived });
  if (!parsed.success) return { ok: false, message: "Yêu cầu chưa hợp lệ." };

  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return { ok: false, message: "Chế độ demo không thay đổi danh mục máy chủ." };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const { data, error } = await supabase
    .from("categories")
    .update({ is_archived: parsed.data.archived })
    .eq("id", parsed.data.id)
    .select("id,name,kind,icon,color,is_default,is_archived")
    .maybeSingle();

  if (error) return { ok: false, message: categoryError(error.message) };
  if (!data) return { ok: false, message: "Không tìm thấy danh mục." };

  try {
    const category = mapCategoryRow(data);
    refreshCategoryPages();
    return { ok: true, category };
  } catch {
    refreshCategoryPages();
    return { ok: false, message: "Dữ liệu danh mục trả về không hợp lệ." };
  }
}
