"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import {
  SecondaryHeader,
  SecondaryReviewDialog,
  SecondarySection,
  SecondaryWorkspace,
} from "@/components/secondary/secondary-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
import { toCsvCandidateInputs, type ParsedCsvRow } from "@/lib/inbox/parse-csv";
import { trackProductEvent } from "@/lib/safe-analytics";
import styles from "./import-preview-page.module.css";

const PREVIEW_LIMIT = 10;

type LoadState =
  | { phase: "loading" }
  | { phase: "empty" }
  | { phase: "error"; message: string }
  | { phase: "ready"; batch: ImportBatch; rows: ParsedCsvRow[] }
  | { phase: "done"; batch: ImportBatch; kind: "committed" | "cancelled" };

function amountColumnLabel(batch: ImportBatch): string {
  const { columnMap, headers } = batch;
  if (columnMap.amount !== null) return columnHeaderLabel(headers, columnMap.amount);
  const debit = columnHeaderLabel(headers, columnMap.debit);
  const credit = columnHeaderLabel(headers, columnMap.credit);
  if (columnMap.debit !== null && columnMap.credit !== null) return `${debit} / ${credit}`;
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
  const [commitReview, setCommitReview] = useState(false);
  const [cancelReview, setCancelReview] = useState(false);

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
            "Không còn dữ liệu preview cho batch này. Tải lại file từ Capture → Tải lên.",
        });
        return;
      }
      setState({ phase: "ready", batch, rows: draft.rows });
    } catch {
      setState({ phase: "error", message: "Không đọc được batch import trên thiết bị này." });
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

  const previewRows = useMemo(
    () => (state.phase === "ready" ? previewDraftRows(state.rows, PREVIEW_LIMIT) : []),
    [state],
  );
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
  const busy = committing || cancelling;

  async function commitToInbox() {
    if (state.phase !== "ready" || busy) return;
    setCommitting(true);
    setActionError("");
    try {
      const source =
        state.batch.source === "xlsx"
          ? ("xlsx" as const)
          : state.batch.source === "pdf"
            ? ("pdf" as const)
            : ("csv" as const);
      const inputs = toCsvCandidateInputs(state.rows, state.batch.id, source);
      const addResult = await addCandidatesForClient(viewer.isDemo, inputs);
      if (!addResult.ok) {
        setActionError(addResult.message);
        setCommitReview(false);
        setCommitting(false);
        return;
      }
      const markResult = await markBatchCommittedForClient(viewer.isDemo, state.batch.id);
      if (!markResult.ok) {
        setActionError(
          `${markResult.message} Ứng viên có thể đã được thêm; mở Inbox trước khi thử lại để tránh thao tác lặp.`,
        );
        setCommitReview(false);
        setCommitting(false);
        return;
      }
      removeImportDraft(state.batch.id);
      trackProductEvent("import_batch_committed", {
        candidate_count: inputs.length,
        row_count: state.batch.rowCount,
        source_type: source,
        warning_count: state.batch.warningCount,
        skipped_rows: state.batch.skippedRows,
        map_confidence: state.batch.mapConfidence,
      });
      setInboxCount(await getPendingCountForClient(viewer.isDemo));
      setNotice(`Đã đưa ${inputs.length} ứng viên vào Inbox — chưa ghi sổ.`);
      router.push("/inbox");
    } catch {
      setActionError("Không lưu được vào Inbox. Hãy mở Inbox kiểm tra trước khi thử lại.");
      setCommitReview(false);
      setCommitting(false);
    }
  }

  async function cancelImport() {
    if (state.phase !== "ready" || busy) return;
    setCancelling(true);
    setActionError("");
    try {
      const markResult = await markBatchCancelledForClient(viewer.isDemo, state.batch.id);
      if (!markResult.ok) {
        setActionError(markResult.message);
        setCancelReview(false);
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
      setActionError("Không hủy được batch import. Thử lại.");
      setCancelReview(false);
      setCancelling(false);
    }
  }

  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
      primaryAction={{ label: "Inbox", href: "/inbox", icon: "inbox" }}
      notice={notice}
    >
      <SecondaryWorkspace slot="import-preview-workspace">
        <SecondaryHeader
          section="Capture · Cổng chất lượng"
          title={
            state.phase === "ready" || state.phase === "done"
              ? `Import · ${state.batch.fileName}`
              : "Xem trước import"
          }
          description={
            <p>
              Kiểm tra map cột và các dòng cảnh báo trước khi tạo ứng viên trong
              Inbox. Preview này không ghi thẳng vào sổ.
            </p>
          }
          actions={
            <>
              <LinkButton
                href="/capture/upload"
                intent="secondary"
                targetSize="important"
              >
                Tải file khác
              </LinkButton>
              <LinkButton href="/inbox" intent="secondary" targetSize="important">
                Inbox
              </LinkButton>
            </>
          }
        />

        {state.phase === "loading" ? (
          <section className={styles.loading} aria-busy="true" aria-label="Đang tải preview">
            <span />
            <span />
            <span />
          </section>
        ) : null}

        {state.phase === "empty" ? (
          <EmptyState
            icon={<Icon name="imports" />}
            title="Không tìm thấy batch import"
            description={`Batch ${batchId} đã bị xóa, hết draft hoặc được mở trên trình duyệt khác.`}
            primaryAction={
              <LinkButton
                href="/capture/upload"
                intent="primary"
                targetSize="important"
              >
                Tải sao kê mới
              </LinkButton>
            }
            secondaryAction={
              <LinkButton href="/inbox" intent="secondary" targetSize="important">
                Về Inbox
              </LinkButton>
            }
          />
        ) : null}

        {state.phase === "error" ? (
          <Alert tone="error" live="assertive">
            <AlertDescription className={styles.alertAction}>
              <span>{state.message}</span>
              <Button type="button" intent="secondary" targetSize="important" onClick={() => void reload()}>
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {state.phase === "done" ? (
          <SecondarySection
            title={importBatchStatusLabel(state.batch.status)}
            description={
              <p>
                {state.kind === "committed"
                  ? "Batch đã tạo ứng viên trong Inbox. Mỗi ứng viên vẫn cần được duyệt trước khi vào sổ."
                  : "Batch đã bị hủy và draft preview đã được xóa."}
              </p>
            }
            contained
            slot="import-preview-result"
          >
            <div className={styles.actions}>
              <LinkButton
                href={state.kind === "committed" ? "/inbox" : "/capture/upload"}
                intent="primary"
                targetSize="important"
              >
                {state.kind === "committed" ? "Mở Inbox" : "Tải sao kê"}
              </LinkButton>
              <LinkButton href="/capture" intent="secondary" targetSize="important">
                Capture
              </LinkButton>
            </div>
          </SecondarySection>
        ) : null}

        {state.phase === "ready" ? (
          <>
            <SecondarySection
              title="Map cột"
              description={
                <p>
                  Generic import tự map {mapPct}%. Kiểm tra ba trường chính trước khi
                  xác nhận.
                </p>
              }
              contained
              slot="import-preview-map"
            >
              <dl className={styles.mapList}>
                <div>
                  <dt>Ngày</dt>
                  <dd>{columnHeaderLabel(state.batch.headers, state.batch.columnMap.date)}</dd>
                </div>
                <div>
                  <dt>Số tiền</dt>
                  <dd>{amountColumnLabel(state.batch)}</dd>
                </div>
                <div>
                  <dt>Mô tả</dt>
                  <dd>{columnHeaderLabel(state.batch.headers, state.batch.columnMap.desc)}</dd>
                </div>
              </dl>
            </SecondarySection>

            <SecondarySection
              title={`Preview ${Math.min(PREVIEW_LIMIT, state.rows.length)} dòng đầu`}
              description={<p>{summary}</p>}
              contained
              slot="import-preview-table"
            >
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Ngày</th>
                      <th scope="col">Mô tả</th>
                      <th scope="col">Số tiền</th>
                      <th scope="col">Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => {
                      const warn = row.uncertainFields.length > 0 || row.confidence === "low";
                      return (
                        <tr key={`${row.rowIndex}-${row.rawSnippet}`}>
                          <td>{row.occurredOn}</td>
                          <td>{row.merchant}</td>
                          <td>
                            <MoneyValue
                              amount={row.amount}
                              mode="kind"
                              kind={row.kind}
                              label={`Dòng ${row.rowIndex}`}
                            />
                          </td>
                          <td>
                            <span className={warn ? styles.warningStatus : styles.readyStatus}>
                              {warn ? "Cần xem trong Inbox" : "Sẵn sàng tạo ứng viên"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {state.rows.length > PREVIEW_LIMIT ? (
                <p className={styles.hint}>
                  Còn {state.rows.length - PREVIEW_LIMIT} dòng sẽ tạo ứng viên khi xác nhận.
                </p>
              ) : null}

              {actionError ? (
                <Alert tone="error" live="assertive">
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              ) : null}

              <div className={styles.actions}>
                <Button
                  type="button"
                  intent="primary"
                  targetSize="important"
                  disabled={busy}
                  onClick={() => setCommitReview(true)}
                >
                  Xem lại đưa vào Inbox
                </Button>
                <Button
                  type="button"
                  intent="destructive"
                  targetSize="important"
                  disabled={busy}
                  onClick={() => setCancelReview(true)}
                >
                  Hủy import
                </Button>
              </div>
            </SecondarySection>
          </>
        ) : null}
      </SecondaryWorkspace>

      <SecondaryReviewDialog
        open={commitReview}
        onOpenChange={(open) => {
          if (!open && !busy) setCommitReview(false);
        }}
        title="Đưa batch vào Inbox?"
        description="Batch sẽ tạo ứng viên chờ duyệt, chưa tạo giao dịch trong sổ."
        details={
          state.phase === "ready"
            ? [
                { label: "File", value: state.batch.fileName },
                { label: "Ứng viên", value: `${state.rows.length} mục` },
                { label: "Cảnh báo", value: `${state.batch.warningCount} dòng` },
                { label: "Sổ giao dịch", value: "Chưa thay đổi" },
              ]
            : []
        }
        consequence="Ứng viên sẽ xuất hiện trong Inbox và vẫn phải được kiểm tra. Nếu bước cập nhật trạng thái batch lỗi sau khi thêm ứng viên, hãy mở Inbox trước khi thử lại."
        confirmLabel="Đưa vào Inbox"
        confirmIntent="primary"
        pending={committing}
        onConfirm={commitToInbox}
        slot="import-preview-commit-review"
      />

      <SecondaryReviewDialog
        open={cancelReview}
        onOpenChange={(open) => {
          if (!open && !busy) setCancelReview(false);
        }}
        title="Hủy batch import?"
        description="Batch và draft preview sẽ bị đánh dấu hủy."
        details={
          state.phase === "ready"
            ? [
                { label: "File", value: state.batch.fileName },
                { label: "Dòng preview", value: `${state.rows.length}` },
                { label: "Ứng viên Inbox", value: "Chưa tạo" },
                { label: "Sổ giao dịch", value: "Không thay đổi" },
              ]
            : []
        }
        consequence="Draft parse sẽ bị xóa khỏi thiết bị. Vì batch chưa commit, không có ứng viên hoặc giao dịch nào bị xóa."
        confirmLabel="Hủy import"
        confirmIntent="destructive"
        pending={cancelling}
        onConfirm={cancelImport}
        slot="import-preview-cancel-review"
      />
    </AppShell>
  );
}
