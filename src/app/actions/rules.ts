"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { InboxRule } from "@/lib/inbox/rules-store";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";
import { getRulesWorkspace } from "@/server/rules";

export type RuleActionResult =
  | { ok: true; rules: InboxRule[] }
  | { ok: false; message: string };

export type AppliedCandidateRuleResult =
  | {
      ok: true;
      candidateId: string;
      ruleId: string;
      ruleVersion: number;
      categoryId: string;
      category: string;
      merchant: string;
    }
  | { ok: false; message: string };

const saveRuleSchema = z.object({
  id: z.string().uuid().optional(),
  expectedVersion: z.number().int().min(1).optional(),
  stage: z.literal("candidate").default("candidate"),
  priority: z.number().int().min(1).max(100000).optional(),
  enabled: z.boolean().default(true),
  field: z.enum(["merchant", "note", "raw", "any"]),
  contains: z.string().trim().min(1).max(120),
  categoryId: z.string().uuid(),
  merchant: z.string().trim().max(200).optional(),
});

const deleteRuleSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().min(1),
});

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1).max(100),
});

const applySchema = z.object({
  candidateId: z.string().uuid(),
  ruleId: z.string().uuid(),
  ruleVersion: z.number().int().min(1),
});

type RpcError = { code?: string; message?: string } | null;

function refreshRuleSurfaces() {
  revalidatePath("/rules");
  revalidatePath("/inbox");
  revalidatePath("/capture");
  revalidatePath("/capture/paste");
}

function ruleError(error: RpcError) {
  const message = error?.message ?? "";
  if (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    error?.code === "PGRST202" ||
    message.includes("inbox_rules") ||
    message.includes("Could not find the table") ||
    message.includes("Could not find the function")
  ) {
    return "Tính năng quy tắc chưa được bật trên máy chủ.";
  }
  if (message.includes("rule_category_not_available")) {
    return "Danh mục của quy tắc không còn khả dụng.";
  }
  if (message.includes("rule_no_longer_matches")) {
    return "Nội dung ứng viên đã đổi và không còn khớp quy tắc này.";
  }
  if (message.includes("rule_not_available") || message.includes("rule_not_found")) {
    return "Quy tắc đã thay đổi hoặc không còn tồn tại.";
  }
  if (message.includes("candidate_not_found")) {
    return "Ứng viên không còn tồn tại trong Inbox.";
  }
  if (message.includes("candidate_not_pending")) {
    return "Chỉ ứng viên đang chờ duyệt mới áp dụng được quy tắc.";
  }
  if (message.includes("rule_category_kind_mismatch")) {
    return "Danh mục của quy tắc không phù hợp loại giao dịch.";
  }
  return "Không cập nhật được quy tắc. Hãy thử lại.";
}

async function authenticatedClient() {
  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return {
      ok: false as const,
      message: "Chế độ demo dùng quy tắc trên thiết bị.",
    };
  }
  const supabase = await createClient();
  if (!supabase) {
    return { ok: false as const, message: "Không thể kết nối Supabase." };
  }
  return { ok: true as const, viewer, supabase };
}

async function canonicalRules(): Promise<RuleActionResult> {
  refreshRuleSurfaces();
  const workspace = await getRulesWorkspace();
  if (!workspace.featureAvailable) {
    return { ok: false, message: "Tính năng quy tắc chưa được bật trên máy chủ." };
  }
  if (workspace.dataError) return { ok: false, message: workspace.dataError };
  return { ok: true, rules: workspace.rules };
}

export async function listRulesAction(): Promise<RuleActionResult> {
  const workspace = await getRulesWorkspace();
  if (!workspace.featureAvailable) {
    return { ok: false, message: "Tính năng quy tắc chưa được bật trên máy chủ." };
  }
  if (workspace.dataError) return { ok: false, message: workspace.dataError };
  return { ok: true, rules: workspace.rules };
}

export async function saveRuleAction(
  input: z.input<typeof saveRuleSchema>,
): Promise<RuleActionResult> {
  const parsed = saveRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Thông tin quy tắc chưa hợp lệ." };
  }
  const auth = await authenticatedClient();
  if (!auth.ok) return { ok: false, message: auth.message };

  const { data: category, error: categoryError } = await auth.supabase
    .from("categories")
    .select("id")
    .eq("id", parsed.data.categoryId)
    .eq("is_archived", false)
    .maybeSingle();
  if (categoryError || !category) {
    return { ok: false, message: "Danh mục của quy tắc không còn khả dụng." };
  }

  const merchantName = parsed.data.merchant?.trim() || null;
  if (parsed.data.id) {
    if (!parsed.data.expectedVersion) {
      return { ok: false, message: "Thiếu phiên bản quy tắc để cập nhật an toàn." };
    }
    const { data, error } = await auth.supabase
      .from("inbox_rules")
      .update({
        stage: parsed.data.stage,
        priority: parsed.data.priority,
        enabled: parsed.data.enabled,
        match_field: parsed.data.field,
        contains_text: parsed.data.contains,
        category_id: parsed.data.categoryId,
        merchant_name: merchantName,
      })
      .eq("id", parsed.data.id)
      .eq("version", parsed.data.expectedVersion)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, message: ruleError(error) };
    if (!data) {
      return {
        ok: false,
        message: "Quy tắc đã được thay đổi ở nơi khác. Hãy tải lại trước khi lưu.",
      };
    }
  } else {
    let priority = parsed.data.priority;
    if (!priority) {
      const { data: last, error: lastError } = await auth.supabase
        .from("inbox_rules")
        .select("priority")
        .order("priority", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastError) return { ok: false, message: ruleError(lastError) };
      priority = Number(last?.priority ?? 0) + 1;
    }
    const { error } = await auth.supabase.from("inbox_rules").insert({
      user_id: auth.viewer.id,
      stage: parsed.data.stage,
      priority,
      enabled: parsed.data.enabled,
      match_field: parsed.data.field,
      contains_text: parsed.data.contains,
      category_id: parsed.data.categoryId,
      merchant_name: merchantName,
    });
    if (error) return { ok: false, message: ruleError(error) };
  }

  return canonicalRules();
}

export async function deleteRuleAction(input: {
  id: string;
  expectedVersion: number;
}): Promise<RuleActionResult> {
  const parsed = deleteRuleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Yêu cầu xóa chưa hợp lệ." };
  const auth = await authenticatedClient();
  if (!auth.ok) return { ok: false, message: auth.message };

  const { error, count } = await auth.supabase
    .from("inbox_rules")
    .delete({ count: "exact" })
    .eq("id", parsed.data.id)
    .eq("version", parsed.data.expectedVersion);
  if (error) return { ok: false, message: ruleError(error) };
  if (count === 0) {
    return {
      ok: false,
      message: "Quy tắc đã được thay đổi ở nơi khác. Hãy tải lại trước khi xóa.",
    };
  }
  return canonicalRules();
}

export async function reorderRulesAction(
  orderedIds: string[],
): Promise<RuleActionResult> {
  const parsed = reorderSchema.safeParse({ orderedIds });
  if (!parsed.success || new Set(parsed.data.orderedIds).size !== parsed.data.orderedIds.length) {
    return { ok: false, message: "Thứ tự quy tắc chưa hợp lệ." };
  }
  const auth = await authenticatedClient();
  if (!auth.ok) return { ok: false, message: auth.message };
  const { error } = await auth.supabase.rpc("replace_inbox_rule_priorities", {
    p_rule_ids: parsed.data.orderedIds,
  });
  if (error) return { ok: false, message: ruleError(error) };
  return canonicalRules();
}

export async function applyRuleToCandidateAction(input: {
  candidateId: string;
  ruleId: string;
  ruleVersion: number;
}): Promise<AppliedCandidateRuleResult> {
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Bằng chứng áp dụng quy tắc chưa hợp lệ." };
  }
  const auth = await authenticatedClient();
  if (!auth.ok) return { ok: false, message: auth.message };

  const { data, error } = await auth.supabase
    .rpc("apply_inbox_rule_to_candidate", {
      p_candidate_id: parsed.data.candidateId,
      p_rule_id: parsed.data.ruleId,
      p_expected_version: parsed.data.ruleVersion,
    })
    .single();
  if (error || !data) return { ok: false, message: ruleError(error) };

  const row = z
    .object({
      candidate_id: z.string().uuid(),
      rule_id: z.string().uuid(),
      rule_version: z.union([z.number(), z.string()]),
      category_id: z.string().uuid(),
      category_name: z.string(),
      merchant_name: z.string(),
    })
    .safeParse(data);
  if (!row.success) {
    return { ok: false, message: "Đã áp dụng nhưng dữ liệu trả về không hợp lệ." };
  }
  refreshRuleSurfaces();
  return {
    ok: true,
    candidateId: row.data.candidate_id,
    ruleId: row.data.rule_id,
    ruleVersion: Number(row.data.rule_version),
    categoryId: row.data.category_id,
    category: row.data.category_name,
    merchant: row.data.merchant_name,
  };
}
