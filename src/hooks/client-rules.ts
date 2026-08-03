import {
  applyRuleToCandidateAction,
  deleteRuleAction,
  listRulesAction,
  reorderRulesAction,
  saveRuleAction,
} from "@/app/actions/rules";
import {
  addStoredRule,
  readStoredRules,
  removeStoredRule,
  reorderStoredRules,
  updateStoredRule,
  type InboxRule,
  type RuleMatchField,
} from "@/lib/inbox/rules-store";

export type ClientRulesResult =
  | { ok: true; rules: InboxRule[] }
  | { ok: false; message: string };

export type ClientRuleEvidenceResult =
  | { ok: true }
  | { ok: false; message: string };

export type SaveRuleForClientInput = {
  id?: string;
  expectedVersion?: number;
  priority?: number;
  enabled: boolean;
  field: RuleMatchField;
  contains: string;
  categoryId?: string;
  category: string;
  merchant?: string;
};

export async function loadRulesForClient(
  isDemo: boolean,
): Promise<ClientRulesResult> {
  if (isDemo) {
    try {
      return { ok: true, rules: readStoredRules() };
    } catch {
      return { ok: false, message: "Không đọc được quy tắc trên thiết bị." };
    }
  }
  return listRulesAction();
}

export async function saveRuleForClient(
  isDemo: boolean,
  input: SaveRuleForClientInput,
): Promise<ClientRulesResult> {
  if (isDemo) {
    try {
      if (input.id) {
        const rules = updateStoredRule({
          id: input.id,
          priority: input.priority,
          enabled: input.enabled,
          stage: "candidate",
          field: input.field,
          contains: input.contains,
          categoryId: input.categoryId,
          category: input.category,
          merchant: input.merchant,
        });
        return { ok: true, rules };
      }
      addStoredRule({
        priority: input.priority,
        enabled: input.enabled,
        stage: "candidate",
        field: input.field,
        contains: input.contains,
        categoryId: input.categoryId,
        category: input.category,
        merchant: input.merchant,
      });
      return { ok: true, rules: readStoredRules() };
    } catch {
      return { ok: false, message: "Không lưu được quy tắc trên thiết bị." };
    }
  }

  if (!input.categoryId) {
    return { ok: false, message: "Hãy chọn danh mục hợp lệ." };
  }
  return saveRuleAction({
    id: input.id,
    expectedVersion: input.expectedVersion,
    stage: "candidate",
    priority: input.priority,
    enabled: input.enabled,
    field: input.field,
    contains: input.contains,
    categoryId: input.categoryId,
    merchant: input.merchant,
  });
}

export async function deleteRuleForClient(
  isDemo: boolean,
  rule: Pick<InboxRule, "id" | "version">,
): Promise<ClientRulesResult> {
  if (isDemo) {
    try {
      return { ok: true, rules: removeStoredRule(rule.id) };
    } catch {
      return { ok: false, message: "Không xóa được quy tắc trên thiết bị." };
    }
  }
  return deleteRuleAction({ id: rule.id, expectedVersion: rule.version });
}

export async function reorderRulesForClient(
  isDemo: boolean,
  orderedIds: string[],
): Promise<ClientRulesResult> {
  if (isDemo) {
    try {
      return { ok: true, rules: reorderStoredRules(orderedIds) };
    } catch {
      return { ok: false, message: "Không đổi được thứ tự quy tắc trên thiết bị." };
    }
  }
  return reorderRulesAction(orderedIds);
}

export async function persistCandidateRuleEvidenceForClient(
  isDemo: boolean,
  input: { candidateId: string; ruleId: string; ruleVersion: number },
): Promise<ClientRuleEvidenceResult> {
  // Demo candidates already carry the pure preview result in local storage.
  if (isDemo) return { ok: true };
  const result = await applyRuleToCandidateAction(input);
  return result.ok ? { ok: true } : result;
}
