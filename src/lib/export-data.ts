/**
 * Client-side data export (wireframes-inbox §19).
 * Money stays integer VND đồng. Reuses reports CSV escape.
 */

import type { InboxCandidate } from "./inbox/candidate-store.ts";
import { CONFIDENCE_LABELS, SOURCE_LABELS } from "./inbox/candidate-store.ts";
import { rowsToCsv, transactionsToCsv } from "./reports.ts";
import type { Transaction } from "./sample-data.ts";

/**
 * Discoverability (TASK-109): one-click path from Insights → export hub.
 * Reports may also trigger period download via `/reports/export`.
 */
export const EXPORT_CSV_LABEL = "Xuất CSV" as const;
/** Settings export page — date range, kinds, formula-safe CSV/JSON. */
export const EXPORT_SETTINGS_HREF = "/settings/export" as const;

/** Period report CSV download (server route; integer money + formula escape). */
/**
 * CSV link for the window currently on screen.
 *
 * `custom` carries `from`/`to` so the download matches what the reader is looking
 * at. Without them the link would silently fall back to the month preset — the
 * export and the page would disagree, and the file name would look right anyway.
 */
export function reportCsvDownloadHref(
  period: string = "month",
  from?: string | null,
  to?: string | null,
): string {
  if (period === "custom" && from && to) {
    const params = new URLSearchParams({ period: "custom", from, to });
    return `/reports/export?${params.toString()}`;
  }
  const safe =
    period === "week" || period === "year" || period === "month" ? period : "month";
  return `/reports/export?period=${safe}`;
}

export type ExportDataKind = "transactions" | "candidates" | "all";
export type ExportFormat = "csv" | "json";

export type ExportDateRange = {
  /** Inclusive YYYY-MM-DD; empty = no lower bound. */
  from: string;
  /** Inclusive YYYY-MM-DD; empty = no upper bound. */
  to: string;
};

export type ExportBundle = {
  exportedAt: string;
  range: ExportDateRange;
  transactions: Transaction[];
  candidates: InboxCandidate[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isExportDataKind(value: unknown): value is ExportDataKind {
  return value === "transactions" || value === "candidates" || value === "all";
}

export function isExportFormat(value: unknown): value is ExportFormat {
  return value === "csv" || value === "json";
}

export function normalizeExportDate(value: string): string {
  const trimmed = value.trim();
  return DATE_RE.test(trimmed) ? trimmed : "";
}

/** Keep rows whose occurredOn is within optional inclusive range. */
export function filterByOccurredOnRange<T extends { occurredOn: string }>(
  items: T[],
  range: ExportDateRange,
): T[] {
  const from = normalizeExportDate(range.from);
  const to = normalizeExportDate(range.to);
  return items.filter((item) => {
    if (!DATE_RE.test(item.occurredOn)) return false;
    if (from && item.occurredOn < from) return false;
    if (to && item.occurredOn > to) return false;
    return true;
  });
}

function kindLabel(kind: InboxCandidate["kind"] | Transaction["kind"]): string {
  if (kind === "income") return "Thu nhập";
  if (kind === "expense") return "Chi tiêu";
  return "Chuyển tiền";
}

function statusLabel(status: InboxCandidate["status"]): string {
  if (status === "pending") return "Chờ duyệt";
  if (status === "approved") return "Đã duyệt";
  return "Từ chối";
}

/** Signed integer amount for CSV (expense negative). */
export function signedExportAmount(
  kind: "expense" | "income" | "transfer",
  amount: number,
): number {
  return kind === "expense" ? -amount : amount;
}

export function candidatesToCsv(candidates: InboxCandidate[]): string {
  const header = [
    "Ngày",
    "Loại",
    "Merchant",
    "Ghi chú",
    "Danh mục",
    "Tài khoản",
    "Số tiền (VND)",
    "Nguồn",
    "Độ tin",
    "Trạng thái",
    "ID",
  ];
  const rows = candidates.map((item) => [
    item.occurredOn,
    kindLabel(item.kind),
    item.merchant,
    item.note,
    item.category ?? "",
    item.account ?? "",
    signedExportAmount(item.kind, item.amount),
    SOURCE_LABELS[item.source] ?? item.source,
    CONFIDENCE_LABELS[item.confidence] ?? item.confidence,
    statusLabel(item.status),
    item.id,
  ]);
  return rowsToCsv(header, rows);
}

export function buildExportBundle(input: {
  transactions: Transaction[];
  candidates: InboxCandidate[];
  range: ExportDateRange;
  now?: Date;
}): ExportBundle {
  const range = {
    from: normalizeExportDate(input.range.from),
    to: normalizeExportDate(input.range.to),
  };
  return {
    exportedAt: (input.now ?? new Date()).toISOString(),
    range,
    transactions: filterByOccurredOnRange(input.transactions, range),
    candidates: filterByOccurredOnRange(input.candidates, range),
  };
}

/**
 * Resolve export body for the selected kind/format.
 * `all` always yields JSON (wireframes “Toàn bộ JSON”).
 */
export function buildExportContent(input: {
  kind: ExportDataKind;
  format: ExportFormat;
  transactions: Transaction[];
  candidates: InboxCandidate[];
  range: ExportDateRange;
  now?: Date;
}): { body: string; mime: string; extension: "csv" | "json"; count: number } {
  const bundle = buildExportBundle(input);
  const effectiveFormat: ExportFormat =
    input.kind === "all" ? "json" : input.format;

  if (input.kind === "all" || effectiveFormat === "json") {
    let payload: unknown;
    if (input.kind === "transactions") {
      payload = {
        exportedAt: bundle.exportedAt,
        range: bundle.range,
        transactions: bundle.transactions,
      };
    } else if (input.kind === "candidates") {
      payload = {
        exportedAt: bundle.exportedAt,
        range: bundle.range,
        candidates: bundle.candidates,
      };
    } else {
      payload = bundle;
    }
    const list =
      input.kind === "transactions"
        ? bundle.transactions
        : input.kind === "candidates"
          ? bundle.candidates
          : [...bundle.transactions, ...bundle.candidates];
    return {
      body: `${JSON.stringify(payload, null, 2)}\n`,
      mime: "application/json;charset=utf-8",
      extension: "json",
      count: list.length,
    };
  }

  if (input.kind === "candidates") {
    return {
      body: candidatesToCsv(bundle.candidates),
      mime: "text/csv;charset=utf-8",
      extension: "csv",
      count: bundle.candidates.length,
    };
  }

  return {
    body: transactionsToCsv(bundle.transactions),
    mime: "text/csv;charset=utf-8",
    extension: "csv",
    count: bundle.transactions.length,
  };
}

export function exportFilename(
  kind: ExportDataKind,
  extension: "csv" | "json",
  range: ExportDateRange,
  now: Date = new Date(),
): string {
  const stamp = now.toISOString().slice(0, 10);
  const from = normalizeExportDate(range.from);
  const to = normalizeExportDate(range.to);
  const rangePart = from || to ? `-${from || "start"}-${to || "end"}` : "";
  const kindPart =
    kind === "transactions"
      ? "giao-dich"
      : kind === "candidates"
        ? "ung-vien"
        : "toan-bo";
  return `moneyflow-${kindPart}${rangePart}-${stamp}.${extension}`;
}

/** Trigger a browser download for a text body. */
export function downloadTextFile(filename: string, body: string, mime: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export const EXPORT_KIND_OPTIONS: {
  value: ExportDataKind;
  label: string;
  description: string;
}[] = [
  {
    value: "transactions",
    label: "Sổ thu chi",
    description: "Giao dịch đã ghi — mang đi dưới dạng CSV hoặc JSON.",
  },
  {
    value: "candidates",
    label: "Ứng viên (Nâng cao)",
    description:
      "Tùy chọn: ứng viên local trên thiết bị (không bắt buộc cho ghi tay).",
  },
  {
    value: "all",
    label: "Toàn bộ JSON",
    description: "Gộp sổ thu chi + ứng viên (Nâng cao) thành một file JSON.",
  },
];
