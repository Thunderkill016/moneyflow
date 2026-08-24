/**
 * PWA Web Share Target payload (TASK-021).
 * Bridged from POST /capture/share → sessionStorage → /capture/share UI.
 * Money stays integer minor units via parse-text / parse-csv.
 */

import type { CreateCandidateInput } from "./candidate-store.ts";
import { previewRuleApplication } from "./apply-rules.ts";
import {
  MAX_UPLOAD_BYTES,
  parseCsvStatement,
  toCsvCandidateInputs,
  validateUploadFile,
  type ParseCsvResult,
} from "./parse-csv.ts";
import {
  parsePasteText,
  toCreateCandidateInputs,
} from "./parse-text.ts";
import type { InboxRule } from "./rules-store.ts";

/** sessionStorage key written by the POST share bridge. */
export const SHARE_PAYLOAD_STORAGE_KEY = "moneyflow-share-payload-v1";

/** Max shared files accepted in one share action. */
export const MAX_SHARE_FILES = 5;

export type SharedFilePayload = {
  name: string;
  type: string;
  /** UTF-8 text content (CSV / plain). Binary not supported. */
  text: string;
  size: number;
};

export type SharePayload = {
  title: string;
  text: string;
  url: string;
  files: SharedFilePayload[];
};

export type ShareCsvPlan = {
  fileName: string;
  parse: ParseCsvResult;
};

export type SharePlan = {
  ok: boolean;
  /** Combined title/text/url for display. */
  combinedText: string;
  pasteCandidates: CreateCandidateInput[];
  csvPlans: ShareCsvPlan[];
  /** Total candidates that would be written (paste + all CSV rows). */
  candidateCount: number;
  errors: string[];
  /** Non-fatal notes (skipped xlsx, empty file, …). */
  warnings: string[];
};

/** Exact rule revision selected for one Share candidate; server applies it atomically. */
export type ShareCandidateRuleEvidence = {
  ruleId: string;
  ruleVersion: number;
};

export type ShareRuleEvidencePlan = {
  pasteCandidates: Array<ShareCandidateRuleEvidence | null>;
  csvPlans: Array<Array<ShareCandidateRuleEvidence | null>>;
};

export function emptySharePayload(): SharePayload {
  return { title: "", text: "", url: "", files: [] };
}

export function isSharePayload(value: unknown): value is SharePayload {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<SharePayload>;
  if (typeof p.title !== "string") return false;
  if (typeof p.text !== "string") return false;
  if (typeof p.url !== "string") return false;
  if (!Array.isArray(p.files)) return false;
  return p.files.every(isSharedFilePayload);
}

function isSharedFilePayload(value: unknown): value is SharedFilePayload {
  if (!value || typeof value !== "object") return false;
  const f = value as Partial<SharedFilePayload>;
  return (
    typeof f.name === "string" &&
    typeof f.type === "string" &&
    typeof f.text === "string" &&
    typeof f.size === "number" &&
    Number.isFinite(f.size) &&
    f.size >= 0
  );
}

/** Combine share title / text / url into one paste block. */
export function combineShareText(payload: SharePayload): string {
  const parts: string[] = [];
  const title = payload.title.trim();
  const text = payload.text.trim();
  const url = payload.url.trim();
  if (title) parts.push(title);
  if (text) parts.push(text);
  // Avoid duplicating URL if already present in text/title
  if (url && !text.includes(url) && !title.includes(url)) {
    parts.push(url);
  }
  return parts.join("\n").trim();
}

export function hasShareContent(payload: SharePayload): boolean {
  if (combineShareText(payload).length > 0) return true;
  return payload.files.some((f) => f.name || f.text);
}

/**
 * Classify a shared file for parse routing.
 * CSV → statement parser; plain text → paste parser; xlsx flagged separately.
 */
export function classifySharedFile(
  name: string,
  type: string,
): "csv" | "xlsx" | "pdf" | "text" | "unsupported" {
  const check = validateUploadFile({
    name: name || "shared.txt",
    size: 1,
    type,
  });
  if (check.ok && check.kind === "csv") return "csv";
  if (check.ok && check.kind === "xlsx") return "xlsx";
  if (check.ok && check.kind === "pdf") return "pdf";

  const lower = (name || "").toLowerCase();
  const mime = (type || "").toLowerCase();
  if (
    lower.endsWith(".txt") ||
    lower.endsWith(".text") ||
    lower.endsWith(".tsv") ||
    mime.startsWith("text/") ||
    mime === "application/json"
  ) {
    return "text";
  }
  return "unsupported";
}

/**
 * Pure plan: parse shared text + files into candidate drafts (no localStorage).
 * Callers commit to inbox / import stores on the client.
 */
export function planShareImport(payload: SharePayload): SharePlan {
  const errors: string[] = [];
  const warnings: string[] = [];
  const pasteCandidates: CreateCandidateInput[] = [];
  const csvPlans: ShareCsvPlan[] = [];

  const combinedText = combineShareText(payload);

  if (combinedText) {
    const parsed = parsePasteText(combinedText, { sourceHint: "auto" });
    if (parsed.ok && parsed.candidates.length > 0) {
      pasteCandidates.push(...toCreateCandidateInputs(parsed.candidates));
    } else if (payload.files.length === 0) {
      errors.push(
        parsed.error ??
          "Không tìm thấy số tiền trong nội dung chia sẻ. Thử “cafe 45k” hoặc tin nhắn biến động.",
      );
    } else {
      warnings.push(
        parsed.error ??
          "Text chia sẻ không có số tiền — vẫn xử lý file đính kèm.",
      );
    }
  }

  const files = payload.files.slice(0, MAX_SHARE_FILES);
  if (payload.files.length > MAX_SHARE_FILES) {
    warnings.push(
      `Chỉ nhận tối đa ${MAX_SHARE_FILES} file mỗi lần — đã bỏ bớt phần dư.`,
    );
  }

  for (const file of files) {
    const size = file.size || file.text.length;
    if (size > MAX_UPLOAD_BYTES) {
      errors.push(
        `“${file.name || "file"}” quá lớn (tối đa 10MB).`,
      );
      continue;
    }
    if (!file.text.trim()) {
      warnings.push(`“${file.name || "file"}” trống — bỏ qua.`);
      continue;
    }

    const kind = classifySharedFile(file.name, file.type);
    if (kind === "xlsx") {
      // Share bridge only carries UTF-8 text; binary XLSX needs Capture → Upload.
      errors.push(
        `“${file.name}”: Share chưa nhận file Excel nhị phân — mở Capture → Upload để parse sheet đầu (.xlsx/.xls).`,
      );
      continue;
    }
    if (kind === "pdf") {
      errors.push(
        `“${file.name}”: Share chưa nhận PDF nhị phân — mở Capture → Upload để parse PDF text-layer (MF DEMO BANK).`,
      );
      continue;
    }
    if (kind === "unsupported") {
      errors.push(
        `“${file.name || "file"}”: định dạng không hỗ trợ. Chia sẻ CSV hoặc text.`,
      );
      continue;
    }

    if (kind === "csv") {
      const parse = parseCsvStatement(file.text, {
        fileName: file.name || "share.csv",
      });
      if (!parse.ok || parse.rows.length === 0) {
        errors.push(
          parse.error ??
            `Không phân tích được CSV “${file.name || "share.csv"}”.`,
        );
        continue;
      }
      csvPlans.push({ fileName: parse.fileName, parse });
      continue;
    }

    // Plain text file → paste parser
    const parsed = parsePasteText(file.text, { sourceHint: "auto" });
    if (parsed.ok && parsed.candidates.length > 0) {
      pasteCandidates.push(...toCreateCandidateInputs(parsed.candidates));
    } else {
      errors.push(
        parsed.error ??
          `Không trích được giao dịch từ “${file.name || "file"}”.`,
      );
    }
  }

  const csvRowCount = csvPlans.reduce((n, p) => n + p.parse.rows.length, 0);
  const candidateCount = pasteCandidates.length + csvRowCount;
  const ok = candidateCount > 0;

  if (!ok && errors.length === 0 && !hasShareContent(payload)) {
    errors.push("Không có nội dung chia sẻ. Hãy Share text hoặc CSV vào Money Flow.");
  } else if (!ok && errors.length === 0) {
    errors.push("Không tạo được ứng viên từ nội dung chia sẻ.");
  }

  return {
    ok,
    combinedText,
    pasteCandidates,
    csvPlans,
    candidateCount,
    errors,
    warnings,
  };
}

function ruleEvidenceForShareCandidate(
  candidate: Pick<
    CreateCandidateInput,
    "kind" | "merchant" | "note" | "rawSnippet" | "categoryId" | "category"
  >,
  rules: InboxRule[],
): ShareCandidateRuleEvidence | null {
  const preview = previewRuleApplication(
    { ...candidate, note: candidate.note ?? "" },
    rules,
  );
  if (!preview.match) return null;
  return { ruleId: preview.match.id, ruleVersion: preview.match.version };
}

/**
 * Select only exact rule identifiers for the Share persistence boundary.
 * The server remains responsible for applying and re-validating the rule inside
 * the atomic Share transaction, so this never mutates raw candidate data.
 */
export function planShareRuleEvidence(
  plan: SharePlan,
  rules: InboxRule[],
): ShareRuleEvidencePlan {
  return {
    pasteCandidates: plan.pasteCandidates.map((candidate) =>
      ruleEvidenceForShareCandidate(candidate, rules),
    ),
    csvPlans: plan.csvPlans.map((csvPlan) =>
      csvPlan.parse.rows.map((candidate) =>
        ruleEvidenceForShareCandidate(candidate, rules),
      ),
    ),
  };
}

/**
 * Build CSV store inputs for one planned file (needs batch id from import store).
 */
export function csvPlanToCandidates(
  plan: ShareCsvPlan,
  importBatchId: string,
): CreateCandidateInput[] {
  return toCsvCandidateInputs(plan.parse.rows, importBatchId);
}

/** Read + clear share payload from sessionStorage (browser only). */
export function consumeSharePayloadFromSession(): SharePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SHARE_PAYLOAD_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(SHARE_PAYLOAD_STORAGE_KEY);
    const parsed: unknown = JSON.parse(raw);
    if (!isSharePayload(parsed)) return null;
    return parsed;
  } catch {
    try {
      sessionStorage.removeItem(SHARE_PAYLOAD_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

/** Build payload from GET query (?title=&text=&url=) for manual/test opens. */
export function sharePayloadFromSearchParams(
  params: URLSearchParams | { get(name: string): string | null },
): SharePayload {
  return {
    title: (params.get("title") ?? "").trim(),
    text: (params.get("text") ?? "").trim(),
    url: (params.get("url") ?? "").trim(),
    files: [],
  };
}
