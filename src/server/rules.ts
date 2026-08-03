import "server-only";

import { z } from "zod";
import type { InboxRule } from "@/lib/inbox/rules-store";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";

export type RulesWorkspace = {
  featureAvailable: boolean;
  rules: InboxRule[];
  dataError: string | null;
};

const ruleRowSchema = z.object({
  id: z.string().uuid(),
  stage: z.literal("candidate"),
  priority: z.union([z.number(), z.string()]),
  enabled: z.boolean(),
  match_field: z.enum(["merchant", "note", "raw", "any"]),
  contains_text: z.string().min(1),
  category_id: z.string().uuid(),
  merchant_name: z.string().nullable(),
  version: z.union([z.number(), z.string()]),
  created_at: z.string(),
  updated_at: z.string(),
});

const categoryRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  is_archived: z.boolean(),
});

type QueryError = { code?: string; message?: string } | null;

function safePositiveInteger(value: number | string, label: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(label);
  return parsed;
}

function isMissingRulesContract(error: QueryError) {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("inbox_rules") ||
    message.includes("Could not find the table")
  );
}

export async function getRulesWorkspace(): Promise<RulesWorkspace> {
  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return { featureAvailable: true, rules: [], dataError: null };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      featureAvailable: false,
      rules: [],
      dataError: "Không thể kết nối dữ liệu quy tắc.",
    };
  }

  const [rulesResult, categoriesResult] = await Promise.all([
    supabase
      .from("inbox_rules")
      .select(
        "id,stage,priority,enabled,match_field,contains_text,category_id,merchant_name,version,created_at,updated_at",
      )
      .order("priority")
      .order("created_at")
      .order("id"),
    supabase.from("categories").select("id,name,is_archived"),
  ]);

  if (isMissingRulesContract(rulesResult.error)) {
    return { featureAvailable: false, rules: [], dataError: null };
  }
  if (rulesResult.error || categoriesResult.error) {
    return {
      featureAvailable: true,
      rules: [],
      dataError: "Chưa tải được quy tắc. Hãy thử lại.",
    };
  }

  try {
    const categoryById = new Map(
      z
        .array(categoryRowSchema)
        .parse(categoriesResult.data ?? [])
        .filter((category) => !category.is_archived)
        .map((category) => [category.id, category.name] as const),
    );
    const rules = z.array(ruleRowSchema).parse(rulesResult.data ?? []).map((row) => {
      const category = categoryById.get(row.category_id);
      if (!category) throw new Error("rule_category_unavailable");
      return {
        id: row.id,
        stage: row.stage,
        priority: safePositiveInteger(row.priority, "invalid_rule_priority"),
        enabled: row.enabled,
        contains: row.contains_text,
        field: row.match_field,
        categoryId: row.category_id,
        category,
        merchant: row.merchant_name ?? undefined,
        version: safePositiveInteger(row.version, "invalid_rule_version"),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } satisfies InboxRule;
    });
    return { featureAvailable: true, rules, dataError: null };
  } catch {
    return {
      featureAvailable: true,
      rules: [],
      dataError: "Dữ liệu quy tắc không đúng định dạng.",
    };
  }
}
