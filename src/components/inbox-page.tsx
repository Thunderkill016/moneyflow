"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icons";
import { InboxBulkBar, type BulkApplyPayload } from "@/components/inbox-bulk-bar";
import {
  InboxReviewPanel,
  type ReviewSubmitPayload,
} from "@/components/inbox-review-panel";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import { useTransactions } from "@/hooks/use-transactions";
import {
  CONFIDENCE_LABELS,
  SOURCE_LABELS,
  countPending,
  filterCandidates,
  formatCandidateDate,
  readStoredCandidates,
  sampleCandidates,
  sortCandidatesNewest,
  updateStoredCandidate,
  writeStoredCandidates,
  type InboxCandidate,
  type InboxFilter,
} from "@/lib/inbox/candidate-store";
import {
  applyBulkCategory,
  buildLedgerPost,
  draftFromCandidate,
  markCandidatesStatus,
  partitionBulkApprove,
} from "@/lib/inbox/review";
import { formatMoney } from "@/lib/money";
import type {
  AccountOption,
  CategoryOption,
  Transaction,
} from "@/lib/sample-data";

type LoadState = "loading" | "ready" | "error";

type InboxWorkspace = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  dataError: string | null;
};

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

export function InboxPage({
  viewer,
  workspace,
}: {
  viewer: ViewerSummary;
  workspace: InboxWorkspace;
}) {
  const { addTransaction, addTransfer, isMutating } = useTransactions({
    initialTransactions: workspace.transactions,
    accounts: workspace.accounts,
    categories: workspace.categories,
    isDemo: viewer.isDemo,
  });

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [candidates, setCandidates] = useState<InboxCandidate[]>([]);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback((opts?: { showLoading?: boolean }) => {
    const showLoading = opts?.showLoading ?? false;
    if (showLoading) {
      setLoadState("loading");
      setErrorMessage("");
    }
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
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const pendingCount = useMemo(() => countPending(candidates), [candidates]);
  const visible = useMemo(
    () => sortCandidatesNewest(filterCandidates(candidates, filter)),
    [candidates, filter],
  );
  const reviewCandidate = useMemo(
    () => candidates.find((item) => item.id === reviewId && item.status === "pending") ?? null,
    [candidates, reviewId],
  );

  const activeSelectedIds = useMemo(() => {
    const pendingIds = new Set(
      candidates.filter((item) => item.status === "pending").map((item) => item.id),
    );
    return selectedIds.filter((id) => pendingIds.has(id));
  }, [candidates, selectedIds]);

  function persist(next: InboxCandidate[]) {
    writeStoredCandidates(next);
    setCandidates(next);
  }

  function seedDemo() {
    const next = sampleCandidates.map((item) => ({ ...item }));
    persist(next);
    setSelectedIds([]);
    setNotice("Đã nạp dữ liệu mẫu vào Inbox.");
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleSelectAllVisible() {
    const visibleIds = visible.map((item) => item.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => activeSelectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedIds((current) => {
      const set = new Set(current);
      for (const id of visibleIds) set.add(id);
      return [...set];
    });
  }

  async function postOne(payload: ReviewSubmitPayload): Promise<{ ok: boolean; message?: string }> {
    const post = payload.post;
    const accountId =
      post.mode === "money" ? post.input.accountId : post.input.sourceAccountId;
    const account = workspace.accounts.find((item) => item.id === accountId);
    const category =
      post.mode === "money"
        ? workspace.categories.find((item) => item.id === post.input.categoryId)
        : undefined;

    let result: { ok: boolean; message?: string };
    try {
      if (post.mode === "transfer") {
        result = await addTransfer(post.input);
      } else {
        result = await addTransaction(post.input);
      }
    } catch {
      return { ok: false, message: "Mất kết nối khi ghi sổ. Hãy thử lại." };
    }

    if (!result.ok) {
      return { ok: false, message: result.message || "Không thể ghi sổ." };
    }

    const next = markCandidatesStatus(readStoredCandidates(), [payload.candidateId], "approved", {
      kind: payload.draft.kind,
      amount: payload.draft.amount,
      merchant: payload.draft.merchant.trim() || "Không rõ",
      note: payload.draft.note.trim(),
      occurredOn: payload.draft.occurredOn,
      categoryId: category?.id,
      category: category?.name,
      accountId: account?.id,
      account: account?.name,
      possibleDuplicate: payload.draft.possibleDuplicate,
    });
    persist(next);
    setSelectedIds((current) => current.filter((id) => id !== payload.candidateId));
    setNotice(`Đã duyệt “${payload.draft.merchant.trim() || "giao dịch"}” vào sổ.`);
    return { ok: true };
  }

  async function handleApproveReview(
    payload: ReviewSubmitPayload,
  ): Promise<{ ok: boolean; message?: string }> {
    return postOne(payload);
  }

  function handleReject(candidateId: string) {
    const target = candidates.find((item) => item.id === candidateId);
    const next = markCandidatesStatus(readStoredCandidates(), [candidateId], "rejected");
    persist(next);
    setSelectedIds((current) => current.filter((id) => id !== candidateId));
    setReviewId(null);
    setNotice(`Đã từ chối${target ? ` “${target.merchant}”` : ""}.`);
  }

  function handleMarkDuplicate(candidateId: string) {
    const next = updateStoredCandidate({ id: candidateId, possibleDuplicate: true });
    setCandidates(next);
    setNotice("Đã đánh dấu có thể trùng. Hãy kiểm tra trước khi duyệt.");
  }

  async function handleBulkApply(payload: BulkApplyPayload) {
    setBulkBusy(true);
    try {
      if (payload.action === "reject") {
        const next = markCandidatesStatus(
          readStoredCandidates(),
          payload.selectedIds,
          "rejected",
        );
        persist(next);
        setSelectedIds([]);
        setNotice(`Đã từ chối ${payload.selectedIds.length} mục.`);
        return;
      }

      if (payload.action === "category") {
        const category = workspace.categories.find((item) => item.id === payload.categoryId);
        if (!category) {
          setNotice("Chưa chọn được danh mục.");
          return;
        }
        const next = applyBulkCategory(
          readStoredCandidates(),
          payload.selectedIds,
          category,
        );
        persist(next);
        setNotice(`Đã gán danh mục “${category.name}” (chỉ dòng khớp loại thu/chi).`);
        return;
      }

      // approve — never auto-post low conf without opt-in (partitionBulkApprove)
      const list = readStoredCandidates();
      const { eligible, skippedLow } = partitionBulkApprove(
        list,
        payload.selectedIds,
        payload.includeLowConfidence,
      );

      let approved = 0;
      let failed = 0;
      for (const candidate of eligible) {
        const draft = draftFromCandidate(
          candidate,
          workspace.accounts,
          workspace.categories,
        );
        const post = buildLedgerPost(
          draft,
          workspace.accounts,
          workspace.categories,
          crypto.randomUUID(),
        );
        if (!post.ok) {
          failed += 1;
          continue;
        }
        const result = await postOne({
          candidateId: candidate.id,
          draft,
          post,
        });
        if (result.ok) approved += 1;
        else failed += 1;
      }

      setSelectedIds([]);
      const skipNote =
        skippedLow.length > 0
          ? ` · Bỏ qua ${skippedLow.length} dòng conf thấp (không opt-in)`
          : "";
      const failNote = failed > 0 ? ` · Lỗi ${failed}` : "";
      setNotice(`Đã duyệt ${approved}${skipNote}${failNote}.`);
    } finally {
      setBulkBusy(false);
    }
  }

  const allVisibleSelected =
    visible.length > 0 && visible.every((item) => activeSelectedIds.includes(item.id));

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

        {workspace.dataError ? (
          <div className="data-alert" role="status">
            <Icon name="bell" />
            <span>{workspace.dataError} — vẫn duyệt được bằng dữ liệu demo trên thiết bị.</span>
          </div>
        ) : null}

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
              <span className="inbox-col-check">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  aria-label="Chọn tất cả đang hiển thị"
                />
              </span>
              <span>Ngày</span>
              <span>Mô tả</span>
              <span>Số tiền</span>
              <span>Nguồn</span>
              <span>Độ tin</span>
              <span />
            </div>
            <ul className="inbox-rows">
              {visible.map((candidate) => {
                const selected = activeSelectedIds.includes(candidate.id);
                return (
                  <li key={candidate.id}>
                    <article
                      className={`inbox-row${candidate.confidence === "low" ? " low-conf" : ""}${selected ? " selected" : ""}`}
                    >
                      <label className="inbox-col-check">
                        <span className="sr-only">Chọn {candidate.merchant}</span>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(candidate.id)}
                        />
                      </label>
                      <time className="inbox-row-date" dateTime={candidate.occurredOn}>
                        {formatCandidateDate(candidate.occurredOn)}
                      </time>
                      <button
                        type="button"
                        className="inbox-row-main inbox-row-open"
                        onClick={() => setReviewId(candidate.id)}
                      >
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
                      </button>
                      <strong
                        className={`inbox-row-amount font-mono ${moneyClass(candidate.kind)}`}
                      >
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
                          onClick={() => setReviewId(candidate.id)}
                          aria-label={`Duyệt ${candidate.merchant}`}
                        >
                          Duyệt
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
            <p className="inbox-list-footer">
              Hiển thị {visible.length} / {pendingCount} mục chờ duyệt. Chọn nhiều để duyệt hàng
              loạt; conf thấp không tự vào sổ.
            </p>
          </section>
        )}

        <InboxBulkBar
          candidates={candidates}
          selectedIds={activeSelectedIds}
          categories={workspace.categories}
          busy={bulkBusy || isMutating}
          onClear={() => setSelectedIds([])}
          onApply={handleBulkApply}
        />

        <InboxReviewPanel
          key={reviewCandidate?.id ?? "inbox-review-closed"}
          open={reviewId != null && reviewCandidate != null}
          candidate={reviewCandidate}
          accounts={workspace.accounts}
          categories={workspace.categories}
          busy={isMutating}
          onClose={() => setReviewId(null)}
          onApprove={handleApproveReview}
          onReject={handleReject}
          onMarkDuplicate={handleMarkDuplicate}
        />
      </main>
    </AppShell>
  );
}
