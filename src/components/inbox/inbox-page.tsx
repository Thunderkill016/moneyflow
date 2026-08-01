"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icons";
import { InboxBulkBar, type BulkApplyPayload } from "@/components/inbox/inbox-bulk-bar";
import {
  InboxReviewPanel,
  type ReviewSubmitPayload,
} from "@/components/inbox/inbox-review-panel";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import { approveInboxCandidateAction } from "@/app/actions/inbox-approval";
import { useTransactions } from "@/hooks/use-transactions";
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
import {
  loadInboxForClient,
  persistCandidateListForClient,
  updateCandidateForClient,
} from "@/hooks/client-inbox";
import { annotateCandidates, type DetectedCandidate } from "@/lib/inbox/detect";
import {
  isEditableKeyboardTarget,
  moveFocusIndex,
  resolveApproveTargetIds,
  resolveInboxShortcut,
} from "@/lib/inbox/keyboard";
import {
  applyBulkCategory,
  buildLedgerPost,
  draftFromCandidate,
  markCandidatesStatus,
  partitionBulkApprove,
} from "@/lib/inbox/review";
import { formatMoney } from "@/lib/money";
import { safeUserNotice } from "@/lib/safe-log";
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
  { id: "all", label: "T·∫•t c·∫£" },
  { id: "needs_review", label: "‚ö† C·∫ßn xem" },
  { id: "duplicate", label: "Tr√πng?" },
  { id: "transfer", label: "CK?" },
];

function confidenceClass(confidence: InboxCandidate["confidence"]): string {
  if (confidence === "high") return "ok";
  if (confidence === "medium") return "warning";
  return "danger";
}

function moneySign(kind: InboxCandidate["kind"]): string {
  if (kind === "income") return "+";
  if (kind === "transfer") return "‚Üî ";
  return "‚àí";
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
  const router = useRouter();
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
  const [approvalBusy, setApprovalBusy] = useState(false);
  /** Keyboard focus row in the visible list (‚àí1 = none until j/k). */
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const candidatesRef = useRef<InboxCandidate[]>(candidates);
  useEffect(() => {
    candidatesRef.current = candidates;
  }, [candidates]);

  const load = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading ?? false;
      if (showLoading) {
        setLoadState("loading");
        setErrorMessage("");
      }
      const result = await loadInboxForClient(viewer.isDemo);
      if (!result.ok) {
        setErrorMessage(result.message || "Kh√¥ng t·∫£i ƒë∆∞·ª£c inbox");
        setLoadState("error");
        return false;
      }
      setCandidates(result.candidates);
      setErrorMessage("");
      setLoadState("ready");
      return true;
    },
    [viewer.isDemo],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await loadInboxForClient(viewer.isDemo);
      if (cancelled) return;
      if (!result.ok) {
        setErrorMessage(result.message || "Kh√¥ng t·∫£i ƒë∆∞·ª£c inbox");
        setLoadState("error");
        return;
      }
      setCandidates(result.candidates);
      setLoadState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [viewer.isDemo]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const detected = useMemo(
    () =>
      annotateCandidates(
        candidates,
        workspace.transactions.map((tx) => ({
          id: tx.id,
          kind: tx.kind,
          amount: tx.amount,
          occurredOn: tx.occurredOn,
          note: tx.note,
          account: tx.account,
          accountId: tx.accountId,
        })),
      ),
    [candidates, workspace.transactions],
  );

  const pendingCount = useMemo(() => countPending(detected), [detected]);
  const visible = useMemo(
    () => sortCandidatesNewest(filterCandidates(detected, filter)),
    [detected, filter],
  );
  const visibleRef = useRef(visible);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const reviewCandidate = useMemo((): DetectedCandidate | null => {
    const found = detected.find((item) => item.id === reviewId && item.status === "pending");
    return found ?? null;
  }, [detected, reviewId]);

  const activeSelectedIds = useMemo(() => {
    const pendingIds = new Set(candidates.filter((item) => item.status === "pending").map((item) => item.id));
    return selectedIds.filter((id) => pendingIds.has(id));
  }, [candidates, selectedIds]);

  const activeSelectedIdsRef = useRef(activeSelectedIds);
  useEffect(() => {
    activeSelectedIdsRef.current = activeSelectedIds;
  }, [activeSelectedIds]);

  /** Display focus index (clamped if list shrank); ‚àí1 until j/k used. */
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

  // Scroll focused row into view (keyboard j/k).
  useEffect(() => {
    if (safeFocusedIndex < 0) return;
    const el = document.querySelector<HTMLElement>(
      `[data-inbox-index="${safeFocusedIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [safeFocusedIndex]);

  async function persist(next: InboxCandidate[], changedIds: string[]) {
    const result = await persistCandidateListForClient(viewer.isDemo, next, changedIds);
    if (!result.ok) {
      setErrorMessage(result.message);
      setNotice(result.message);
      return false;
    }
    setCandidates(result.candidates);
    return true;
  }

  function seedDemo() {
    if (!viewer.isDemo) {
      setNotice("D·ªØ li·ªáu m·∫´u ch·ªâ d√πng ·ªü ch·∫ø ƒë·ªô demo tr√™n thi·∫øt b·ªã.");
      return;
    }
    const next = sampleCandidates.map((item) => ({ ...item }));
    writeStoredCandidates(next);
    setCandidates(next);
    setSelectedIds([]);
    setNotice("ƒê√£ n·∫°p d·ªØ li·ªáu m·∫´au v√†o Inbox.");
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleSelectAllVisible() {
    const visibleIds = visible.map((item) => item.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => activeSelectedIds.includes(id));
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

  async function postOne(
    payload: ReviewSubmitPayload,
    options?: { allowHeuristicDuplicate?: boolean },
  ): Promise<{ ok: boolean; message?: string }> {
    const post = payload.post;

    if (!viewer.isDemo) {
      setApprovalBusy(true);
      try {
        const result = await approveInboxCandidateAction({
          candidateId: payload.candidateId,
          kind: payload.draft.kind,
          accountId: post.mode === "money" ? post.input.accountId : post.input.sourceAccountId,
          categoryId: post.mode === "money" ? post.input.categoryId : null,
          destinationAccountId: post.mode === "transfer" ? post.input.destinationAccountId : null,
          amount: post.input.amount,
          occurredOn: post.input.occurredOn,
          note: post.input.note,
          idempotencyKey: post.input.idempotencyKey,
          allowHeuristicDuplicate: options?.allowHeuristicDuplicate === true,
        });
        if (!result.ok) return result;

        const loaded = await load({ showLoading: false });
        if (!loaded) {
          router.refresh();
          return {
            ok: false,
            message: "ƒê√£ duy·ªát nh∆∞ng ch∆∞a t·∫£i l·∫°i ƒë∆∞·ª£c Inbox. H√£y l√†m m·ªõi trang.",
          };
        }
        setSelectedIds((current) => current.filter((id) => id !== payload.candidateId));
        setNotice(
          safeUserNotice(
            `ƒê√£ duy·ªát ‚Äú${payload.draft.merchant.trim() || "giao d·ªãch"}‚Äù v√†o s·ªï.`,
            "ƒê√£ duy·ªát giao d·ªãch v√†o s·ªï.",
          ),
        );
        router.refresh();
        return { ok: true };
      } catch {
        return { ok: false, message: "M·∫•t k·∫øt n·ªëi khi duy·ªát Inbox. H√£y th·ª≠ l·∫°i." };
      } finally {
        setApprovalBusy(false);
      }
    }

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
      return { ok: false, message: "M·∫•t k·∫øt n·ªëi khi ghi s·ªï. H√£y th·ª≠ l·∫°i." };
    }

    if (!result.ok) {
      return { ok: false, message: result.message || "Kh√¥ng th·ªÉ ghi s·ªï." };
    }

    const next = markCandidatesStatus(
      candidatesRef.current,
      [payload.candidateId],
      "approved",
      {
        kind: payload.draft.kind,
        amount: payload.draft.amount,
        merchant: payload.draft.merchant.trim() || "Kh√¥ng r√µ",
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
      return { ok: false, message: "ƒê√£ ghi s·ªï nh∆∞ng ch∆∞a c·∫≠p nh·∫≠t ƒë∆∞·ª£c tr·∫°ng th√°i Inbox." };
    }
    candidatesRef.current = next;
    setSelectedIds((current) => current.filter((id) => id !== payload.candidateId));
    setNotice(
      safeUserNotice(
        `ƒê√£ duy·ªát ‚Äú${payload.draft.merchant.trim() || "giao d·ªãch"}‚Äù v√†o s·ªï.`,
        "ƒê√£ duy·ªát giao d·ªãch v√†o s·ªï.",
      ),
    );
    return { ok: true };
  }

  async function handleApproveReview(
    payload: ReviewSubmitPayload,
  ): Promise<{ ok: boolean; message?: string }> {
    return postOne(payload, {
      allowHeuristicDuplicate: payload.draft.possibleDuplicate === true,
    });
  }

  async function handleReject(candidateId: string) {
    const target = candidatesRef.current.find((item) => item.id === candidateId);
    const next = markCandidatesStatus(candidatesRef.current, [candidateId], "rejected");
    const saved = await persist(next, [candidateId]);
    if (!saved) return;
    candidatesRef.current = next;
    setSelectedIds((current) => current.filter((id) => id !== candidateId));
    setReviewId(null);
    setNotice(
      safeUserNotice(
        `ƒê√£ t·ª´ ch·ªëi${target ? ` ‚Äú${target.merchant}‚Äù` : ""}.`,
        "ƒê√£ t·ª´ ch·ªëi.",
      ),
    );
  }

  async function handleMarkDuplicate(candidateId: string) {
    const result = await updateCandidateForClient(
      viewer.isDemo,
      { id: candidateId, possibleDuplicate: true },
      candidates,
    );
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setCandidates(result.candidates);
    setNotice("ƒê√£ ƒë√°nh d·∫•u c√≥ th·ªÉ tr√πng. H√£y ki·ªÉm tra tr∆∞·ªõc khi duy·ªát.");
  }

  async function handleBulkApply(payload: BulkApplyPayload) {
    setBulkBusy(true);
    try {
      if (payload.action === "reject") {
        const next = markCandidatesStatus(
          candidatesRef.current,
          payload.selectedIds,
          "rejected",
        );
        const saved = await persist(next, payload.selectedIds);
        if (!saved) return;
        candidatesRef.current = next;
        setSelectedIds([]);
        setNotice(`ƒê√£ t·ª´ ch·ªëi ${payload.selectedIds.length} m·ª•c.`);
        return;
      }

      if (payload.action === "category") {
        const category = workspace.categories.find((item) => item.id === payload.categoryId);
        if (!category) {
          setNotice("Ch∆∞a ch·ªçn ƒë∆∞·ª£c danh m·ª•c.");
          return;
        }
        const next = applyBulkCategory(
          candidatesRef.current,
          payload.selectedIds,
          category,
        );
        const saved = await persist(next, payload.selectedIds);
        if (!saved) return;
        candidatesRef.current = next;
        setNotice(`ƒê√£ g√°n danh m·ª•c ‚Äú${category.name}‚Äù (ch·ªâ d√≤ng kh·ªõp lo·∫°i thu/chi).`);
        return;
      }

      // approve ‚Äî never auto-post low conf without opt-in (partitionBulkApprove)
      const list = candidatesRef.current;
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
        const result = await postOne(
          {
            candidateId: candidate.id,
            draft,
            post,
          },
          { allowHeuristicDuplicate: false },
        );
        if (result.ok) approved += 1;
        else failed += 1;
      }

      setSelectedIds([]);
      const skipNote =
        skippedLow.length > 0
          ? ` ¬∑ B·ªè qua ${skippedLow.length} d√≤ng conf th·∫•p (kh√¥ng opt-in)`
          : "";
      const failNote = failed > 0 ? ` ¬∑ L·ªói ${failed}` : "";
      setNotice(`ƒê√£ duy·ªát ${approved}${skipNote}${failNote}.`);
    } finally {
      setBulkBusy(false);
    }
  }

  const handleBulkApplyRef = useRef(handleBulkApply);
  const bulkBusyRef = useRef(bulkBusy);
  const isMutatingRef = useRef(isMutating);
  const approvalBusyRef = useRef(approvalBusy);
  const reviewOpen = reviewId != null && reviewCandidate != null;
  const reviewOpenRef = useRef(reviewOpen);
  useEffect(() => {
    handleBulkApplyRef.current = handleBulkApply;
    bulkBusyRef.current = bulkBusy;
    isMutatingRef.current = isMutating;
    approvalBusyRef.current = approvalBusy;
    reviewOpenRef.current = reviewOpen;
  });

  // Desktop power keys: j/k ¬∑ x ¬∑ a ¬∑ c ¬∑ n (wireframes Keyboard section).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (isEditableKeyboardTarget(event.target)) return;
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
      if (list.length === 0 && (action === "next" || action === "prev" || action === "toggle_select")) {
        return;
      }

      if (action === "next" || action === "prev") {
        event.preventDefault();
        const dir = action === "next" ? 1 : -1;
        setFocusedIndex((current) => moveFocusIndex(current, dir, list.length));
        return;
      }

      if (action === "toggle_select") {
        const idx = focusedIndexRef.current;
        if (idx < 0 || idx >= list.length) {
          setNotice("D√πng J/K ch·ªçn h√†ng r·ªìi X ƒë·ªÉ ƒë√°nh d·∫•u.");
          return;
        }
        event.preventDefault();
        const id = list[idx]!.id;
        setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
        return;
      }

      if (action === "approve") {
        if (bulkBusyRef.current || isMutatingRef.current || approvalBusyRef.current) return;
        const focused =
          focusedIndexRef.current >= 0 && focusedIndexRef.current < list.length
            ? list[focusedIndexRef.current]!.id
            : null;
        const ids = resolveApproveTargetIds(activeSelectedIdsRef.current, focused);
        if (ids.length === 0) {
          setNotice("Ch·ªçn m·ª•c b·∫±ng X (h·∫∑c J/K r·ªìi A) ƒë·ªÉ duy·ªát.");
          return;
        }
        event.preventDefault();
        void handleBulkApplyRef.current({
          action: "approve",
          selectedIds: ids,
          includeLowConfidence: false,
          categoryId: "",
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loadState, router]);

  const allVisibleSelected =
    visible.length > 0 && visible.every((item) => activeSelectedIds.includes(item.id));

  return (
    <AppShell
      viewer={viewer}
      inboxCount={pendingCount}
      notice={notice}
    >
      <main className="dashboard inbox-workspace">
        <section className="transactions-title-row inbox-title-row">
          <div>
            <p className="eyebrow">H·ªôp th∆∞ t√†i ch√≠nh</p>
            <h1>Inbox</h1>
            <p>
              {loadState === "ready"
                ? `C·∫ßn duy·ªát: ${pendingCount}`
                : "Duy·ªát giao d·ªãch tr∆∞·ªõc khi v√†o s·ªï."}
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
            <span>{workspace.dataError} ‚Äî v·∫´n duy·ªát ƒë∆∞·ª£c b·∫±ng d·ªØ li·ªáu demo tr√™n thi·∫øt b·ªã.</span>
          </div>
        ) : null}

        {loadState === "error" && (
          <div className="data-alert" role="alert">
            <Icon name="bell" />
            <span>{errorMessage || "Kh√¥ng t·∫£i ƒë∆∞·ª£c inbox"}</span>
            <button
              type="button"
              className="secondary-button"
              onClick={() => load({ showLoading: true })}
            >
              Th·ª≠ l·∫°i
            </button>
          </div>
        )}

        <section className="inbox-toolbar panel" aria-label="B·ªô l·ªçc Inbox">
          <div className="filter-group inbox-filter-chips" role="toolbar" aria-label="L·ªçc ·ª©ng vi√™n">
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
          <p className="inbox-sort-hint">S·∫Øp x·∫øp: M·ªõi nh·∫•t</p>
        </section>

        {loadState === "loading" && (
          <section className="inbox-list panel" aria-busy="true" aria-label="ƒêang t·∫£i Inbox">
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
                title="Inbox tr·ªëng"
                description="Ch∆∞a c√≥ giao d·ªãch ch·ªù duy·ªát. H√£y d√°n text, t·∫£i file ho·∫∑c th√™m nhanh."
                actionLabel="D√°n text"
                actionHref="/capture/paste"
                secondaryLabel="T·∫£i file"
                secondaryHref="/capture/upload"
              />
            ) : (
              <EmptyState
                icon="search"
                title="Kh√¥ng c√≥ m·ª•c kh·ªõp b·ªô l·ªçc"
                description="Th·ª≠ ch·ªçn ‚ÄúT·∫•t c·∫£‚Äù ho·∫∑c ƒë·ªïi b·ªô l·ªçc kh√°c."
                actionLabel="Xem t·∫•t c·∫£"
                onAction={() => setFilter("all")}
              />
            )}
            {pendingCount === 0 && (
              <div className="inbox-empty-extra">
                <Link className="secondary-button" href="/capture/quick">
                  Th√™m nhanh
                </Link>
                {viewer.isDemo && (
                  <button type="button" className="secondary-button" onClick={seedDemo}>
                    N·∫°p d·ªØ li·ªáu m·∫´u
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {loadState === "ready" && visible.length > 0 && (
          <section className="inbox-list panel" aria-label="Danh s√°ch ch·ªù duy·ªát">
            <div className="inbox-list-header" aria-hidden="true">
              <span className="inbox-col-check">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  aria-label="Ch·ªçn t·∫•t c·∫£ ƒëang hi·ªÉn th·ªã"
                />
              </span>
              <span>Ng√†y</span>
              <span>M√¥ t·∫£</span>
              <span>S·ªë ti·ªÅn</span>
              <span>Ngu·ªìn</span>
              <span>ƒê·ªô tin</span>
              <span />
            </div>
            <ul className="inbox-rows">
              {visible.map((candidate, index) => {
                const selected = activeSelectedIds.includes(candidate.id);
                const focused = safeFocusedIndex === index;
                return (
                  <li key={candidate.id}>
                    <article
                      data-inbox-index={index}
                      className={`inbox-row${candidate.confidence === "low" ? " low-conf" : ""}${selected ? " selected" : ""}${focused ? " focused" : ""}`}
                      aria-current={focused ? "true" : undefined}
                    >
                      <label className="inbox-col-check">
                        <span className="sr-only">Ch·ª≠n {candidate.merchant}</span>
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
                              .join(" ¬∑ ")}
                          </small>
                        )}
                        {candidate.possibleDuplicate ? (
                          <span className="preview-chip sm warning">Tr√πng?</span>
                        ) : null}
                        {candidate.possibleTransfer ? (
                          <span className="preview-chip sm info">CK?</span>
                        ) : null}
                        {candidate.kind === "transfer" && !candidate.possibleTransfer ? (
                          <span className="preview-chip sm info">CK</span>
                        ) : null}
                      </button>
                      <strong
                        className={`inbox-row-amount font-mono ${moneyClass(candidate.kind)}`}
                      >
                        {moneySign(candidate.kind)}
                        {formatMoney(candidate.amount)}
                      </strong>
                      <span className="preview-chip sm source-badge" title="Ngu·ªìn">
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
                          aria-label={`Duy·ªát ${candidate.merchant}`}
                        >
                          Duy·ªát
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
            <p className="inbox-list-footer">
              Hi·ªÉn th·ªã {visible.length} / {pendingCount} m·ª•c ch·ªù duy·ªát. Ch·ªçn nhi·ªÅu ƒë·ªÉ duy·ªát h√†ng
              lo·∫°t; conf th·∫•p kh√¥ng t·ª± v√†o s·ªï.
            </p>
            <p className="inbox-kbd-hint" aria-label="Ph√≠m t·∫Øt Inbox">
              <span className="inbox-kbd-label">Ph√≠m t·∫Øt:</span>{" "}
              <kbd>J</kbd>/<kbd>K</kbd> di chuy·ªÉn ¬∑ <kbd>X</kbd> ch·ªçn ¬∑ <kbd>A</kbd> duy·ªát ¬∑{" "}
              <kbd>C</kbd> Capture ¬∑ <kbd>N</kbd> Th√™m nhanh
            </p>
          </section>
        )}

        <InboxBulkBar
          candidates={candidates}
          selectedIds={activeSelectedIds}
         ÿ]Y€‹öY\œ^›€‹ö‹‹XŸKòÿ]Y€‹öY\ﬂBàù\ﬁO^ÿù[–ù\ﬁH\”]]][ô»\õ›ò[ù\ﬁ_Bà€ê€X\è^ 
HOàŸ]Ÿ[X›YY ◊J_Bà€ê\O^⁄[ôPù[–\_BàœÇÇà[òõﬁô]öY]‘[ô[àŸ^O^‹ô]öY]–ÿ[ôY]OÀöYœ»ö[òõﬁ\ô]öY]ÀX€‹ŸYüBà‹[è^‹ô]öY]“YOHù[	âàô]öY]–ÿ[ôY]HOHù[Bàÿ[ôY]O^‹ô]öY]–ÿ[ôY]_BàXÿ€›[ùœ^›€‹ö‹‹XŸKòXÿ€›[ùﬂBàÿ]Y€‹öY\œ^›€‹ö‹‹XŸKòÿ]Y€‹öY\ﬂBàù\ﬁO^⁄\”]]][ô»\õ›ò[ù\ﬁ_Bà€ê€‹ŸO^ 
HOàŸ]ô]öY]“Y
ù[
_Bà€ê\õ›ôO^⁄[ôP\õ›ôTô]öY]ﬂBà€îôZôX›^⁄[ôTôZôX›Bà€ìX\ö—\Xÿ]O^⁄[ôSX\ö—\Xÿ]_BàœÇà€XZ[èÇà–\⁄[Çà
N¬üB