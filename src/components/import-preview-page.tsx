"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import {
  addCandidatesForClient,
  getPendingCountForClient,
  loadImportBatchesForClient,
  markBatchCancelledForClient,
  markBatchCommittedForClient,
} from "@/hooks/client-inbox";
import {
  getStoredImportBatch,
  importBatchStatusLabel,
  type ImportBatch,
} from "@/lib/inbox/import-batch-store";
import {
  columnHeaderLabel,
  formatImportPreviewSummary,
  previewDraftRows,
  readImportDraft,
  removeImportDraft,
} from "@/lib/inbox/import-draft-store";
import {
  toCsvCandidateInputs,
  type ParsedCsvRow,
} from "@/lib/inbox/parse-csv";
import { formatMoney } from "@/lib/money";
import { trackProductEvent } from "@/lib/safe-analytics";

const PREVIEW_LIMIT = 10;

type LoadState =
  | { phase: "loading" }
  | { phase: "empty" }
  | { phase: "error"; message: string }
  | {
      phase: "ready";
      batch: ImportBatch;
      rows: ParsedCsvRow[];
    }
  | {
      phase: "done";
      batch: ImportBatch;
      kind: "committed" | "cancelled";
    };

function moneySign(kind: ParsedCsvRow["kind"]): string {
  if (kind === "income") return "+";
  if (kind === "transfer") return "↔ ";
  return "−";
}

function moneyClass(kind: ParsedCsvRow["kind"]): string {
  if (kind === "income") return "positive";
  if (kind === "transfer") return "transfer";
  return "negative";
}

function amountColumnLabel(batch: ImportBatch): string {
  const { columnMap, headers } = batch;
  if (columnMap.amount !== null) {
    return columnHeaderLabel(headers, columnMap.amount);
  }
  const debit = columnHeaderLabel(headers, columnMap.debit);
  const credit = columnHeaderLabel(headers, columnMap.credit);
  if (columnMap.debit !== null && columnMap.credit !== null) {
    return `${debit} / ${credit}`;
  }
  if (columnMap.debit !== null) return debit;
  if (columnMap.credit !== null) return credit;
  return "—";
}

export function ImportPreviewPage({
  viewer,
  batchId,
}: {
  viewer: ViewerSummary;
  batchId: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [inboxCount, setInboxCount] = useState(0);
  const [notice, setNotice] = useState("");
  const [committing, setCommitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState("");

  const reload = useCallback(async () => {
    setActionError("");
    try {
      let batch: ImportBatch | null = null;
      if (viewer.isDemo) {
        batch = getStoredImportBatch(batchId);
      } else {
        const listed = await loadImportBatchesForClient(false);
        if (!listed.ok) {
          setState({ phase: "error", message: listed.message });
          return;
        }
        batch = listed.batches.find((item) => item.id === batchId) ?? null;
        // Fresh upload may still only be in local until first list; fall back.
        if (!batch) batch = getStoredImportBatch(batchId);
      }

      if (!batch) {
        setState({ phase: "empty" });
        return;
      }

      if (batch.status === "committed") {
        setState({ phase: "done", batch, kind: "committed" });
        return;
      }
      if (batch.status === "cancelled") {
        setState({ phase: "done", batch, kind: "cancelled" });
        return;
      }

      const draft = readImportDraft(batchId);
      if (!draft || draft.rows.length === 0) {
        setState({
          phase: "error",
          message:
            "Không còn dữ liệu preview cho lô này. Tải lại file CSV/Excel từ Capture → Upload.",
        });
        return;
      }

      setState({ phase: "ready", batch, rows: draft.rows });
    } catch {
      setState({
        phase: "error",
        message: "Không đọc được lô import trên máy này.",
      });
    }
  }, [batchId, viewer.isDemo]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const count = await getPendingCountForClient(viewer.isDemo);
      if (!cancelled) setInboxCount(count);
      await reload();
    })();
    return () => {
      cancelled = true;
    };
  }, [reload, viewer.isDemo]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const previewRows = useMemo(() => {
    if (state.phase !== "ready") return [];
    return previewDraftRows(state.rows, PREVIEW_LIMIT);
  }, [state]);

  const summary =
    state.phase === "ready"
      ? formatImportPreviewSummary({
          rowCount: state.batch.rowCount,
          warningCount: state.batch.warningCount,
          skippedRows: state.batch.skippedRows,
        })
      : "";

  const mapPct =
    state.phase === "ready" || state.phase === "done"
      ? Math.round(state.batch.mapConfidence * 100)
      : 0;

  async function commitToInbox() {
    if (state.phase !== "ready" || committing || cancelling) return;
    setCommitting(true);
    setActionError("");
    try {
      const source =
        state.batch.source === "xlsx"
          ? ("xlsx" as const)
          : state.batch.source === "pdf"
            ? ("pdf" as const)
            : ("csv" as const);
      const inputs = toCsvCandidateInputs(
        state.rows,
        state.batch.id,
        source,
      );
      const addResult = await addCandidatesForClient(viewer.isDemo, inputs);
      if (!addResult.ok) {
        setActionError(addResult.message);
        setCommitting(false);
        return;
      }
      const markResult = await markBatchCommittedForClient(
        viewer.isDemo,
        state.batch.id,
      );
      if (!markResult.ok) {
        setActionError(markResult.message);
        setCommitting(false);
        return;
      }
      removeImportDraft(state.batch.id);

      // Counts + source enum only — never fileName / row bodies / raw_snippet.
      trackProductEvent("import_batch_committed", {
        candidate_count: inputs.length,
        row_count: state.batch.rowCount,
        source_type: source,
        warning_count: state.batch.warningCount,
        skipped_rows: state.batch.skippedRows,
        map_confidence: state.batch.mapConfidence,
      });

      const pending = await getPendingCountForClient(viewer.isDemo);
      setInboxCount(pending);
      setNotice(
        `Đã đưa ${inputs.length} mục từ ${state.batch.fileName} vào Inbox — chưa ghi sổ.`,
      );
      router.push("/inbox");
    } catch {
      setActionError("Không lưu được vào Inbox. Thử lại.");
      setCommitting(false);
    }
  }

  async function cancelImport() {
    if (state.phase !== "ready" || committing || cancelling) return;
    setCancelling(true);
    setActionError("");
    try {
      const markResult = await markBatchCancelledForClient(
        viewer.isDemo,
        state.batch.id,
      );
      if (!markResult.ok) {
        setActionError(markResult.message);
        setCancelling(false);
        return;
      }
      removeImportDraft(state.batch.id);
      trackProductEvent("import_batch_cancelled", {
        row_count: state.batch.rowCount,
        source_type:
          state.batch.source === "xlsx"
            ? "xlsx"
            : state.batch.source === "pdf"
              ? "pdf"
              : "csv",
      });
      setNotice(`Đã hủy import ${state.batch.fileName}.`);
      router.push("/capture/upload");
    } catch {
      setActionError("Không hủy được lô import. Thử lại.");
      setCancelling(false);
    }
  }

  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
      primaryAction={{
        label: "Inbox",
        href: "/inbox",
        icon: "inbox",
      }}
      notice={notice}
    >
      <main className="dashboard import-preview-workspace">
        <section className="transactions-title-row capture-title-row">
          <div>
            <p className="eyebrow">
              <Link className="capture-paste-back" href="/capture/upload">
                ← Upload
              </Link>
            </p>
            <h1>
              Import
              {(state.phase === "ready" || state.phase === "done") && (
                <>
                  {" · "}
                  <span className="font-mono import-preview-filename">
                    {state.batch.fileName}
                  </span>
                </>
              )}
            </h1>
            <p>
              Cổng chất lượng — xem map cột và preview trước khi đưa hàng loạt
              vào Inbox. Không ghi thẳng vào sổ.
            </p>
          </div>
          <div className="page-heading-actions">
            <Link className="secondary-button" href="/inbox">
              <Icon name="inbox" />
              Về Inbox
            </Link>
          </div>
        </section>

        {state.phase === "loading" && (
          <section
            className="panel import-preview-panel"
            aria-busy="true"
            aria-label="Đang tải preview import"
          >
            <div className="import-preview-skeleton">
              <div className="loading-line wide" />
              <div className="loading-line" />
              <div className="loading-line short" />
              <div className="loading-line import-preview-skel-table" />
            </div>
          </section>
        )}

        {state.phase === "empty" && (
          <section className="panel import-preview-panel import-preview-empty">
            <h2>Không tìm thấy lô import</h2>
            <p>
              Lô <span className="font-mono">{batchId}</span> không có trên máy
              này (đã xóa hoặc mở trên trình duyệt khác).
            </p>
            <div className="capture-paste-actions">
              <Link className="primary-button" href="/capture/upload">
                Tải sao kê mới
              </Link>
              <Link className="secondary-button" href="/inbox">
                Về Inbox
              </Link>
            </div>
          </section>
        )}

        {state.phase === "error" && (
          <section
            className="panel import-preview-panel"
            role="alert"
          >
            <h2>Không mở được preview</h2>
            <p className="capture-paste-error">{state.message}</p>
            <div className="capture-paste-actions">
              <Link className="primary-button" href="/capture/upload">
                Tải lại file
              </Link>
              <button
                type="button"
                className="secondary-button"
                onClick={reload}
              >
                Thử lại
              </button>
            </div>
          </section>
        )}

        {state.phase === "done" && (
          <section className="panel import-preview-panel">
            <div className="import-preview-status-row">
              <span className="import-preview-status-label">Trạng thái</span>
              <span
                className={`preview-chip sm ${state.kind === "committed" ? "ok" : "warning"}`}
              >
                {importBatchStatusLabel(state.batch.status)}
              </span>
            </div>
            <p>
              {state.kind === "committed"
                ? "Lô này đã đưa vào Inbox. Duyệt từng dòng trước khi ghi sổ."
                : "Lô này đã hủy. Bạn có thể tải file khác."}
            </p>
            <div className="capture-paste-actions">
              {state.kind === "committed" ? (
                <Link className="primary-button" href="/inbox">
                  Mở Inbox
                </Link>
              ) : (
                <Link className="primary-button" href="/capture/upload">
                  Tải sao kê
                </Link>
              )}
              <Link className="secondary-button" href="/capture">
                Capture
              </Link>
            </div>
          </section>
        )}

        {state.phase === "ready" && (
          <section
            className="panel import-preview-panel"
            aria-labelledby="import-preview-heading"
          >
            <div className="import-preview-header">
              <h2 id="import-preview-heading" className="sr-only">
                Xem trước import
              </h2>
              <div className="import-preview-status-row">
                <span className="import-preview-status-label">Trạng thái</span>
                <span className="preview-chip sm warning">
                  {importBatchStatusLabel(state.batch.status)}
                </span>
              </div>
            </div>

            <div className="import-preview-template">
              <p className="import-preview-template-title">
                Template gợi ý: Generic CSV (cột tự map {mapPct}%)
              </p>
              <p className="import-preview-template-hint">
                Map cột tự động từ tiêu đề. Map thủ công sẽ có ở bản sau — kiểm
                tra preview bên dưới trước khi xác nhận.
              </p>
            </div>

            <div className="import-preview-map" aria-label="Map cột">
              <h3 className="import-preview-section-title">Map</h3>
              <dl className="import-preview-map-list">
                <div className="import-preview-map-row">
                  <dt>Ngày</dt>
                  <dd>
                    <span className="import-preview-map-arrow" aria-hidden>
                      →
                    </span>
                    <span className="font-mono import-preview-map-col">
                      {columnHeaderLabel(
                        state.batch.headers,
                        state.batch.columnMap.date,
                      )}
                    </span>
                  </dd>
                </div>
                <div className="import-preview-map-row">
                  <dt>Số tiền</dt>
                  <dd>
                    <span className="import-preview-map-arrow" aria-hidden>
                      →
                    </span>
                    <span className="font-mono import-preview-map-col">
                      {amountColumnLabel(state.batch)}
                    </span>
                  </dd>
                </div>
                <div className="import-preview-map-row">
                  <dt>Mô tả</dt>
                  <dd>
                    <span className="import-preview-map-arrow" aria-hidden>
                      →
                    </span>
                    <span className="font-mono import-preview-map-col">
                      {columnHeaderLabel(
                        state.batch.headers,
                        state.batch.columnMap.desc,
                      )}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="import-preview-table-wrap">
              <h3 className="import-preview-section-title">
                Preview {Math.min(PREVIEW_LIMIT, state.rows.length)} dòng đầu
              </h3>
              <div className="import-preview-table-scroll">
                <table className="import-preview-table">
                  <thead>
                    <tr>
                      <th scope="col">Ngày</th>
                      <th scope="col">Mô tả</th>
                      <th scope="col">Số tiền</th>
                      <th scope="col">
                        <span className="sr-only">Cảnh báo</span>
                        <span aria-hidden>⚠</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => {
                      const warn =
                        row.uncertainFields.length > 0 ||
                        row.confidence === "low";
                      return (
                        <tr
                          key={`${row.rowIndex}-${row.rawSnippet}`}
                          className={warn ? "is-warn" : undefined}
                        >
                          <td className="font-mono">{row.occurredOn}</td>
                          <td>
                            <span className="import-preview-merchant">
                              {row.merchant}
                            </span>
                          </td>
                          <td
                            className={`font-mono import-preview-amount ${moneyClass(row.kind)}`}
                          >
                            {moneySign(row.kind)}
                            {formatMoney(row.amount)}
                          </td>
                          <td className="import-preview-warn-cell">
                            {warn ? (
                              <span
                                className="import-preview-warn"
                                title={
                                  row.explanations[0] ??
                                  "Cần xem khi duyệt trong Inbox"
                                }
                              >
                                ⚠
                              </span>
                            ) : (
                              <span className="import-preview-ok" aria-hidden>
                                ·
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {state.rows.length > PREVIEW_LIMIT && (
                <p className="import-preview-more">
                  … và {state.rows.length - PREVIEW_LIMIT} dòng nữa sẽ vào Inbox
                  khi xác nhận.
                </p>
              )}
            </div>

            <p className="import-preview-summary" role="status">
              Tóm tắt: {summary}
            </p>

            {actionError && (
              <p className="capture-paste-error" role="alert">
                {actionError}
              </p>
            )}

            <div className="capture-paste-actions">
              <button
                type="button"
                className="primary-button"
                onClick={commitToInbox}
                disabled={committing || cancelling}
              >
                {committing ? "Đang lưu…" : "Đưa vào Inbox"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={cancelImport}
                disabled={committing || cancelling}
              >
                {cancelling ? "Đang hủy…" : "Hủy import"}
              </button>
            </div>

            <p className="capture-paste-trust">
              <Icon name="lock" />
              <span>
                Chỉ meta + draft parse trên máy bạn · không tự duyệt vào sổ ·
                Inbox vẫn là bước kiểm tra.
              </span>
            </p>
          </section>
        )}
      </main>
    </AppShell>
  );
}
