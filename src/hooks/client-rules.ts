import {
  applyRuleToCandidateAction,
  deleteRuleAction,
  listRulesAction,
  reorderRulesAction,
  saveRuleAction,
} from "@/app/actions/rules";
import { CANDIDATE_STORAGE_KEY } from "@/lib/inbox/candidate-store";
import {
  addStoredRule,
  readStoredRules,
  removeStoredRule,
  reorderStoredRules,
  updateStoredRule,
  type InboxRule,
  type RuleCategoryKind,
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
  categoryKind: RuleCategoryKind;
  merchant?: string;
};

export type CandidateRuleEvidenceInput = {
  candidateId: string;
  ruleId: string;
  ruleVersion: number;
};

export function attachCandidateRuleEvidence(
  value: unknown,
  input: CandidateRuleEvidenceInput,
): unknown[] | null {
  if (
    !Array.isArray(value) ||
    !input.candidateId ||
    !input.ruleId ||
    !Number.isSafeInteger(input.ruleVersion) ||
    input.ruleVersion < 1
  ) {
    return null;
  }

  let found = false;
  const next = value.map((candidate) => {
    if (!candidate || typeof candidate !== "object") return candidate;
    const record = candidate as Record<string, unknown>;
    if (record.id !== input.candidateId) return candidate;
    found = true;
    return {
      ...record,
      appliedRuleId: input.ruleId,
      appliedRuleVersion: input.ruleVersion,
    };
  });
  return found ? next : null;
}

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
          categoryKind: input.categoryKind,
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
        categoryKind: input.categoryKind,
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
  input: CandidateRuleEvidenceInput,
): Promise<ClientRuleEvidenceResult> {
  if (isDemo) {
    try {
      const stored = localStorage.getItem(CANDIDATE_STORAGE_KEY);
      if (stored === null) {
        return { ok: false, message: "Ứng viên demo không còn tồn tại." };
      }
      const next = attachCandidateRuleEvidence(JSON.parse(stored), input);
      if (!next) {
        return { ok: false, message: "Ứng viên demo không còn tồn tại." };
      }
      localStorage.setItem(CANDIDATE_STORAGE_KEY, JSON.stringify(next));
      return { ok: true };
    } catch {
      return { ok: false, message: "Không lưu được bằng chứng quy tắc demo." };
    }
  }
  const result = await applyRuleToCandidateAction(input);
  return result.ok ? { ok: true } : result;
}
