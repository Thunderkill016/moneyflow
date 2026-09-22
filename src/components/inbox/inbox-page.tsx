"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import {
  InboxBulkBar,
  type BulkApplyPayload,
} from "@/components/inbox/inbox-bulk-bar";
import {
  InboxReviewPanel,
  type ReviewSubmitPayload,
} from "@/components/inbox/inbox-review-panel";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import {
  SecondaryHeader,
  SecondarySummary,
  SecondarySummaryItem,
  SecondaryWorkspace,
} from "@/components/secondary/secondary-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ToastTone } from "@/components/ui/toast";
import type { ViewerSummary } from "@/components/user-chip";
import {
  loadInboxForClient,
  persistCandidateListForClient,
  updateCandidateForClient,
} from "@/hooks/client-inbox";
import { useTransactions } from "@/hooks/use-transactions";
import {
  approvalIdempotencyKey,
  findDemoApprovalTransaction,
  reconcileDemoApprovalTransaction,
} from "@/lib/inbox/approval-recovery";
import {
  CONFIDENCE_LABELS,
  SOURCE_LABELS,
  countPending,
  filterCandidates,
  formatCandidateDate,
  sampleCandidates,
  sortCandidatesNewest,
  writeStoredCandidates,
  type InboxCandidate,
  type InboxFilter,
} from "@/lib/inbox/candidate-store";
import { annotateCandidates, type DetectedCandidate } from "@/lib/inbox/detect";
import {
  isEditableKeyboardTarget,
  moveFocusIndex,
  resolveInboxShortcut,
} from "@/lib/inbox/keyboard";
import {
  attentionReasonLabel,
  classifyCandidateReadiness,
  partitionPendingCandidates,
} from "@/lib/inbox/readiness";
import {
  applyBulkAccount,
  applyBulkCategory,
  buildLedgerPost,
  draftFromCandidate,
  draftWasEdited,
  findPendingCandidateTarget,
  markCandidatesStatus,
} from "@/lib/inbox/review";
import { trackProductEvent } from "@/lib/safe-analytics";
import { safeUserNotice } from "@/lib/safe-log";
import {
  listDueCommitmentsAction,
  payCommitmentAction,
} from "@/app/actions/commitments";
import { demoCommitmentSeeds } from "@/lib/demo/commitment-fixtures";
import {
  appendPaymentExpense,
  buildCommitmentPaymentExpense,
  markCommitmentPaid,
  monthStartFromDate,
  type RecurringCommitment,
} from "@/lib/planning/commitments";
import {
  hydrateCommitmentsWithOccurrences,
  persistPayOccurrence,
} from "@/lib/planning/commitment-occurrence-store";
import {
  buildCommitmentSuggestions,
  commitmentSuggestionEditBlocked,
  parseCommitmentSuggestionId,
} from "@/lib/planning/commitment-suggestions";
import { todayInVietnam } from "@/lib/vietnam-date";
import type {
  AccountOption,
  CategoryOption,
  Transaction,
} from "@/lib/sample-data";
import {
  readStoredTransactions,
  writeStoredTransactions,
} from "@/lib/transaction-store";
import { clearQueryParam } from "@/lib/url-params";
import styles from "./inbox-page.module.css";

type LoadState = "loading" | "ready" | "error";
type InboxViewFilter = InboxFilter | "ready";

type InboxWorkspace = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  dataError: string | null;
};

const FILTERS: { id: InboxViewFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "ready", label: "Sẵn sàng" },
  { id: "needs_review", label: "Cần xem lại" },
  { id: "duplicate", label: "Có thể trùng" },
  { id: "transfer", label: "Có thể chuyển khoản" },
];

function confidenceTone(confidence: InboxCandidate["confidence"]) {
  if (confidence === "high") return styles.confidenceHigh;
  if (confidence === "medium") return styles.confidenceMedium;
  return styles.confidenceLow;
}

export function InboxPage({
  viewer,
  workspace,
  initialCandidateId,
}: {
  viewer: ViewerSummary;
  workspace: InboxWorkspace;
  /** `?candidate=<id>` deep link — resolves only while the row is pending. */
  initialCandidateId?: string;
}) {
  const router = useRouter();
  const { addTransaction, addTransfer, isMutating } = useTransactions({
    initialTransactions: workspace.transactions,
    accounts: workspace.accounts,
    categories: workspace.categories,
    isDemo: viewer.isDemo,
  });

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [candidates, setCandidates] = useState<InboxCandidate[]>([]);
  const [dueCommitments, setDueCommitments] = useState<RecurringCommitment[]>(
    [],
  );
  const [today] = useState(() => todayInVietnam());
  const monthStart = monthStartFromDate(today);
  const [filter, setFilter] = useState<InboxViewFilter>("all");
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<ToastTone | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState("");
  /*
   * Notice + tone always move as a pair so a cleared or replaced notice can
   * never inherit a stale tone. Stable identity: resolveCandidateTarget's
   * useCallback lists it as a dependency.
   */
  const showNotice = useCallback((message: string, tone: ToastTone) => {
    setNotice(message);
    setNoticeTone(tone);
  }, []);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewId, setReviewId] = useState<string | null>(
    initialCandidateId ?? null,
  );
  const [bulkBusy, setBulkBusy] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const candidatesRef = useRef<InboxCandidate[]>(candidates);
  const candidateTargetHandledRef = useRef(false);

  /*
   * Deep link (?candidate=<id>): reviewId starts as the target id so the panel
   * opens as soon as the pending row loads. Once a load succeeds, an id that
   * resolves to nothing pending is cleared and gets one honest notice instead
   * of a silently dead link.
   */
  const resolveCandidateTarget = useCallback(
    (list: InboxCandidate[]) => {
      if (!initialCandidateId || candidateTargetHandledRef.current) return;
      candidateTargetHandledRef.current = true;
      if (!findPendingCandidateTarget(list, initialCandidateId)) {
        setReviewId(null);
        showNotice("Ứng viên không còn chờ xử lý.", "warning");
      }
    },
    [initialCandidateId, showNotice],
  );

  useEffect(() => {
    candidatesRef.current = candidates;
  }, [candidates]);

  /*
   * Due unpaid commitments become virtual Inbox suggestions. Auth reads the
   * server feed + current-month occurrences; demo hydrates the shared seeds
   * with the on-device occurrence map.
   */
  const loadDueCommitments = useCallback(async () => {
    if (viewer.isDemo) {
      const hydrated = await Promise.resolve(
        hydrateCommitmentsWithOccurrences(
          demoCommitmentSeeds(monthStart),
          monthStart,
        ),
      );
      setDueCommitments(hydrated);
      return;
    }
    const result = await listDueCommitmentsAction();
    if (result.ok) setDueCommitments(result.commitments);
  }, [viewer.isDemo, monthStart]);

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      if (opts?.showLoading) {
        setLoadState("loading");
        setErrorMessage("");
      }
      void loadDueCommitments();
      const result = await loadInboxForClient(viewer.isDemo);
      if (!result.ok) {
        setErrorMessage(result.message || "Không tải được Inbox.");
        setLoadState("error");
        return;
      }
      setCandidates(result.candidates);
      candidatesRef.current = result.candidates;
      setErrorMessage("");
      setLoadState("ready");
      resolveCandidateTarget(result.candidates);
    },
    [viewer.isDemo, resolveCandidateTarget, loadDueCommitments],
  );

  useEffect(() => {
    if (initialCandidateId) clearQueryParam("candidate");
    let cancelled = false;
    void (async () => {
      const result = await loadInboxForClient(viewer.isDemo);
      if (cancelled) return;
      await loadDueCommitments();
      if (!result.ok) {
        setErrorMessage(result.message || "Không tải được Inbox.");
        setLoadState("error");
        return;
      }
      setCandidates(result.candidates);
      candidatesRef.current = result.candidates;
      setLoadState("ready");
      resolveCandidateTarget(result.candidates);
    })();
    return () => {
      cancelled = true;
    };
  }, [viewer.isDemo, initialCandidateId, resolveCandidateTarget, loadDueCommitments]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => {
      setNotice("");
      setNoticeTone(undefined);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /*
   * Commitment suggestions are virtual — derived from commitment state each
   * render, never part of `candidates`, so persist/mutation paths never see
   * them. They still flow through annotateCandidates like real candidates.
   */
  const commitmentSuggestions = useMemo(
    () => buildCommitmentSuggestions(dueCommitments, monthStart, today),
    [dueCommitments, monthStart, today],
  );

  const detected = useMemo(
    () =>
      annotateCandidates(
        [...candidates, ...commitmentSuggestions],
        workspace.transactions.map((transaction) => ({
          id: transaction.id,
          kind: transaction.kind,
          amount: transaction.amount,
          occurredOn: transaction.occurredOn,
          note: transaction.note,
          account: transaction.account,
          accountId: transaction.accountId,
        })),
      ),
    [candidates, commitmentSuggestions, workspace.transactions],
  );
  const detectedRef = useRef<DetectedCandidate[]>(detected);

  useEffect(() => {
    detectedRef.current = detected;
  }, [detected]);

  const pendingCount = useMemo(() => countPending(detected), [detected]);

  const readiness = useMemo(
    () =>
      partitionPendingCandidates(
        detected,
        workspace.accounts,
        workspace.categories,
      ),
    [detected, workspace.accounts, workspace.categories],
  );
  const readyIds = useMemo(
    () => readiness.ready.map((item) => item.id),
    [readiness.ready],
  );
  const attentionIds = useMemo(
    () => new Set(readiness.needsAttention.map((item) => item.candidate.id)),
    [readiness.needsAttention],
  );
  const readinessById = useMemo(() => {
    const map = new Map<
      string,
      ReturnType<typeof classifyCandidateReadiness>
    >();
    for (const item of detected) {
      if (item.status !== "pending") continue;
      map.set(
        item.id,
        classifyCandidateReadiness(
          item,
          workspace.accounts,
          workspace.categories,
        ),
      );
    }
    return map;
  }, [detected, workspace.accounts, workspace.categories]);

  const visible = useMemo(() => {
    if (filter === "ready") return sortCandidatesNewest(readiness.ready);
    if (filter === "needs_review") {
      return sortCandidatesNewest(
        detected.filter(
          (item) => item.status === "pending" && attentionIds.has(item.id),
        ),
      );
    }
    return sortCandidatesNewest(filterCandidates(detected, filter));
  }, [attentionIds, detected, filter, readiness.ready]);
  const visibleRef = useRef(visible);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const reviewCandidate = useMemo((): DetectedCandidate | null => {
    const found = detected.find(
      (item) => item.id === reviewId && item.status === "pending",
    );
    return found ?? null;
  }, [detected, reviewId]);

  const activeSelectedIds = useMemo(() => {
    // `detected` includes virtual commitment suggestions so bulk select can
    // reach them; non-approve bulk actions strip suggestion ids downstream.
    const pendingIds = new Set(
      detected
        .filter((item) => item.status === "pending")
        .map((item) => item.id),
    );
    return selectedIds.filter((id) => pendingIds.has(id));
  }, [detected, selectedIds]);

  const safeFocusedIndex =
    visible.length === 0
      ? -1
      : focusedIndex < 0
        ? -1
        : Math.min(focusedIndex, visible.length - 1);
  const focusedIndexRef = useRef(safeFocusedIndex);

  useEffect(() => {
    focusedIndexRef.current = safeFocusedIndex;
  }, [safeFocusedIndex]);

  useEffect(() => {
    if (safeFocusedIndex < 0) return;
    document
      .querySelector<HTMLElement>(`[data-inbox-index="${safeFocusedIndex}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [safeFocusedIndex]);

  async function persist(next: InboxCandidate[], changedIds: string[]) {
    const result = await persistCandidateListForClient(
      viewer.isDemo,
      next,
      changedIds,
    );
    if (!result.ok) {
      setErrorMessage(result.message);
      return false;
    }
    setCandidates(result.candidates);
    candidatesRef.current = result.candidates;
    return true;
  }

  function seedDemo() {
    if (!viewer.isDemo) {
      showNotice("Dữ liệu mẫu chỉ dùng trong chế độ demo trên thiết bị.", "info");
      return;
    }
    const next = sampleCandidates.map((item) => ({ ...item }));
    writeStoredCandidates(next);
    setCandidates(next);
    candidatesRef.current = next;
    setSelectedIds([]);
    showNotice("Đã nạp dữ liệu mẫu vào Inbox.", "success");
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleSelectAllVisible() {
    const visibleIds = visible.map((item) => item.id);
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => activeSelectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !visibleIds.includes(id)),
      );
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of visibleIds) next.add(id);
      return [...next];
    });
  }

  function selectReadySet() {
    setSelectedIds(readyIds);
    setFilter("ready");
    setFocusedIndex(-1);
    showNotice(
      readyIds.length > 0
        ? `Đã chọn ${readyIds.length} ứng viên Sẵn sàng. Chưa có giao dịch nào được ghi sổ.`
        : "Chưa có ứng viên Sẵn sàng để chọn.",
      readyIds.length > 0 ? "success" : "warning",
    );
  }

  /*
   * Commitment suggestions are virtual: approval pays the commitment's
   * declared values through the existing pay path (atomic transaction +
   * occurrence), never through the generic candidate-approval path. The only
   * reviewer-adjustable field is the paid-on date.
   */
  async function postCommitmentSuggestion(
    target: { commitmentId: string; monthStart: string },
    payload: ReviewSubmitPayload,
    bulk: boolean,
  ): Promise<{ ok: boolean; message?: string }> {
    const commitment = dueCommitments.find(
      (item) => item.id === target.commitmentId,
    );
    if (!commitment || commitment.isPaid || commitment.isArchived) {
      return {
        ok: false,
        message: "Khoản định kỳ này đã được ghi hoặc không còn hiệu lực.",
      };
    }
    const suggestion = detectedRef.current.find(
      (item) => item.id === payload.candidateId,
    );
    if (payload.post.mode !== "money" || payload.draft.kind !== "expense") {
      return {
        ok: false,
        message: "Khoản định kỳ chỉ ghi được một khoản chi.",
      };
    }
    if (
      suggestion &&
      commitmentSuggestionEditBlocked(
        suggestion,
        payload.draft,
        workspace.accounts,
        workspace.categories,
      )
    ) {
      return {
        ok: false,
        message:
          "Khoản định kỳ chỉ đổi được ngày ghi — sửa chi tiết tại Khoản định kỳ.",
      };
    }
    const paidOn = payload.draft.occurredOn;

    if (viewer.isDemo) {
      const transactionId = crypto.randomUUID();
      const expense = buildCommitmentPaymentExpense(
        commitment,
        paidOn,
        transactionId,
      );
      writeStoredTransactions(
        appendPaymentExpense(readStoredTransactions(), expense),
      );
      persistPayOccurrence(target.monthStart, commitment.id, transactionId);
      setDueCommitments((current) =>
        markCommitmentPaid(current, commitment.id, transactionId),
      );
    } else {
      const result = await payCommitmentAction(
        target.commitmentId,
        target.monthStart,
        paidOn,
        crypto.randomUUID(),
      );
      if (!result.ok) return { ok: false, message: result.message };
      setDueCommitments((current) =>
        markCommitmentPaid(current, commitment.id, result.transactionId ?? "paid"),
      );
    }

    setSelectedIds((current) =>
      current.filter((id) => id !== payload.candidateId),
    );
    setErrorMessage("");
    showNotice(
      safeUserNotice(
        `Đã ghi khoản định kỳ “${commitment.name}” vào sổ.`,
        "Đã ghi khoản định kỳ vào sổ.",
      ),
      "success",
    );
    trackProductEvent("candidate_approved", {
      kind: "expense",
      source: "commitment",
      edited: suggestion
        ? draftWasEdited(
            suggestion,
            payload.draft,
            workspace.accounts,
            workspace.categories,
          )
        : false,
      flagged:
        suggestion?.possibleDuplicate === true ||
        suggestion?.possibleTransfer === true,
      near_match: suggestion?.nearMatch === true,
      bulk,
    });
    return { ok: true };
  }

  async function postOne(
    payload: ReviewSubmitPayload,
    bulk = false,
  ): Promise<{ ok: boolean; message?: string }> {
    const suggestionTarget = parseCommitmentSuggestionId(payload.candidateId);
    if (suggestionTarget) {
      return postCommitmentSuggestion(suggestionTarget, payload, bulk);
    }
    const post = payload.post;
    const accountId =
      post.mode === "money" ? post.input.accountId : post.input.sourceAccountId;
    const account = workspace.accounts.find((item) => item.id === accountId);
    const category =
      post.mode === "money"
        ? workspace.categories.find((item) => item.id === post.input.categoryId)
        : undefined;

    let result: {
      ok: boolean;
      message?: string;
      transaction?: Transaction;
    };

    const existingDemo = viewer.isDemo
      ? findDemoApprovalTransaction(
          readStoredTransactions(),
          payload.candidateId,
        )
      : null;

    if (existingDemo) {
      result = { ok: true, transaction: existingDemo };
    } else {
      try {
        result =
          post.mode === "transfer"
            ? await addTransfer(post.input)
            : await addTransaction(post.input);
      } catch {
        return { ok: false, message: "Mất kết nối khi ghi sổ. Hãy thử lại." };
      }
    }

    if (!result.ok) {
      return { ok: false, message: result.message || "Không thể ghi sổ." };
    }

    if (
      viewer.isDemo &&
      result.transaction &&
      result.transaction.id !== payload.candidateId
    ) {
      const stored = readStoredTransactions();
      writeStoredTransactions(
        reconcileDemoApprovalTransaction(
          stored,
          payload.candidateId,
          result.transaction.id,
        ),
      );
    }

    const next = markCandidatesStatus(
      candidatesRef.current,
      [payload.candidateId],
      "approved",
      {
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
      },
    );
    const saved = await persist(next, [payload.candidateId]);
    if (!saved) {
      showNotice(
        "Giao dịch đã vào sổ nhưng trạng thái Inbox chưa đồng bộ. Bấm duyệt lại là an toàn: MoneyFlow dùng cùng mã ứng viên và không tạo bản sao.",
        "warning",
      );
      return {
        ok: false,
        message:
          "Giao dịch đã vào sổ; trạng thái Inbox chưa đồng bộ. Hãy thử lại để hoàn tất trạng thái — không tạo giao dịch trùng.",
      };
    }

    setSelectedIds((current) =>
      current.filter((id) => id !== payload.candidateId),
    );
    setErrorMessage("");
    showNotice(
      safeUserNotice(
        `Đã duyệt “${payload.draft.merchant.trim() || "giao dịch"}” vào sổ.`,
        "Đã duyệt giao dịch vào sổ.",
      ),
      "success",
    );
    const reviewed = candidatesRef.current.find(
      (item) => item.id === payload.candidateId,
    );
    const detectedReviewed = detectedRef.current.find(
      (item) => item.id === payload.candidateId,
    );
    trackProductEvent("candidate_approved", {
      kind: payload.draft.kind,
      source: reviewed?.source ?? "unknown",
      edited: reviewed
        ? draftWasEdited(
            reviewed,
            payload.draft,
            workspace.accounts,
            workspace.categories,
          )
        : false,
      flagged: detectedReviewed?.possibleDuplicate === true ||
        detectedReviewed?.possibleTransfer === true,
      near_match: detectedReviewed?.nearMatch === true,
      bulk,
    });
    return { ok: true };
  }

  async function handleApproveReview(
    payload: ReviewSubmitPayload,
  ): Promise<{ ok: boolean; message?: string }> {
    return postOne(payload);
  }

  async function handleReject(candidateId: string) {
    if (parseCommitmentSuggestionId(candidateId)) {
      setReviewId(null);
      showNotice(
        "Khoản định kỳ đến hạn chỉ có thể ghi sổ — đổi hoặc lưu trữ tại trang Khoản định kỳ.",
        "info",
      );
      return;
    }
    const target = candidatesRef.current.find(
      (item) => item.id === candidateId,
    );
    const next = markCandidatesStatus(
      candidatesRef.current,
      [candidateId],
      "rejected",
    );
    if (!(await persist(next, [candidateId]))) return;
    setSelectedIds((current) => current.filter((id) => id !== candidateId));
    setReviewId(null);
    showNotice(
      safeUserNotice(
        `Đã từ chối${target ? ` “${target.merchant}”` : ""}.`,
        "Đã từ chối ứng viên.",
      ),
      "success",
    );
    const detectedTarget = detectedRef.current.find(
      (item) => item.id === candidateId,
    );
    trackProductEvent("candidate_rejected", {
      kind: target?.kind ?? "unknown",
      source: target?.source ?? "unknown",
      possible_duplicate: target?.possibleDuplicate === true,
      flagged: detectedTarget?.possibleDuplicate === true ||
        detectedTarget?.possibleTransfer === true,
      near_match: detectedTarget?.nearMatch === true,
      bulk: false,
    });
  }

  async function handleMarkDuplicate(candidateId: string) {
    if (parseCommitmentSuggestionId(candidateId)) {
      showNotice(
        "Gợi ý định kỳ được đối chiếu tự động — không cần đánh dấu.",
        "info",
      );
      return;
    }
    const result = await updateCandidateForClient(
      viewer.isDemo,
      { id: candidateId, possibleDuplicate: true },
      candidatesRef.current,
    );
    if (!result.ok) {
      showNotice(result.message, "error");
      return;
    }
    setCandidates(result.candidates);
    candidatesRef.current = result.candidates;
    showNotice("Đã đánh dấu có thể trùng. Hãy kiểm tra trước khi duyệt.", "success");
  }

  async function handleBulkApply(payload: BulkApplyPayload) {
    setBulkBusy(true);
    try {
      /*
       * Commitment suggestions are virtual — they cannot be rejected or
       * field-assigned, and must never reach persist paths with unknown ids.
       * Bulk approve still reaches them through postOne's dedicated branch.
       */
      const realIds = payload.selectedIds.filter(
        (id) => !parseCommitmentSuggestionId(id),
      );
      const skippedSuggestions =
        payload.selectedIds.length - realIds.length;
      const skippedNote =
        skippedSuggestions > 0
          ? ` · bỏ qua ${skippedSuggestions} gợi ý định kỳ`
          : "";

      if (payload.action !== "approve" && realIds.length === 0) {
        setSelectedIds([]);
        showNotice(`Không có ứng viên nào để xử lý${skippedNote}.`, "warning");
        return;
      }

      if (payload.action === "reject") {
        const next = markCandidatesStatus(
          candidatesRef.current,
          realIds,
          "rejected",
        );
        if (!(await persist(next, realIds))) return;
        setSelectedIds([]);
        showNotice(
          `Đã từ chối ${realIds.length} ứng viên${skippedNote}.`,
          "success",
        );
        trackProductEvent("candidate_rejected", {
          count: realIds.length,
          bulk: true,
        });
        return;
      }

      if (payload.action === "account") {
        const account = workspace.accounts.find(
          (item) => item.id === payload.accountId,
        );
        if (!account) {
          showNotice("Chưa chọn được tài khoản.", "warning");
          return;
        }
        const next = applyBulkAccount(
          candidatesRef.current,
          realIds,
          account,
        );
        if (!(await persist(next, realIds))) return;
        showNotice(
          `Đã gán tài khoản “${account.name}” cho các ứng viên đã chọn${skippedNote}.`,
          "success",
        );
        trackProductEvent("candidate_field_assigned", {
          field: "account",
          count: realIds.length,
        });
        return;
      }

      if (payload.action === "category") {
        const category = workspace.categories.find(
          (item) => item.id === payload.categoryId,
        );
        if (!category) {
          showNotice("Chưa chọn được danh mục.", "warning");
          return;
        }
        const next = applyBulkCategory(
          candidatesRef.current,
          realIds,
          category,
        );
        if (!(await persist(next, realIds))) return;
        showNotice(
          `Đã gán danh mục “${category.name}” cho các ứng viên cùng loại${skippedNote}.`,
          "success",
        );
        trackProductEvent("candidate_field_assigned", {
          field: "category",
          count: realIds.length,
        });
        return;
      }

      const selected = new Set(payload.selectedIds);
      const latestSelected = detectedRef.current.filter((item) =>
        selected.has(item.id),
      );
      const currentReadiness = partitionPendingCandidates(
        latestSelected,
        workspace.accounts,
        workspace.categories,
      );
      let approved = 0;
      let failed = 0;
      for (const candidate of currentReadiness.ready) {
        const draft = draftFromCandidate(
          candidate,
          workspace.accounts,
          workspace.categories,
        );
        const post = buildLedgerPost(
          draft,
          workspace.accounts,
          workspace.categories,
          approvalIdempotencyKey(candidate.id),
        );
        if (!post.ok) {
          failed += 1;
          continue;
        }
        const result = await postOne(
          {
            candidateId: candidate.id,
            draft,
            post,
          },
          true,
        );
        if (result.ok) approved += 1;
        else failed += 1;
      }

      setSelectedIds([]);
      showNotice(
        `Đã duyệt ${approved}${currentReadiness.needsAttention.length ? ` · Giữ lại ${currentReadiness.needsAttention.length} Cần xem lại` : ""}${failed ? ` · Cần xử lý lại ${failed}` : ""}.`,
        failed ? "warning" : "success",
      );
    } finally {
      setBulkBusy(false);
    }
  }

  const reviewOpen = reviewId != null && reviewCandidate != null;
  const reviewOpenRef = useRef(reviewOpen);

  useEffect(() => {
    reviewOpenRef.current = reviewOpen;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || isEditableKeyboardTarget(event.target))
        return;
      if (reviewOpenRef.current) return;

      const action = resolveInboxShortcut(event.key, {
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
      });
      if (!action) return;

      if (action === "capture") {
        event.preventDefault();
        router.push("/capture");
        return;
      }
      if (action === "quick_add") {
        event.preventDefault();
        router.push("/capture/quick");
        return;
      }
      if (loadState !== "ready") return;

      const list = visibleRef.current;
      if (
        list.length === 0 &&
        (action === "next" || action === "prev" || action === "toggle_select")
      ) {
        return;
      }

      if (action === "next" || action === "prev") {
        event.preventDefault();
        setFocusedIndex((current) =>
          moveFocusIndex(current, action === "next" ? 1 : -1, list.length),
        );
        return;
      }

      if (action === "toggle_select") {
        const index = focusedIndexRef.current;
        if (index < 0 || index >= list.length) {
          showNotice("Dùng J/K chọn hàng rồi X để đánh dấu.", "info");
          return;
        }
        event.preventDefault();
        toggleSelect(list[index]!.id);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loadState, router, showNotice]);

  const allVisibleSelected =
    visible.length > 0 &&
    visible.every((item) => activeSelectedIds.includes(item.id));

  return (
    <AppShell
      viewer={viewer}
      inboxCount={pendingCount}
      notice={notice}
      noticeTone={noticeTone}
      /* No showPrimaryActionOnMobile here, unlike the planning routes. Their
         topbar action is a distinct operation (add a budget, a goal, a
         category); Inbox's is capture, which the global middle tab already
         owns. Exposing both would put the same primary action on one mobile
         viewport twice. Desktop keeps it: the topbar is the only place it
         appears there. */
      primaryAction={{ label: "Capture", href: "/capture", icon: "plus" }}
    >
      <SecondaryWorkspace slot="inbox-workspace">
        <SecondaryHeader
          section="Cần xem"
          title="Giao dịch chờ xử lý"
          description={
            <p>
              Sẵn sàng nghĩa là đủ dữ kiện xác định để duyệt theo nhóm — không
              phải đã ghi sổ. Các ngoại lệ vẫn ở Cần xem lại cho tới khi bạn xử
              lý.
            </p>
          }
          actions={
            <>
              <LinkButton
                href="/capture/paste"
                intent="secondary"
                targetSize="important"
              >
                <Icon name="paste" />
                Dán text / SMS
              </LinkButton>
              <LinkButton
                href="/capture/upload"
                intent="secondary"
                targetSize="important"
              >
                <Icon name="upload" />
                Tải sao kê
              </LinkButton>
              <LinkButton
                href="/rules"
                intent="secondary"
                targetSize="important"
              >
                <Icon name="rules" />
                Quy tắc
              </LinkButton>
              <LinkButton
                href="/imports"
                intent="secondary"
                targetSize="important"
              >
                <Icon name="imports" />
                Lịch sử import
              </LinkButton>
            </>
          }
        />

        <SecondarySummary label="Trạng thái cần xem" slot="inbox-summary">
          <SecondarySummaryItem label="Chờ duyệt" value={pendingCount} />
          <SecondarySummaryItem
            label="Sẵn sàng"
            value={readiness.ready.length}
          />
          <SecondarySummaryItem
            label="Cần xem lại"
            value={readiness.needsAttention.length}
          />
          <SecondarySummaryItem label="Đang hiển thị" value={visible.length} />
          <SecondarySummaryItem
            label="Đã chọn"
            value={activeSelectedIds.length}
          />
        </SecondarySummary>

        {workspace.dataError ? (
          <Alert tone="warning" live="polite">
            <AlertDescription className={styles.alertContent}>
              <Icon name="bell" />
              <span>{workspace.dataError}</span>
            </AlertDescription>
          </Alert>
        ) : null}

        {loadState === "error" ? (
          <Alert tone="error" live="assertive">
            <AlertDescription className={styles.alertWithAction}>
              <span>{errorMessage || "Không tải được Inbox."}</span>
              <Button
                type="button"
                intent="secondary"
                targetSize="important"
                onClick={() => void load({ showLoading: true })}
              >
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <section className={styles.toolbar} aria-label="Bộ lọc Inbox">
          <div
            className={styles.filters}
            role="toolbar"
            aria-label="Lọc ứng viên"
          >
            {FILTERS.map((item) => (
              <Button
                key={item.id}
                type="button"
                intent={filter === item.id ? "primary" : "secondary"}
                targetSize="important"
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
              >
                {item.label}
              </Button>
            ))}
            <Button
              type="button"
              intent="secondary"
              targetSize="important"
              onClick={selectReadySet}
              disabled={loadState !== "ready" || readyIds.length === 0}
            >
              Chọn Sẵn sàng ({readyIds.length})
            </Button>
          </div>
          <p>Sắp xếp: mới nhất</p>
        </section>

        {loadState === "loading" ? (
          <section
            className={styles.loading}
            aria-busy="true"
            aria-label="Đang tải Inbox"
          >
            {Array.from({ length: 7 }, (_, index) => (
              <div className={styles.skeletonRow} key={index}>
                <span />
                <span />
                <span />
                <span />
              </div>
            ))}
          </section>
        ) : null}

        {loadState === "ready" && visible.length === 0 ? (
          <EmptyState
            icon={<Icon name={pendingCount === 0 ? "inbox" : "search"} />}
            title={
              pendingCount === 0 ? "Inbox trống" : "Không có mục khớp bộ lọc"
            }
            description={
              pendingCount === 0
                ? "Dán nội dung, tải file hoặc thêm nhanh để tạo ứng viên chờ duyệt."
                : "Chọn Tất cả hoặc thay đổi bộ lọc để xem các ứng viên còn lại."
            }
            primaryAction={
              pendingCount === 0 ? (
                <LinkButton
                  href="/capture/paste"
                  intent="primary"
                  targetSize="important"
                >
                  Dán nội dung
                </LinkButton>
              ) : (
                <Button
                  type="button"
                  intent="secondary"
                  targetSize="important"
                  onClick={() => setFilter("all")}
                >
                  Xem tất cả
                </Button>
              )
            }
            secondaryAction={
              pendingCount === 0 ? (
                viewer.isDemo ? (
                  <Button
                    type="button"
                    intent="secondary"
                    targetSize="important"
                    onClick={seedDemo}
                  >
                    Nạp dữ liệu mẫu
                  </Button>
                ) : (
                  <LinkButton
                    href="/capture/upload"
                    intent="secondary"
                    targetSize="important"
                  >
                    Tải file
                  </LinkButton>
                )
              ) : undefined
            }
          />
        ) : null}

        {loadState === "ready" && visible.length > 0 ? (
          <section
            className={styles.list}
            aria-label="Danh sách chờ duyệt"
            data-slot="inbox-candidate-list"
          >
            <div className={styles.listHeader} aria-hidden="true">
              <span />
              <span>Ngày</span>
              <span>Mô tả</span>
              <span>Số tiền</span>
              <span>Nguồn</span>
              <span>Độ tin</span>
              <span />
            </div>
            <label className={styles.selectAll}>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
              />
              <span>Chọn tất cả {visible.length} ứng viên đang hiển thị</span>
            </label>
            <ul className={styles.rows}>
              {visible.map((candidate, index) => {
                const selected = activeSelectedIds.includes(candidate.id);
                const focused = safeFocusedIndex === index;
                const rowReadiness = readinessById.get(candidate.id);
                const reasonText =
                  rowReadiness?.state === "needs_attention"
                    ? rowReadiness.reasons.map(attentionReasonLabel).join(" · ")
                    : "";
                return (
                  <li key={candidate.id}>
                    <article
                      data-inbox-index={index}
                      className={[
                        styles.row,
                        candidate.confidence === "low" && styles.lowConfidence,
                        selected && styles.selected,
                        focused && styles.focused,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-current={focused ? "true" : undefined}
                      data-slot="inbox-candidate-row"
                    >
                      <label className={styles.rowCheck}>
                        <span className={styles.srOnly}>
                          Chọn {candidate.merchant}
                        </span>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(candidate.id)}
                        />
                      </label>
                      <time
                        className={styles.date}
                        dateTime={candidate.occurredOn}
                      >
                        {formatCandidateDate(candidate.occurredOn)}
                      </time>
                      <button
                        type="button"
                        className={styles.main}
                        onClick={() => setReviewId(candidate.id)}
                      >
                        <strong>{candidate.merchant}</strong>
                        {candidate.note ||
                        candidate.category ||
                        candidate.account ? (
                          <small>
                            {[
                              candidate.note,
                              candidate.category,
                              candidate.account,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                        ) : null}
                        <span className={styles.flags}>
                          {rowReadiness?.state === "ready" ? (
                            <span>Sẵn sàng</span>
                          ) : (
                            <span>
                              Cần xem lại{reasonText ? ` · ${reasonText}` : ""}
                            </span>
                          )}
                          {candidate.possibleDuplicate ? (
                            <span>
                              Có thể trùng
                              {candidate.duplicateDayDiff
                                ? ` · lệch ${candidate.duplicateDayDiff} ngày`
                                : ""}
                            </span>
                          ) : null}
                          {candidate.possibleTransfer ||
                          candidate.kind === "transfer" ? (
                            <span>
                              Chuyển khoản
                              {candidate.transferDayDiff
                                ? ` · lệch ${candidate.transferDayDiff} ngày`
                                : ""}
                            </span>
                          ) : null}
                        </span>
                      </button>
                      <MoneyValue
                        amount={candidate.amount}
                        mode="kind"
                        kind={candidate.kind}
                        label={`Ứng viên ${candidate.merchant}`}
                        emphasis="strong"
                        className={styles.amount}
                      />
                      <span className={styles.source}>
                        {SOURCE_LABELS[candidate.source]}
                      </span>
                      <span
                        className={`${styles.confidence} ${confidenceTone(candidate.confidence)}`}
                      >
                        {CONFIDENCE_LABELS[candidate.confidence]}
                      </span>
                      <Button
                        type="button"
                        intent="secondary"
                        targetSize="important"
                        onClick={() => setReviewId(candidate.id)}
                        aria-label={`Duyệt ${candidate.merchant}`}
                      >
                        Duyệt
                      </Button>
                    </article>
                  </li>
                );
              })}
            </ul>
            <div className={styles.listFooter}>
              <p>
                Hiển thị {visible.length}/{pendingCount} ứng viên chờ duyệt. Sẵn
                sàng vẫn cần xác nhận; Cần xem lại không đi vào duyệt nhóm.
              </p>
              <p aria-label="Phím tắt Inbox">
                <kbd>J</kbd>/<kbd>K</kbd> di chuyển · <kbd>X</kbd> chọn ·{" "}
                <kbd>C</kbd> Capture · <kbd>N</kbd> Thêm nhanh
              </p>
            </div>
          </section>
        ) : null}

        <InboxBulkBar
          candidates={detected}
          selectedIds={activeSelectedIds}
          accounts={workspace.accounts}
          categories={workspace.categories}
          busy={bulkBusy || isMutating}
          onClear={() => setSelectedIds([])}
          onApply={handleBulkApply}
        />

        <InboxReviewPanel
          key={reviewCandidate?.id ?? "inbox-review-closed"}
          open={reviewOpen}
          candidate={reviewCandidate}
          accounts={workspace.accounts}
          categories={workspace.categories}
          isDemo={viewer.isDemo}
          busy={isMutating}
          onClose={() => setReviewId(null)}
          onApprove={handleApproveReview}
          onReject={handleReject}
          onMarkDuplicate={handleMarkDuplicate}
        />
      </SecondaryWorkspace>
    </AppShell>
  );
}
