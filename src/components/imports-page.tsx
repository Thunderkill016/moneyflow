"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import {
  deleteImportBatchForClient,
  loadImportBatchesForClient,
} from "@/lib/inbox/client-inbox";
import {
  formatImportBatchDateShort,
  formatImportBatchStats,
  importBatchSourceLabel,
  importBatchStatusLabel,
  sortImportBatchesNewestFirst,
  type ImportBatch,
} from "@/lib/inbox/import-batch-store";
import { removeImportDraft } from "@/lib/inbox/import-draft-store";

/**
 * Import history (wireframes-inbox §15).
 * Lists batches (local demo or server when authed); preview; delete raw meta.
 */
export function ImportsPage({ viewer }: { viewer: ViewerSummary }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function deleteRaw(batch: ImportBatch) {
    if (deletingId) return;
    const ok = window.confirm(
      `Xóa meta import “${batch.fileName}”? Bản nháp raw (nếu còn) cũng bị xóa. Ứng viên đã vào Inbox không bị xóa.`,
    );
    if (!ok) return;
    setDeletingId(batch.id);
    try {
      removeImportDraft(batch.id);
      const result = await deleteImportBatchForClient(viewer.isDemo, batch.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await reload();
      setNotice("Đã xóa meta import.");
    } catch {
      setError("Không xóa được meta import. Thử lại.");
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
        label: "Tải lên",
        href: "/capture/upload",
        icon: "upload",
      }}
    >
      <main className="dashboard imports-workspace">
        <section className="transactions-title-row">
          <div>
            <p className="eyebrow">Sao kê &amp; file</p>
            <h1>Lịch sử import</h1>
            <p>
              {viewer.isDemo
                ? "Các lượt tải lên / dán đã lưu trên thiết bị này."
                : "Các lượt tải lên / dán đã đồng bộ theo tài khoản (RLS)."}{" "}
              Xóa meta không xóa giao dịch đã duyệt trong sổ.
            </p>
          </div>
          <div className="page-heading-actions">
            <Link className="primary-button" href="/capture/upload">
              <Icon name="upload" />
              Tải lên
            </Link>
            <Link className="secondary-button" href="/inbox">
              <Icon name="inbox" />
              Inbox
            </Link>
          </div>
        </section>

        {!ready && (
          <section
            className="panel imports-loading"
            aria-busy="true"
            aria-label="Đang tải lịch sử import"
          >
            <div className="loading-line wide" />
            <div className="loading-line" />
            <div className="loading-line" />
          </section>
        )}

        {ready && error && (
          <section className="panel imports-error" role="alert">
            <p>{error}</p>
            <button type="button" className="secondary-button" onClick={reload}>
              Thử lại
            </button>
          </section>
        )}

        {ready && !error && batches.length === 0 && (
          <EmptyState
            icon="imports"
            title="Chưa có lượt import"
            description="Tải CSV sao kê hoặc dán text — sau khi map cột, lượt import hiện ở đây."
            actionLabel="Tải sao kê"
            actionHref="/capture/upload"
            secondaryLabel="Về Inbox"
            secondaryHref="/inbox"
          />
        )}

        {ready && !error && batches.length > 0 && (
          <section
            className="panel imports-list-panel"
            aria-labelledby="imports-list-heading"
          >
            <div className="imports-list-header">
              <h2 id="imports-list-heading">Các lượt gần đây</h2>
              <p className="imports-list-count">{batches.length} lượt</p>
            </div>
            <ul className="imports-list">
              {batches.map((batch) => (
                <li key={batch.id} className="imports-list-item">
                  <div className="imports-list-main">
                    <time
                      className="imports-list-date font-mono"
                      dateTime={batch.createdAt}
                    >
                      {formatImportBatchDateShort(batch.createdAt)}
                    </time>
                    <div className="imports-list-body">
                      <p className="imports-list-name" title={batch.fileName}>
                        {batch.fileName}
                      </p>
                      <p className="imports-list-meta">
                        <span className="preview-chip sm">
                          {importBatchSourceLabel(batch.source)}
                        </span>
                        <span className="imports-list-stats font-mono">
                          {formatImportBatchStats(batch)}
                        </span>
                        <span
                          className={`preview-chip sm imports-status-${batch.status}`}
                        >
                          {importBatchStatusLabel(batch.status)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="imports-list-actions">
                    {batch.status === "committed" ? (
                      <Link className="secondary-button" href="/inbox">
                        Xem Inbox
                      </Link>
                    ) : (
                      <Link
                        className="secondary-button"
                        href={`/imports/${encodeURIComponent(batch.id)}/preview`}
                      >
                        {batch.status === "cancelled" ? "Chi tiết" : "Xem"}
                      </Link>
                    )}
                    <button
                      type="button"
                      className="secondary-button imports-delete"
                      onClick={() => deleteRaw(batch)}
                      disabled={deletingId === batch.id}
                      aria-label={`Xóa meta import ${batch.fileName}`}
                    >
                      {deletingId === batch.id ? "Đang xóa…" : "Xóa raw"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="imports-list-hint">
              Money Flow không giữ file gốc trên máy chủ ở bản local-first này —
              chỉ meta lượt import trên trình duyệt. Xóa raw = xóa meta (+ draft
              chờ xác nhận).
            </p>
          </section>
        )}
      </main>
    </AppShell>
  );
}
