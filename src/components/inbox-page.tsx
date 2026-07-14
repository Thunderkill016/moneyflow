"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import {
  CONFIDENCE_LABELS,
  SOURCE_LABELS,
  countPending,
  filterCandidates,
  formatCandidateDate,
  readStoredCandidates,
  removeStoredCandidate,
  sampleCandidates,
  sortCandidatesNewest,
  writeStoredCandidates,
  type InboxCandidate,
  type InboxFilter,
} from "@/lib/inbox/candidate-store";
import { formatMoney } from "@/lib/money";

type LoadState = "loading" | "ready" | "error";

const FILTERS: { id: InboxFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "needs_review", label: "⚠ Cần xem" },
  { id: "duplicate", label: "Trùng?" },
  { id: "transfer", label: "CK?" },
];

function confidenceClass(confidence: InboxCandidate["confidence"]): string {
  if (confidence === "high") return "ok";
  if (confidence === "medium") return "warning";
  return "danger";
}

function moneySign(kind: InboxCandidate["kind"]): string {
  if (kind === "income") return "+";
  if (kind === "transfer") return "↔ ";
  return "−";
}

function moneyClass(kind: InboxCandidate["kind"]): string {
  if (kind === "income") return "positive";
  if (kind === "transfer") return "transfer";
  return "negative";
}

export function InboxPage({ viewer }: { viewer: ViewerSummary }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [candidates, setCandidates] = useState<InboxCandidate[]>([]);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback((opts?: { showLoading?: boolean }) => {
    const showLoading = opts?.showLoading ?? false;
    if (showLoading) {
      setLoadState("loading");
      setErrorMessage("");
    }
    // Defer localStorage read so first paint can show skeleton (wireframes §5).
    window.requestAnimationFrame(() => {
      try {
        const stored = readStoredCandidates();
        setCandidates(stored);
        setErrorMessage("");
        setLoadState("ready");
      } catch {
        setErrorMessage("Không tải được inbox");
        setLoadState("error");
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        const stored = readStoredCandidates();
        setCandidates(stored);
        setLoadState("ready");
      } catch {
        setErrorMessage("Không tải được inbox");
        setLoadState("error");
      }
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const pendingCount = useMemo(() => countPending(candidates), [candidates]);
  const visible = useMemo(
    () => sortCandidatesNewest(filterCandidates(candidates, filter)),
    [candidates, filter],
  );

  function persist(next: InboxCandidate[]) {
    writeStoredCandidates(next);
    setCandidates(next);
  }

  function seedDemo() {
    const next = sampleCandidates.map((item) => ({ ...item }));
    persist(next);
    setNotice("Đã nạp dữ liệu mẫu vào Inbox.");
  }

  function dismissCandidate(id: string) {
    const target = candidates.find((item) => item.id === id);
    if (!target) return;
    const confirmed = window.confirm(
      `Gỡ “${target.merchant}” khỏi Inbox? (Chưa ghi vào sổ — chỉ xóa ứng viên.)`,
    );
    if (!confirmed) return;
    const next = removeStoredCandidate(id);
    setCandidates(next);
    setNotice(`Đã gỡ ${target.merchant}.`);
  }

  return (
    <AppShell
      viewer={viewer}
      inboxCount={pendingCount}
      primaryAction={{
        label: "Capture",
        href: "/capture",
        icon: "plus",
      }}
      fabAction={{
        label: "Capture",
        onClick: () => {
          window.location.href = "/capture";
        },
        icon: "plus",
      }}
      notice={notice}
    >
      <main className="dashboard inbox-workspace">
        <section className="transactions-title-row inbox-title-row">
          <div>
            <p className="eyebrow">Hộp thư tài chính</p>
            <h1>Inbox</h1>
            <p>
              {loadState === "ready"
                ? `Cần duyệt: ${pendingCount}`
                : "Duyệt giao dịch trước khi vào sổ."}
            </p>
          </div>
          <div className="page-heading-actions">
            <Link className="primary-button" href="/capture">
              <Icon name="plus" />
              Capture
            </Link>
          </div>
        </section>

        {loadState === "error" && (
          <div className="data-alert" role="alert">
            <Icon name="bell" />
            <span>{errorMessage || "Không tải được inbox"}</span>
            <button
              type="button"
              className="secondary-button"
              onClick={() => load({ showLoading: true })}
            >
              Thử lại
            </button>
          </div>
        )}

        <section className="inbox-toolbar panel" aria-label="Bộ lọc Inbox">
          <div className="filter-group inbox-filter-chips" role="toolbar" aria-label="Lọc ứng viên">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={filter === item.id ? "active" : ""}
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="inbox-sort-hint">Sắp xếp: Mới nhất</p>
        </section>

        {loadState === "loading" && (
          <section className="inbox-list panel" aria-busy="true" aria-label="Đang tải Inbox">
            {Array.from({ length: 8 }, (_, index) => (
              <div className="inbox-skeleton-row" key={index}>
                <span className="loading-line inbox-skel-date" />
                <span className="loading-line inbox-skel-merchant" />
                <span className="loading-line inbox-skel-money" />
                <span className="loading-line inbox-skel-badge" />
                <span className="loading-line inbox-skel-badge" />
              </div>
            ))}
          </section>
        )}

        {loadState === "ready" && visible.length === 0 && (
          <section className="panel inbox-empty-panel">
            {pendingCount === 0 ? (
              <EmptyState
                icon="inbox"
                title="Inbox trống"
                description="Chưa có giao dịch chờ duyệt. Hãy dán text, tải file hoặc thêm nhanh."
                actionLabel="Dán text"
                actionHref="/capture/paste"
                secondaryLabel="Tải file"
                secondaryHref="/capture/upload"
              />
            ) : (
              <EmptyState
                icon="search"
                title="Không có mục khớp bộ lọc"
                description="Thử chọn “Tất cả” hoặc đổi bộ lọc khác."
                actionLabel="Xem tất cả"
                onAction={() => setFilter("all")}
              />
            )}
            {pendingCount === 0 && (
              <div className="inbox-empty-extra">
                <Link className="secondary-button" href="/capture/quick">
                  Thêm nhanh
                </Link>
                <button type="button" className="secondary-button" onClick={seedDemo}>
                  Nạp dữ liệu mẫu
                </button>
              </div>
            )}
          </section>
        )}

        {loadState === "ready" && visible.length > 0 && (
          <section className="inbox-list panel" aria-label="Danh sách chờ duyệt">
            <div className="inbox-list-header" aria-hidden="true">
              <span>Ngày</span>
              <span>Mô tả</span>
              <span>Số tiền</span>
              <span>Nguồn</span>
              <span>Độ tin</span>
              <span />
            </div>
            <ul className="inbox-rows">
              {visible.map((candidate) => (
                <li key={candidate.id}>
                  <article
                    className={`inbox-row${candidate.confidence === "low" ? " low-conf" : ""}`}
                  >
                    <time className="inbox-row-date" dateTime={candidate.occurredOn}>
                      {formatCandidateDate(candidate.occurredOn)}
                    </time>
                    <div className="inbox-row-main">
                      <strong>{candidate.merchant}</strong>
                      {(candidate.note || candidate.category || candidate.account) && (
                        <small>
                          {[candidate.note, candidate.category, candidate.account]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      )}
                      {candidate.possibleDuplicate ? (
                        <span className="preview-chip sm warning">Trùng?</span>
                      ) : null}
                    </div>
                    <strong className={`inbox-row-amount font-mono ${moneyClass(candidate.kind)}`}>
                      {moneySign(candidate.kind)}
                      {formatMoney(candidate.amount)}
                    </strong>
                    <span className="preview-chip sm source-badge" title="Nguồn">
                      {SOURCE_LABELS[candidate.source]}
                    </span>
                    <span
                      className={`preview-chip sm confidence-badge ${confidenceClass(candidate.confidence)}`}
                      title={CONFIDENCE_LABELS[candidate.confidence]}
                    >
                      {CONFIDENCE_LABELS[candidate.confidence]}
                    </span>
                    <div className="inbox-row-actions">
                      <button
                        type="button"
                        className="secondary-button inbox-row-dismiss"
                        onClick={() => dismissCandidate(candidate.id)}
                        aria-label={`Gỡ ${candidate.merchant}`}
                      >
                        Gỡ
                      </button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
            <p className="inbox-list-footer">
              Hiển thị {visible.length} / {pendingCount} mục chờ duyệt. Duyệt chi tiết sẽ có ở bước
              sau.
            </p>
          </section>
        )}
      </main>
    </AppShell>
  );
}
