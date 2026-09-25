/**
 * R9 — the pure pieces of the Backup & Restore surface.
 *
 * Filename, safe summary and message mapping live here so they can be tested
 * without a browser. Nothing in this module touches Supabase, React or the DOM.
 * Validation still belongs to R8/R5 — `verifyArchiveBytes` below only composes
 * the proven ingress boundary with the summary, it re-implements none of it.
 */

import {
  ALL_ARCHIVE_COLLECTIONS,
  type MoneyFlowArchive,
} from "./moneyflow-archive.ts";
import type { ArchiveIngressRejectionCode } from "./archive-ingress.ts";
import { ingestArchiveBytes } from "./goal-linkage-archive-ingress.ts";

/**
 * A human-recognisable, private-by-default backup filename.
 *
 * Deliberately carries no account identity — no email, no user id, no display
 * name — because a backup lands in a downloads folder, a chat attachment or a
 * cloud sync, and the filename is the part everyone sees. The date is enough to
 * tell two backups apart.
 */
export function backupFileName(producedAt: string): string {
  const day = /^(\d{4}-\d{2}-\d{2})/u.exec(producedAt)?.[1] ?? "unknown";
  return `moneyflow-ban-sao-luu-${day}.json`;
}

/**
 * Encrypted backups stay `.json` — the envelope is itself a JSON document —
 * but the name must disclose the encryption, or someone picks the file for a
 * plain inspection and concludes the backup is corrupt.
 */
export function encryptedBackupFileName(producedAt: string): string {
  const day = /^(\d{4}-\d{2}-\d{2})/u.exec(producedAt)?.[1] ?? "unknown";
  return `moneyflow-ban-sao-luu-ma-hoa-${day}.json`;
}

/** Serialize for download without altering the archive in any way. */
export function serializeArchive(archive: MoneyFlowArchive): string {
  return JSON.stringify(archive);
}

export type ArchiveSummary = {
  readonly producedAt: string;
  readonly archiveVersion: number;
  readonly accounts: number;
  readonly categories: number;
  readonly transactions: number;
  readonly budgets: number;
  readonly goals: number;
  readonly inboxCandidates: number;
};

/**
 * Aggregate counts for the confirmation step.
 *
 * Counts only. A confirmation screen exists to prove the file is the right one,
 * which row totals do — showing merchant names, notes or imported snippets to
 * prove the file was read would put a stranger's financial history on screen
 * when the wrong file is picked.
 */
export function summarizeArchive(archive: MoneyFlowArchive): ArchiveSummary {
  const counts = archive.tenant_row_counts;
  const value = (key: string) => {
    const count = counts[key];
    return typeof count === "number" && Number.isFinite(count) ? count : 0;
  };
  return {
    producedAt: archive.produced_at,
    archiveVersion: archive.archive_version,
    accounts: value("accounts"),
    categories: value("categories"),
    transactions: value("transactions"),
    budgets: value("monthlyBudgets"),
    goals: value("savingsGoals"),
    inboxCandidates: value("inboxCandidates"),
  };
}

export type ArchiveCollectionCount = {
  /** Collection key inside the archive payload, e.g. `transactions`. */
  readonly collection: string;
  readonly count: number;
};

/**
 * What a standalone file check may claim.
 *
 * `ok: true` means the bytes crossed the whole trusted boundary — byte bound,
 * strict UTF-8, duplicate-member scan, JSON syntax and the archive contract —
 * and nothing more. It is evidence the file is a structurally valid MoneyFlow
 * backup, never evidence it would restore: restore still depends on the
 * server-side validator, the target account being empty and the transport
 * limit, none of which a file inspection can prove. Only an actual restore
 * proves restorability, so this type carries no eligibility field on purpose.
 */
export type ArchiveVerificationReport = {
  readonly producedAt: string;
  readonly archiveVersion: number;
  readonly schemaGeneration: string;
  /** Every contract collection, in inventory order, with its row count. */
  readonly collections: readonly ArchiveCollectionCount[];
  readonly totalRows: number;
  readonly bytes: number;
};

export type ArchiveVerification =
  | { readonly ok: true; readonly report: ArchiveVerificationReport }
  | { readonly ok: false; readonly code: ArchiveIngressRejectionCode };

/**
 * Check an untrusted backup file end to end without touching the database.
 *
 * Same ingress the restore picker uses, then the same summary — the only
 * difference is what the caller is allowed to conclude. The validator has
 * already proven `tenant_row_counts` complete and consistent with `tables`,
 * so the report reads it rather than re-walking the payload.
 */
export function verifyArchiveBytes(bytes: Uint8Array): ArchiveVerification {
  const result = ingestArchiveBytes(bytes);
  if (!result.ok) return { ok: false, code: result.code };
  const summary = summarizeArchive(result.archive);
  const collections = ALL_ARCHIVE_COLLECTIONS.map((collection) => ({
    collection,
    count: result.archive.tenant_row_counts[collection] ?? 0,
  }));
  let totalRows = 0;
  for (const entry of collections) totalRows += entry.count;
  return {
    ok: true,
    report: {
      producedAt: summary.producedAt,
      archiveVersion: summary.archiveVersion,
      schemaGeneration: result.archive.schema_generation,
      collections,
      totalRows,
      bytes: result.bytes,
    },
  };
}

/**
 * Vietnamese label for an archive collection, used by the verify report.
 * Falls back to the raw key so an unrecognized collection is shown as the
 * file's own vocabulary rather than dressed up in an invented label.
 */
export function describeArchiveCollection(collection: string): string {
  switch (collection) {
    case "profile":
      return "Hồ sơ";
    case "categories":
      return "Danh mục";
    case "accounts":
      return "Tài khoản tiền";
    case "importBatches":
      return "Lượt import sao kê";
    case "savingsGoals":
      return "Mục tiêu";
    case "recurringIncomeTemplates":
      return "Khoản thu định kỳ";
    case "recurringCommitments":
      return "Khoản định kỳ";
    case "monthlyBudgets":
      return "Ngân sách";
    case "inboxRules":
      return "Quy tắc Inbox";
    case "accountReconciliations":
      return "Kỳ đối chiếu sao kê";
    case "transactions":
      return "Giao dịch";
    case "inboxCandidates":
      return "Mục chờ trong Inbox";
    case "savingsGoalAllocations":
      return "Lần góp vào mục tiêu";
    case "incomeTemplateOccurrences":
      return "Lần thu định kỳ đã ghi";
    case "commitmentOccurrences":
      return "Lần chi định kỳ đã ghi";
    case "transactionImportProvenance":
      return "Nguồn gốc giao dịch import";
    case "transactionEntries":
      return "Bút toán chi tiết";
    case "accountReconciliationEvents":
      return "Sự kiện đối chiếu";
    case "auditHistory":
      return "Lịch sử thay đổi";
    default:
      return collection;
  }
}

/** Vietnamese message for a file that never reached the database. */
export function describeIngressRejection(code: ArchiveIngressRejectionCode): string {
  switch (code) {
    case "file_empty":
      return "Tệp trống. Hãy chọn tệp bản sao lưu MoneyFlow bạn đã tải về.";
    case "file_too_large":
      return "Tệp quá lớn so với giới hạn bản sao lưu MoneyFlow.";
    case "invalid_utf8":
      return "Tệp không phải văn bản UTF-8 hợp lệ nên không thể đọc an toàn.";
    case "invalid_json_syntax":
      return "Tệp không phải JSON hợp lệ. Có thể tệp đã hỏng hoặc bị sửa.";
    case "duplicate_member_name":
      return "Tệp chứa trường bị lặp nên không đáng tin. MoneyFlow đã từ chối để bảo vệ dữ liệu.";
    case "max_depth_exceeded":
      return "Cấu trúc tệp lồng nhau quá sâu so với bản sao lưu MoneyFlow hợp lệ.";
    case "too_many_object_members":
      return "Tệp chứa một khối dữ liệu lớn bất thường nên đã bị từ chối.";
    case "archive_invalid":
      return "Đây không phải bản sao lưu MoneyFlow hợp lệ. Không có dữ liệu nào bị thay đổi.";
  }
}

/**
 * The largest archive this application's transport can carry.
 *
 * Not a parser limit — R8 reads up to 64 MiB. Server action requests are capped
 * at 1 MB by default and the hosting platform caps serverless request bodies at
 * roughly 4.5 MB, so 4 MiB is as much as the sanctioned path will actually move.
 * At ~786 bytes per transaction that is about 5,000 transactions. The UI refuses
 * a bigger file up front rather than letting the platform fail the upload with
 * an opaque error.
 */
export const ARCHIVE_MAX_RESTORE_BYTES = 4 * 1024 * 1024;

export type RestoreFailureKind =
  | "capability_missing"
  | "not_authenticated"
  | "target_not_empty"
  | "already_restored"
  | "id_conflict"
  | "archive_rejected"
  | "unexpected";

/**
 * Classify a database rejection.
 *
 * The raw message never reaches the user: it is a database error string, and the
 * one thing a user can act on is *which* of these situations they are in.
 */
export function classifyRestoreFailure(input: {
  code?: string | null;
  message?: string | null;
}): RestoreFailureKind {
  const message = input.message ?? "";
  // PostgREST reports an absent function as PGRST202 — the backend migration is
  // not applied yet, which is a deployment state, not a user mistake.
  if (input.code === "PGRST202" || /could not find the function/iu.test(message)) {
    return "capability_missing";
  }
  if (message.includes("authentication_required")) return "not_authenticated";
  if (message.includes("restore_target_not_empty")) return "target_not_empty";
  if (message.includes("archive_already_restored")) return "already_restored";
  if (message.includes("restore_archive_id_conflict")) return "id_conflict";
  if (message.includes("archive_profile_missing")) return "unexpected";
  // Everything the database validator raises before it writes anything.
  if (
    /(archive|row|collection|profile|tables)_|_(invalid|unsupported|malformed|mismatch|not_found)\b|money_out_of_safe_range|duplicate_row_id|entry_amount_zero|allocated_exceeds_target/u.test(
      message,
    )
  ) {
    return "archive_rejected";
  }
  return "unexpected";
}

export function describeRestoreFailure(kind: RestoreFailureKind): string {
  switch (kind) {
    case "capability_missing":
      return "Chức năng khôi phục chưa sẵn sàng trên máy chủ. Không có dữ liệu nào bị thay đổi.";
    case "not_authenticated":
      return "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi thử khôi phục.";
    case "target_not_empty":
      return "Tài khoản này đã có dữ liệu nên không thể khôi phục. Khôi phục chỉ dành cho tài khoản mới, chưa dùng. Không có dữ liệu nào bị thay đổi.";
    case "already_restored":
      return "Bản sao lưu này đã được khôi phục vào tài khoản hiện tại. Không có gì được khôi phục thêm.";
    case "id_conflict":
      return "Dữ liệu của bản sao lưu này vẫn còn tồn tại ở nơi khác. Hãy khôi phục vào một tài khoản mới. Không có dữ liệu nào bị thay đổi.";
    case "archive_rejected":
      return "Máy chủ từ chối bản sao lưu này vì nội dung không hợp lệ. Không có dữ liệu nào bị thay đổi.";
    case "unexpected":
      return "Khôi phục không thành công. Toàn bộ thao tác đã được hoàn tác nên dữ liệu hiện tại giữ nguyên.";
  }
}

/** Vietnamese message for a backup that could not be produced. */
export function describeTransportLimit(): string {
  return "Bản sao lưu này lớn hơn giới hạn tải lên hiện tại của MoneyFlow nên chưa thể khôi phục qua trình duyệt. Không có dữ liệu nào bị thay đổi.";
}

export function describeBackupFailure(kind: RestoreFailureKind): string {
  switch (kind) {
    case "capability_missing":
      return "Chức năng sao lưu chưa sẵn sàng trên máy chủ. Hãy thử lại sau.";
    case "not_authenticated":
      return "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi tạo bản sao lưu.";
    default:
      return "Không tạo được bản sao lưu. Chưa có tệp nào được tải về.";
  }
}
