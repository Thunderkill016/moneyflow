"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
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
  deleteImportBatchForClient,
  loadImportBatchesForClient,
} from "@/hooks/client-inbox";
import {
  formatImportBatchDateShort,
  formatImportBatchStats,
  importBatchSourceLabel,
  importBatchStatusLabel,
  sortImportBatchesNewestFirst,
  type ImportBatch,
} from "@/lib/inbox/import-batch-store";
import { removeImportDraft } from "@/lib/inbox/import-draft-store";
import styles from "./imports-page.module.css";

function statusTone(status: ImportBatch["status"]) {
  if (status === "committed") return styles.statusCommitted;
  if (status === "cancelled") return styles.statusCancelled;
  return styles.statusParsed;
}

export function ImportsPage({ viewer }: { viewer: ViewerSummary }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ImportBatch | null>(null);

  async function reload() {
    try {
      const result = await loadImportBatchesForClient(viewer.isDemo);
      if (!result.ok) {
        setError(result.message);
        setBatches([]);
        return;
      }
      setBatches(sortImportBatchesNewestFirst(result.batches));
      setInboxCount(result.pendingCount);
      setError(null);
    } catch {
      setError("Không đọc được lịch sử import. Thử tải lại trang.");
      setBatches([]);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await reload();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per auth mode
  }, [viewer.isDemo]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function deleteMetadata(batch: ImportBatch) {
    if (deletingId) return;
    setDeletingId(batch.id);
    try {
      removeImportDraft(batch.id);
      const result = await deleteImportBatchForClient(viewer.isDemo, batch.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await reload();
      setDeleteTarget(null);
      setNotice("Đã xóa metadata và bản nháp import còn lại.");
    } catch {
      setError("Không xóa được metadata import. Thử lại.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
      notice={notice}
      primaryAction={{
        label: "Tải sao kê",
        href: "/capture/upload",
        icon: "upload",
      }}
    >
      <SecondaryWorkspace slot="imports-workspace">
        <SecondaryHeader
          section="Sao kê và file"
          title="Lịch sử import"
          description={
            <p>
              {viewer.isDemo
                ? "Bản demo giữ batch, ứng viên và draft trên trình duyệt này."
                : "Tài khoản đăng nhập đồng bộ batch cùng ứng viên qua máy chủ theo quyền sở hữu; draft tạm vẫn có thể nằm trên trình duyệt."}{" "}
              Xóa metadata không xóa giao dịch đã được duyệt vào sổ.
            </p>
          }
          actions={
            <>
              <LinkButton href="/inbox" intent="secondary" targetSize="important">
                <Icon name="inbox" />
                Inbox
              </LinkButton>
              <LinkButton
                href="/imports/direct"
                intent="quiet"
                targetSize="important"
              >
                CSV → sổ (nâng cao)
              </LinkButton>
            </>
          }
        />

        <Alert tone="info" live="polite">
          <AlertDescription>
            Luồng mặc định là <strong>parse → xem trước → Inbox → duyệt → sổ</strong>.
            Import thẳng vào sổ là công cụ nâng cao và phải hiển thị dry-run, chống
            trùng cùng kết quả thêm/bỏ qua/lỗi trước khi được dùng.
          </AlertDescription>
        </Alert>

        {!ready ? (
          <section
            className={styles.loading}
            aria-busy="true"
            aria-label="Đang tải lịch sử import"
          >
            <span />
            <span />
            <span />
          </section>
        ) : null}

        {ready && error ? (
          <Alert tone="error" live="assertive">
            <AlertDescription className={styles.alertAction}>
              <span>{error}</span>
              <Button
                type="button"
                intent="secondary"
                targetSize="important"
                onClick={() => void reload()}
              >
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {ready && !error && batches.length === 0 ? (
          <EmptyState
            icon={<Icon name="imports" />}
            title="Chưa có lượt import"
            description="Tải hoặc dán sao kê để tạo ứng viên trong Inbox trước khi ghi vào sổ."
            primaryAction={
              <LinkButton
                href="/capture/upload"
                intent="primary"
                targetSize="important"
              >
                Tải sao kê
              </LinkButton>
            }
            secondaryAction={
              <LinkButton
                href="/capture/paste"
                intent="secondary"
                targetSize="important"
              >
                Dán nội dung
              </LinkButton>
            }
          />
        ) : null}

        {ready && !error && batches.length > 0 ? (
          <SecondarySection
            title="Các lượt gần đây"
            description={<p>{batches.length} batch import được tìm thấy.</p>}
            slot="import-batch-list"
          >
            <ol className={styles.list}>
              {batches.map((batch) => (
                <li key={batch.id} className={styles.item}>
                  <div className={styles.identity}>
                    <span className={styles.sourceIcon} aria-hidden="true">
                      <Icon name="imports" />
                    </span>
                    <div className={styles.body}>
                      <strong title={batch.fileName}>{batch.fileName}</strong>
                      <p>
                        <time dateTime={batch.createdAt}>
                          {formatImportBatchDateShort(batch.createdAt)}
                        </time>
                        <span aria-hidden="true"> · </span>
                        <span>{importBatchSourceLabel(batch.source)}</span>
                      </p>
                    </div>
                  </div>
                  <div className={styles.stats}>
                    <span>{formatImportBatchStats(batch)}</span>
                    <span className={`${styles.status} ${statusTone(batch.status)}`}>
                      {importBatchStatusLabel(batch.status)}
                    </span>
                  </div>
                  <div className={styles.actions}>
                    {batch.status === "committed" ? (
                      <LinkButton
                        href="/inbox"
                        intent="secondary"
                        targetSize="important"
                      >
                        Xem Inbox
                      </LinkButton>
                    ) : (
                      <LinkButton
                        href={`/imports/${encodeURIComponent(batch.id)}/preview`}
                        intent="secondary"
                        targetSize="important"
                      >
                        {batch.status === "cancelled" ? "Chi tiết" : "Xem trước"}
                      </LinkButton>
                    )}
                    <Button
                      type="button"
                      intent="destructive"
                      targetSize="important"
                      onClick={() => setDeleteTarget(batch)}
                      disabled={deletingId === batch.id}
                      aria-label={`Xóa metadata import ${batch.fileName}`}
                    >
                      Xóa metadata
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          </SecondarySection>
        ) : null}
      </SecondaryWorkspace>

      <SecondaryReviewDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deletingId) setDeleteTarget(null);
        }}
        title="Xóa metadata import?"
        description="Kiểm tra chính xác dữ liệu bị xóa và dữ liệu được giữ."
        details={
          deleteTarget
            ? [
                { label: "Batch", value: deleteTarget.fileName },
                { label: "Trạng thái", value: importBatchStatusLabel(deleteTarget.status) },
                { label: "Ứng viên Inbox", value: "Được giữ" },
                { label: "Giao dịch đã duyệt", value: "Được giữ" },
              ]
            : []
        }
        consequence="Metadata batch và bản nháp parse còn trên thiết bị sẽ bị xóa. Ứng viên đã tạo trong Inbox cùng giao dịch đã duyệt vào sổ không bị xóa."
        confirmLabel="Xóa metadata"
        confirmIntent="destructive"
        pending={Boolean(deleteTarget && deletingId === deleteTarget.id)}
        onConfirm={() => (deleteTarget ? deleteMetadata(deleteTarget) : undefined)}
        slot="import-delete-review"
      />
    </AppShell>
  );
}
