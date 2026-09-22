"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, IconButton, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SecondaryReviewDialog } from "@/components/secondary/secondary-layout";
import { type ViewerSummary } from "@/components/user-chip";
import { useTransactions } from "@/hooks/use-transactions";
import {
  activeDatePreset,
  datePresetRange,
  type DatePreset,
} from "@/lib/date-presets";
import { formatMoney } from "@/lib/money";
import {
  categoryMeta,
  type AccountOption,
  type CategoryOption,
  type CreateSplitExpenseInput,
  type CreateTransactionInput,
  type CreateTransferInput,
  type Transaction,
  type TransactionReviewStatus,
  type UpdateMoneyTransactionInput,
  type UpdateTransferInput,
} from "@/lib/sample-data";
import { GHI_CHI_TIEU_HREF, GHI_CHI_TIEU_LABEL } from "@/lib/nav-ia";
import {
  buildRunningBalance,
  resolveRegisterBalanceScope,
} from "@/lib/running-balance";
import { safeUserNotice } from "@/lib/safe-log";
import { isSplitExpense } from "@/lib/splits";
import { derivePayeeSuggestions } from "@/lib/quick-add-defaults";
import {
  filterTransactions,
  normalizeTransactionAmountInput,
  transactionFilterError,
  transactionFilterSearch,
  type TransactionFilterKind,
  type TransactionReviewFilter,
} from "@/lib/transaction-filters";
import {
  TRANSACTION_PAGE_SIZE,
  nextVisibleCount,
  windowTransactions,
} from "@/lib/transaction-list";
import {
  evaluateBulkCategorySelection,
  getTransactionReviewStatus,
  planBulkDateChange,
  planBulkDelete,
  summarizeBulkSkips,
  type BulkSkippedRow,
} from "@/lib/transaction-review";
import {
  TRANSACTION_OPEN_MISSING_NOTICE,
  resolveTransactionOpenTarget,
} from "@/lib/transactions/open-target";
import { transferRowSubtitle } from "@/lib/transfers";
import { clearQueryParam } from "@/lib/url-params";
import styles from "./transactions-workspace.module.css";

const AddTransactionDialog = dynamic(
  () =>
    import("@/components/add-transaction-dialog").then(
      (module) => module.AddTransactionDialog,
    ),
  { ssr: false },
);
const TransferDialog = dynamic(
  () =>
    import("@/components/transfer-dialog").then(
      (module) => module.TransferDialog,
    ),
  { ssr: false },
);
const SplitExpenseDialog = dynamic(
  () =>
    import("@/components/split-expense-dialog").then(
      (module) => module.SplitExpenseDialog,
    ),
  { ssr: false },
);
const EditTransactionDialog = dynamic(
  () =>
    import("@/components/edit-transaction-dialog").then(
      (module) => module.EditTransactionDialog,
    ),
  { ssr: false },
);

const DELETE_UNDO_MS = 8000;
const NOTICE_MS = 3500;

const DATE_PRESETS: DatePreset[] = ["week", "month", "lastMonth"];
const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  week: "Tuần này",
  month: "Tháng này",
  lastMonth: "Tháng trước",
};

type KindFilter = TransactionFilterKind;
export type TransactionsWorkspaceVariant = "ledger" | "timeline";

type TransactionsWorkspaceData = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  totalBalance: number;
  today: string;
  dataError: string | null;
  reviewFeatureAvailable?: boolean;
};

type TransactionsWorkspaceProps = {
  viewer: ViewerSummary;
  workspace: TransactionsWorkspaceData;
  variant?: TransactionsWorkspaceVariant;
  initialQuery?: string;
  initialCategory?: string;
  initialAccount?: string;
  initialKind?: KindFilter;
  initialReview?: TransactionReviewFilter;
  initialFromDate?: string;
  initialToDate?: string;
  initialMinAmount?: string;
  initialMaxAmount?: string;
  /** `?open=<id>` deep link — resolved once against owner-scoped rows. */
  initialOpenId?: string;
};

type DayGroup = {
  date: string;
  relativeDate: string;
  displayDate: string;
  transactions: Transaction[];
  netForDay: number;
};

function kindLabel(value: KindFilter) {
  if (value === "expense") return "Khoản chi";
  if (value === "income") return "Khoản thu";
  if (value === "transfer") return "Chuyển tiền";
  return "Tất cả";
}

function iconTone(kind: Transaction["kind"]) {
  if (kind === "income") return styles.iconIncome;
  if (kind === "transfer") return styles.iconTransfer;
  return styles.iconExpense;
}

export function TransactionsWorkspace({
  viewer,
  workspace,
  variant = "ledger",
  initialQuery = "",
  initialCategory = "all",
  initialAccount = "all",
  initialKind = "all",
  initialReview = "all",
  initialFromDate = "",
  initialToDate = "",
  initialMinAmount = "",
  initialMaxAmount = "",
  initialOpenId,
}: TransactionsWorkspaceProps) {
  const isTimeline = variant === "timeline";
  const reviewFeatureAvailable =
    viewer.isDemo || workspace.reviewFeatureAvailable === true;
  const {
    transactions,
    addTransaction,
    addTransfer,
    addSplitExpense,
    updateTransaction,
    deleteTransaction,
    restoreTransaction,
    bulkSetReviewStatus,
    bulkUpdateCategory,
    bulkUpdateDate,
    bulkDeleteTransactions,
    isMutating,
  } = useTransactions({
    initialTransactions: workspace.transactions,
    accounts: workspace.accounts,
    categories: workspace.categories,
    isDemo: viewer.isDemo,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const openConsumedRef = useRef(false);
  const [recentSaved, setRecentSaved] = useState<Transaction | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [kind, setKind] = useState<KindFilter>(initialKind);
  const [account, setAccount] = useState(initialAccount);
  const [category, setCategory] = useState(initialCategory);
  const [review, setReview] = useState<TransactionReviewFilter>(
    reviewFeatureAvailable ? initialReview : "all",
  );
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [minAmountInput, setMinAmountInput] = useState(initialMinAmount);
  const [maxAmountInput, setMaxAmountInput] = useState(initialMaxAmount);
  const [selectionState, setSelectionState] = useState<{
    filterKey: string;
    ids: string[];
  }>({ filterKey: "", ids: [] });
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkCategoryReview, setBulkCategoryReview] =
    useState<CategoryOption | null>(null);
  const [bulkDateInput, setBulkDateInput] = useState("");
  const [bulkDateReview, setBulkDateReview] = useState<{
    occurredOn: string;
    eligible: Transaction[];
    skipped: BulkSkippedRow[];
  } | null>(null);
  const [bulkDeleteReview, setBulkDeleteReview] = useState<{
    eligible: Transaction[];
    skipped: BulkSkippedRow[];
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [notice, setNotice] = useState("");
  const [pendingUndo, setPendingUndo] = useState<Transaction[] | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const pendingUndoRef = useRef<Transaction[] | null>(null);

  /*
   * Deep link (?open=<id>): resolve once against the owner-scoped rows, then
   * strip the param so a refresh does not reopen a consumed target. Split and
   * recurring rows land on the same notice their row action shows; stale or
   * foreign ids land on the missing notice — never on the wrong dialog. In
   * demo mode the ledger swaps to device storage after mount, so resolution
   * waits for that settled list before judging an id missing.
   */
  const mountTransactionsRef = useRef(transactions);
  const ledgerSettled = !viewer.isDemo || transactions !== mountTransactionsRef.current;
  useEffect(() => {
    if (!initialOpenId || !ledgerSettled || openConsumedRef.current) return;
    clearQueryParam("open");
    const timer = window.setTimeout(() => {
      if (openConsumedRef.current) return;
      openConsumedRef.current = true;
      const resolution = resolveTransactionOpenTarget(initialOpenId, transactions);
      if (resolution.type === "edit") setEditing(resolution.transaction);
      else if (resolution.type === "notice") showNotice(resolution.message);
      else showNotice(TRANSACTION_OPEN_MISSING_NOTICE);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep-link resolution fires once against the settled list
  }, [initialOpenId, transactions, ledgerSettled]);
  const expenseCategoryCount = workspace.categories.filter(
    (item) => item.kind === "expense",
  ).length;

  function clearNoticeTimer() {
    if (noticeTimerRef.current != null) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
  }

  function showNotice(
    message: string,
    ms = NOTICE_MS,
    preserveRecentSaved = false,
  ) {
    clearNoticeTimer();
    setPendingUndo(null);
    pendingUndoRef.current = null;
    if (!preserveRecentSaved) setRecentSaved(null);
    setNotice(message);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice("");
      setRecentSaved(null);
      noticeTimerRef.current = null;
    }, ms);
  }

  useEffect(() => () => clearNoticeTimer(), []);

  useEffect(() => {
    const params = transactionFilterSearch({
      query,
      kind,
      account,
      category,
      review,
      fromDate,
      toDate,
      minAmountInput,
      maxAmountInput,
    });
    const serialized = params.toString();
    const nextLocation = serialized
      ? `${window.location.pathname}?${serialized}`
      : window.location.pathname;
    const currentLocation = `${window.location.pathname}${window.location.search}`;
    if (nextLocation !== currentLocation) {
      window.history.replaceState(null, "", nextLocation);
    }
  }, [
    account,
    category,
    fromDate,
    kind,
    maxAmountInput,
    minAmountInput,
    query,
    review,
    toDate,
  ]);

  const filterKey = `${kind}\0${account}\0${category}\0${review}\0${query}\0${fromDate}\0${toDate}\0${minAmountInput}\0${maxAmountInput}`;
  const selectedIds = useMemo(
    () => (selectionState.filterKey === filterKey ? selectionState.ids : []),
    [filterKey, selectionState.filterKey, selectionState.ids],
  );

  function setSelectedIds(next: string[] | ((current: string[]) => string[])) {
    setSelectionState((current) => {
      const currentIds = current.filterKey === filterKey ? current.ids : [];
      return {
        filterKey,
        ids: typeof next === "function" ? next(currentIds) : next,
      };
    });
  }

  const [pageState, setPageState] = useState({
    filterKey,
    visibleCount: TRANSACTION_PAGE_SIZE,
  });
  const visibleCount =
    pageState.filterKey === filterKey
      ? pageState.visibleCount
      : TRANSACTION_PAGE_SIZE;

  const filterError = transactionFilterError({
    query,
    kind,
    account,
    category,
    review,
    fromDate,
    toDate,
    minAmountInput,
    maxAmountInput,
  });

  /**
   * How many of the *secondary* filters are active.
   *
   * Search and kind stay primary and always visible, so they are excluded here.
   * The count drives both the disclosure's open state and its summary, which is
   * what keeps a query-string-restored filter from hiding behind a closed group.
   */
  const secondaryFilterCount = [
    account !== "all",
    category !== "all",
    review !== "all",
    fromDate !== "",
    toDate !== "",
    minAmountInput.trim() !== "",
    maxAmountInput.trim() !== "",
  ].filter(Boolean).length;
  const hasSecondaryFilter = secondaryFilterCount > 0;

  /**
   * The disclosure latches open; it never closes itself.
   *
   * Deriving `open` straight from `hasSecondaryFilter` also auto-*closed* the panel:
   * clearing a filter back to its neutral value collapsed the group under the user's
   * hands, taking focus away from the control they were operating. Opening on demand
   * is the useful half of that behaviour, so only the opening is automatic.
   *
   * The latch is seeded from the initial filter state and thereafter carried by
   * `onToggle` rather than an effect. Seeding matters: the browser fires no toggle
   * event for a panel that is already open on mount, so a query-string-restored
   * filter would otherwise slam shut the moment it was cleared.
   */
  const [userOpenedFilters, setUserOpenedFilters] =
    useState(hasSecondaryFilter);
  const filtersOpen = userOpenedFilters || hasSecondaryFilter;

  const filtered = useMemo(
    () =>
      filterTransactions(transactions, {
        query,
        kind,
        account,
        category,
        review,
        fromDate,
        toDate,
        minAmountInput,
        maxAmountInput,
      }),
    [
      account,
      category,
      fromDate,
      kind,
      maxAmountInput,
      minAmountInput,
      query,
      review,
      toDate,
      transactions,
    ],
  );

  const listWindow = useMemo(
    () => windowTransactions(filtered, visibleCount),
    [filtered, visibleCount],
  );
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleIds = useMemo(
    () => listWindow.visible.map((transaction) => transaction.id),
    [listWindow.visible],
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
  const bulkCategorySelection = useMemo(
    () => evaluateBulkCategorySelection(transactions, selectedIds),
    [selectedIds, transactions],
  );
  const payeeSuggestions = useMemo(
    () => derivePayeeSuggestions(transactions),
    [transactions],
  );
  const bulkCategoryOptions = useMemo(
    () =>
      bulkCategorySelection.ok
        ? workspace.categories.filter(
            (item) => item.kind === bulkCategorySelection.kind,
          )
        : [],
    [bulkCategorySelection, workspace.categories],
  );
  const effectiveBulkCategoryId = bulkCategoryOptions.some(
    (item) => item.id === bulkCategoryId,
  )
    ? bulkCategoryId
    : "";

  const filteredTotals = useMemo(() => {
    const income = filtered
      .filter((item) => item.kind === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const expense = filtered
      .filter((item) => item.kind === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    return { income, expense, net: income - expense };
  }, [filtered]);

  /*
   * Running balance — only when the ledger is scoped to exactly one account.
   * The column is computed over the account's whole register (not the filtered
   * subset), anchored at the account's current balance and reconciled against
   * the mount-time ledger so session mutations stay consistent. Every row
   * shows "Số dư sau giao dịch" — the balance right after that transaction —
   * so search/kind/date filters can hide rows but never change a number.
   */
  const registerScope = useMemo(
    () => resolveRegisterBalanceScope(account, workspace.accounts),
    [account, workspace.accounts],
  );
  const runningBalance = useMemo(
    () =>
      registerScope
        ? buildRunningBalance(
            transactions,
            mountTransactionsRef.current,
            registerScope,
            workspace.accounts,
          )
        : null,
    [registerScope, transactions, workspace.accounts],
  );

  /**
   * Ledger-wide queue depth, not the filtered count: the number stays honest
   * even while the needs_review filter itself is active, matching the figure
   * the dashboard's attention chip reports.
   */
  const needsReviewCount = useMemo(
    () =>
      transactions.filter(
        (item) => getTransactionReviewStatus(item) === "needs_review",
      ).length,
    [transactions],
  );

  const activePreset = activeDatePreset(fromDate, toDate, workspace.today);

  function applyDatePreset(preset: DatePreset) {
    if (activePreset === preset) {
      setFromDate("");
      setToDate("");
      return;
    }
    const range = datePresetRange(preset, workspace.today);
    setFromDate(range.from);
    setToDate(range.to);
  }

  const grouped = useMemo<DayGroup[]>(() => {
    const groups: DayGroup[] = [];
    for (const transaction of listWindow.visible) {
      let group = groups.find((item) => item.date === transaction.occurredOn);
      if (!group) {
        const parts = transaction.occurredOn.split("-");
        const displayDate =
          parts.length === 3
            ? `${parts[2]}/${parts[1]}/${parts[0]}`
            : transaction.occurredOn;
        group = {
          date: transaction.occurredOn,
          relativeDate: transaction.relativeDate,
          displayDate,
          transactions: [],
          netForDay: 0,
        };
        groups.push(group);
      }
      group.transactions.push(transaction);
      if (transaction.kind === "income") group.netForDay += transaction.amount;
      if (transaction.kind === "expense") group.netForDay -= transaction.amount;
    }
    return groups;
  }, [listWindow.visible]);

  const hasActiveFilters =
    query.trim().length > 0 ||
    kind !== "all" ||
    account !== "all" ||
    category !== "all" ||
    review !== "all" ||
    Boolean(fromDate) ||
    Boolean(toDate) ||
    Boolean(minAmountInput) ||
    Boolean(maxAmountInput);

  function loadMore() {
    setPageState({
      filterKey,
      visibleCount: nextVisibleCount(visibleCount),
    });
  }

  function clearFilters() {
    setQuery("");
    setKind("all");
    setAccount("all");
    setCategory("all");
    setReview("all");
    setFromDate("");
    setToDate("");
    setMinAmountInput("");
    setMaxAmountInput("");
    setSelectedIds([]);
    window.history.replaceState(null, "", window.location.pathname);
  }

  function toggleTransactionSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleVisibleSelection() {
    setSelectedIds((current) => {
      const currentSet = new Set(current);
      if (visibleIds.every((id) => currentSet.has(id))) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return [...new Set([...current, ...visibleIds])];
    });
  }

  async function handleBulkReview(reviewStatus: TransactionReviewStatus) {
    const result = await bulkSetReviewStatus({
      ids: selectedIds,
      reviewStatus,
    });
    if (!result.ok) {
      showNotice(
        safeUserNotice(result.message, "Không cập nhật được trạng thái."),
      );
      return;
    }
    showNotice(
      reviewStatus === "reviewed"
        ? `Đã đánh dấu ${result.updatedIds.length} giao dịch là đã duyệt.`
        : `Đã chuyển ${result.updatedIds.length} giao dịch sang cần kiểm tra.`,
    );
    setSelectedIds([]);
  }

  function handleBulkCategory() {
    const target = workspace.categories.find(
      (item) => item.id === effectiveBulkCategoryId,
    );
    if (!target || !bulkCategorySelection.ok) {
      showNotice(
        bulkCategorySelection.ok
          ? "Hãy chọn danh mục mới."
          : bulkCategorySelection.message,
      );
      return;
    }
    setBulkCategoryReview(target);
  }

  async function confirmBulkCategory() {
    const target = bulkCategoryReview;
    if (!target) return;

    const result = await bulkUpdateCategory({
      ids: selectedIds,
      categoryId: target.id,
    });
    if (!result.ok) {
      setBulkCategoryReview(null);
      showNotice(safeUserNotice(result.message, "Không đổi được danh mục."));
      return;
    }
    setBulkCategoryReview(null);
    showNotice(`Đã đổi danh mục cho ${result.updatedIds.length} giao dịch.`);
    setSelectedIds([]);
    setBulkCategoryId("");
  }

  /**
   * Bulk "đổi ngày": the plan partitions the selection into rows that can move
   * and rows the single-transaction rules lock (recurring, split lines, a
   * no-op date). Locked rows surface in the confirm dialog and result notice
   * as grouped skip reasons instead of blocking the whole batch.
   */
  function handleBulkDate() {
    const plan = planBulkDateChange(transactions, selectedIds, bulkDateInput);
    if (!plan.ok) {
      showNotice(plan.message);
      return;
    }
    if (plan.eligible.length === 0) {
      showNotice(
        `Không có giao dịch nào đổi được. Bỏ qua: ${summarizeBulkSkips(plan.skipped)}.`,
      );
      return;
    }
    setBulkDateReview({
      occurredOn: bulkDateInput,
      eligible: plan.eligible,
      skipped: plan.skipped,
    });
  }

  async function confirmBulkDate() {
    const review = bulkDateReview;
    if (!review) return;

    const result = await bulkUpdateDate({
      ids: selectedIds,
      occurredOn: review.occurredOn,
    });
    if (!result.ok) {
      setBulkDateReview(null);
      showNotice(safeUserNotice(result.message, "Không đổi được ngày."));
      return;
    }
    setBulkDateReview(null);
    showNotice(
      result.skipped.length
        ? `Đã đổi ngày ${result.updatedIds.length} giao dịch. Bỏ qua ${result.skipped.length}: ${summarizeBulkSkips(result.skipped)}.`
        : `Đã đổi ngày cho ${result.updatedIds.length} giao dịch.`,
    );
    // Rows that were skipped keep their selection so the notice's grouped
    // reasons map back to the exact rows still waiting on the user.
    const updatedIdSet = new Set(result.updatedIds);
    setSelectedIds((current) =>
      current.filter((id) => !updatedIdSet.has(id)),
    );
    setBulkDateInput("");
  }

  /**
   * Bulk soft delete mirrors `handleDelete`: recurring rows are skipped
   * client-side; every other row goes through `soft_delete_money_transaction`
   * so RLS and the reconciled-entry trigger apply unchanged. Deleted rows keep
   * the same 8-second undo window a single delete gets.
   */
  function handleBulkDelete() {
    const plan = planBulkDelete(transactions, selectedIds);
    if (!plan.ok) {
      showNotice(plan.message);
      return;
    }
    if (plan.eligible.length === 0) {
      showNotice(
        `Không xóa được giao dịch nào. Bỏ qua: ${summarizeBulkSkips(plan.skipped)}.`,
      );
      return;
    }
    setBulkDeleteReview({ eligible: plan.eligible, skipped: plan.skipped });
  }

  async function confirmBulkDelete() {
    const review = bulkDeleteReview;
    if (!review) return;

    const result = await bulkDeleteTransactions({ ids: selectedIds });
    if (!result.ok) {
      setBulkDeleteReview(null);
      showNotice(safeUserNotice(result.message, "Không xóa được giao dịch."));
      return;
    }
    setBulkDeleteReview(null);
    const deletedIds = new Set(result.updatedIds);
    const snapshots = review.eligible.filter((transaction) =>
      deletedIds.has(transaction.id),
    );
    showDeleteNotice(
      snapshots.length
        ? result.skipped.length
          ? `Đã xóa ${snapshots.length} giao dịch. Bỏ qua ${result.skipped.length}: ${summarizeBulkSkips(result.skipped)}.`
          : `Đã xóa ${snapshots.length} giao dịch.`
        : `Không xóa được giao dịch nào. Bỏ qua: ${summarizeBulkSkips(result.skipped)}.`,
      snapshots,
    );
  }

  async function handleAdd(input: CreateTransactionInput) {
    const result = await addTransaction(input);
    if (result.ok && result.transaction) {
      setDialogOpen(false);
      setRecentSaved(result.transaction);
      showNotice(
        safeUserNotice(
          `Đã thêm ${result.transaction.note}.`,
          "Đã thêm giao dịch.",
        ),
        NOTICE_MS,
        true,
      );
    }
    return result;
  }

  function handleDelete(transaction: Transaction) {
    if (transaction.isRecurringPayment) {
      showNotice("Khoản này được quản lý ở trang Định kỳ.");
      return;
    }
    setDeleteTarget(transaction);
  }

  /**
   * Shared 8-second undo window for single and bulk soft deletes — the notice
   * keeps the deleted snapshots so "Hoàn tác" can restore each via the same
   * restore RPC the single-row path uses.
   */
  function showDeleteNotice(message: string, snapshots: Transaction[]) {
    setSelectedIds((current) =>
      current.filter((id) => !snapshots.some((item) => item.id === id)),
    );
    clearNoticeTimer();
    setRecentSaved(null);
    pendingUndoRef.current = snapshots.length ? snapshots : null;
    setPendingUndo(snapshots.length ? snapshots : null);
    setNotice(safeUserNotice(message, "Đã xóa giao dịch."));
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice("");
      setPendingUndo(null);
      pendingUndoRef.current = null;
      noticeTimerRef.current = null;
    }, DELETE_UNDO_MS);
  }

  async function confirmDelete() {
    const transaction = deleteTarget;
    if (!transaction) return;

    const result = await deleteTransaction(transaction.id);
    if (!result.ok) {
      setDeleteTarget(null);
      showNotice(safeUserNotice(result.message, "Không xóa được giao dịch."));
      return;
    }
    setDeleteTarget(null);
    showDeleteNotice(`Đã xóa ${transaction.note}.`, [transaction]);
  }

  async function handleUndoDelete() {
    const snapshots = pendingUndoRef.current;
    if (!snapshots?.length) return;
    clearNoticeTimer();
    setPendingUndo(null);
    pendingUndoRef.current = null;
    setNotice("");

    let restored = 0;
    let lastFailure = "";
    for (const snapshot of snapshots) {
      const result = await restoreTransaction(snapshot);
      if (result.ok) restored += 1;
      else lastFailure = result.message;
    }
    if (restored === snapshots.length) {
      showNotice(
        snapshots.length === 1
          ? "Đã khôi phục giao dịch."
          : `Đã khôi phục ${restored} giao dịch.`,
      );
    } else {
      showNotice(
        safeUserNotice(
          lastFailure,
          "Không khôi phục được hết. Một số giao dịch vẫn đang ẩn.",
        ) +
          ` Đã khôi phục ${restored}/${snapshots.length} giao dịch.`,
      );
    }
  }

  async function handleUpdate(
    input: UpdateMoneyTransactionInput | UpdateTransferInput,
  ) {
    const result = await updateTransaction(input);
    if (result.ok) {
      setEditing(null);
      showNotice(
        "Đã cập nhật giao dịch. Bộ lọc hiện tại vẫn được giữ; giao dịch sẽ ẩn nếu không còn khớp.",
      );
    }
    return result;
  }

  async function handleTransfer(input: CreateTransferInput) {
    const result = await addTransfer(input);
    if (result.ok) {
      setTransferOpen(false);
      showNotice("Đã chuyển ví thành công.");
    }
    return result;
  }

  async function handleSplit(input: CreateSplitExpenseInput) {
    const result = await addSplitExpense(input);
    if (result.ok) {
      setSplitOpen(false);
      showNotice(
        safeUserNotice(
          result.transaction
            ? `Đã chia: ${result.transaction.note}.`
            : "Đã chia khoản chi.",
          "Đã chia khoản chi.",
        ),
      );
    }
    return result;
  }

  function handleEditClick(transaction: Transaction) {
    if (isSplitExpense(transaction)) {
      showNotice("Khoản chia danh mục: xóa rồi tạo lại nếu cần sửa các dòng.");
      return;
    }
    setEditing(transaction);
  }

  function editRecentSaved() {
    if (!recentSaved) return;
    clearNoticeTimer();
    setNotice("");
    setRecentSaved(null);
    setEditing(recentSaved);
  }

  return (
    <AppShell
      viewer={viewer}
      searchBar={{
        value: query,
        onChange: setQuery,
        placeholder: isTimeline
          ? "Tìm trong dòng thời gian..."
          : "Tìm giao dịch...",
      }}
      primaryAction={
        isTimeline
          ? {
              label: GHI_CHI_TIEU_LABEL,
              href: GHI_CHI_TIEU_HREF,
              icon: "plus",
            }
          : {
              label: GHI_CHI_TIEU_LABEL,
              onClick: () => setDialogOpen(true),
              disabled: Boolean(workspace.dataError),
              icon: "plus",
            }
      }
      fabAction={
        isTimeline
          ? {
              label: GHI_CHI_TIEU_LABEL,
              href: GHI_CHI_TIEU_HREF,
              icon: "plus",
            }
          : {
              label: GHI_CHI_TIEU_LABEL,
              onClick: () => setDialogOpen(true),
              disabled: Boolean(workspace.dataError),
              icon: "plus",
            }
      }
      notice={notice}
      noticeAction={
        pendingUndo
          ? {
              label: "Hoàn tác",
              onClick: () => void handleUndoDelete(),
              disabled: isMutating,
            }
          : recentSaved
            ? {
                label: "Sửa",
                onClick: editRecentSaved,
                disabled: isMutating,
              }
            : undefined
      }
    >
      <main
        className={`${styles.workspace}${isTimeline ? ` ${styles.timeline}` : ""}`}
        data-slot="transactions-workspace"
      >
        {workspace.dataError ? (
          <Alert tone="error" live="assertive" className={styles.dataAlert}>
            <AlertDescription className={styles.alertContent}>
              <Icon name="bell" />
              <span>{workspace.dataError}</span>
            </AlertDescription>
          </Alert>
        ) : null}

        <section
          className={styles.titleRow}
          aria-labelledby="transactions-title"
        >
          <div className={styles.titleCopy}>
            <p className={styles.eyebrow}>
              {isTimeline ? "Sổ đã duyệt" : "Dòng tiền của bạn"}
            </p>
            <h1 id="transactions-title">
              {isTimeline ? "Dòng thời gian (đã duyệt)" : "Sổ giao dịch"}
            </h1>
            <p>
              {isTimeline
                ? "Các giao dịch đã được duyệt — nguồn tin cậy cho số dư và báo cáo."
                : "Lọc giao dịch, kiểm tra dữ liệu và sửa các lỗi phân loại lặp lại."}
            </p>
          </div>
          <div className={styles.headingActions}>
            {isTimeline ? (
              <LinkButton
                href="/reports/export?period=month"
                intent="secondary"
                targetSize="important"
              >
                <Icon name="archive" /> Export
              </LinkButton>
            ) : (
              <>
                <Button
                  type="button"
                  intent="secondary"
                  targetSize="important"
                  onClick={() => setSplitOpen(true)}
                  disabled={
                    expenseCategoryCount < 2 ||
                    workspace.accounts.length < 1 ||
                    Boolean(workspace.dataError)
                  }
                >
                  <Icon name="spark" /> Chia khoản chi
                </Button>
                <Button
                  type="button"
                  intent="secondary"
                  targetSize="important"
                  onClick={() => setTransferOpen(true)}
                  disabled={
                    workspace.accounts.length < 2 ||
                    Boolean(workspace.dataError)
                  }
                >
                  <Icon name="arrows" /> Chuyển tiền ví
                </Button>
                {!workspace.dataError &&
                (expenseCategoryCount < 2 || workspace.accounts.length < 2) ? (
                  <small className={styles.actionHint}>
                    {workspace.accounts.length < 1
                      ? "Tạo tài khoản trước để chia khoản chi hoặc chuyển tiền giữa ví."
                      : workspace.accounts.length < 2 && expenseCategoryCount < 2
                        ? "Chuyển tiền ví cần hai tài khoản; chia khoản chi cần hai danh mục chi tiêu."
                        : workspace.accounts.length < 2
                          ? "Chuyển tiền ví cần ít nhất hai tài khoản."
                          : "Chia khoản chi cần ít nhất hai danh mục chi tiêu."}
                  </small>
                ) : null}
              </>
            )}
          </div>
        </section>

        {workspace.dataError ? null : (
        <section
          className={styles.summary}
          aria-label="Tóm tắt theo bộ lọc"
          aria-live="polite"
          data-slot="ledger-summary"
        >
          <div className={styles.summaryItem}>
            <p>{isTimeline ? "Đã duyệt" : "Giao dịch"}</p>
            <strong className={styles.summaryCount}>{filtered.length}</strong>
          </div>
          <div className={styles.summaryItem}>
            <p>Tiền vào</p>
            <MoneyValue
              amount={filteredTotals.income}
              mode="kind"
              kind="income"
              label="Tiền vào"
            />
          </div>
          <div className={styles.summaryItem}>
            <p>Tiền ra</p>
            <MoneyValue
              amount={filteredTotals.expense}
              mode="kind"
              kind="expense"
              label="Tiền ra"
            />
          </div>
          <div className={styles.summaryItem}>
            <p>Còn lại</p>
            <MoneyValue
              amount={filteredTotals.net}
              mode="signed"
              label="Còn lại"
            />
          </div>
        </section>
        )}

        <section className={styles.manager} aria-label="Danh sách giao dịch">
          <div className={styles.toolbar} data-slot="ledger-filters">
            <label className={styles.searchField}>
              <span>Tìm giao dịch</span>
              <div className={styles.searchControl}>
                <Icon name="search" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm theo ghi chú, danh mục..."
                  aria-label={
                    isTimeline
                      ? "Tìm trong dòng thời gian"
                      : "Tìm trong giao dịch"
                  }
                />
              </div>
            </label>

            <div className={styles.kindFilter} aria-label="Lọc theo loại">
              {(["all", "expense", "income", "transfer"] as KindFilter[]).map(
                (value) => (
                  <Button
                    type="button"
                    unstyled
                    targetSize="important"
                    key={value}
                    className={`${styles.kindButton}${
                      kind === value ? ` ${styles.kindButtonActive}` : ""
                    }`}
                    onClick={() => setKind(value)}
                    aria-pressed={kind === value}
                  >
                    {kindLabel(value)}
                  </Button>
                ),
              )}
            </div>

            {/*
              A queue chip, not a fifth kind segment: review is a different axis
              and combines with kind (an expense can also need review), so it
              stays a standalone toggle on its own toolbar row.
            */}
            {reviewFeatureAvailable ? (
              <Button
                type="button"
                intent="secondary"
                targetSize="important"
                className={`${styles.reviewChip}${
                  review === "needs_review"
                    ? ` ${styles.reviewChipActive}`
                    : ""
                }`}
                onClick={() =>
                  setReview(review === "needs_review" ? "all" : "needs_review")
                }
                aria-pressed={review === "needs_review"}
              >
                Cần kiểm tra ·{" "}
                <strong className={styles.reviewChipCount}>
                  {needsReviewCount}
                </strong>
              </Button>
            ) : null}

            {/*
              Secondary filters stay fully available but stop consuming the screen
              before a single record is visible. On a phone the unopened toolbar was
              777px tall — nearly two screens of controls ahead of the ledger.

              This is a disclosure, not a removal: every control keeps its label, id
              and behaviour, and the group opens automatically whenever any of these
              filters is active, so a query-string-restored filter is never hidden.
            */}
            <details
              className={styles.moreFilters}
              open={filtersOpen}
              onToggle={(event) =>
                setUserOpenedFilters(
                  (event.currentTarget as HTMLDetailsElement).open,
                )
              }
            >
              <summary className={styles.moreFiltersSummary}>
                <span>Bộ lọc khác</span>
                {secondaryFilterCount > 0 ? (
                  <span className={styles.moreFiltersCount}>
                    {secondaryFilterCount} đang bật
                  </span>
                ) : null}
              </summary>
              <div className={styles.moreFiltersBody}>
                <div className={styles.selectGrid}>
                  <label className={styles.field}>
                    <span>Danh mục</span>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      aria-label="Lọc theo danh mục"
                    >
                      <option value="all">Mọi danh mục</option>
                      {workspace.categories.map((item) => (
                        <option value={item.name} key={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Tài khoản</span>
                    <select
                      value={account}
                      onChange={(event) => setAccount(event.target.value)}
                      aria-label="Lọc theo tài khoản"
                    >
                      <option value="all">Mọi tài khoản</option>
                      {workspace.accounts.map((item) => (
                        <option value={item.name} key={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {reviewFeatureAvailable ? (
                    <label className={styles.field}>
                      <span>Trạng thái</span>
                      <select
                        value={review}
                        onChange={(event) =>
                          setReview(
                            event.target.value as TransactionReviewFilter,
                          )
                        }
                        aria-label="Lọc theo trạng thái kiểm tra"
                      >
                        <option value="all">Mọi trạng thái</option>
                        <option value="needs_review">Cần kiểm tra</option>
                        <option value="reviewed">Đã duyệt</option>
                      </select>
                    </label>
                  ) : null}
                </div>

                <div
                  className={styles.rangeFilters}
                  aria-label="Lọc theo thời gian và số tiền"
                >
                  {/*
                    One-tap ranges — typing two dates on a phone is the slowest
                    part of this panel. Chips derive from the server-resolved
                    today; tapping the active preset clears the range again.
                  */}
                  <div
                    className={styles.datePresets}
                    role="group"
                    aria-label="Khoảng ngày nhanh"
                  >
                    {DATE_PRESETS.map((preset) => (
                      <Button
                        type="button"
                        unstyled
                        targetSize="important"
                        key={preset}
                        className={`${styles.kindButton}${
                          activePreset === preset
                            ? ` ${styles.kindButtonActive}`
                            : ""
                        }`}
                        onClick={() => applyDatePreset(preset)}
                        aria-pressed={activePreset === preset}
                      >
                        {DATE_PRESET_LABELS[preset]}
                      </Button>
                    ))}
                  </div>
                  <label className={styles.field}>
                    <span>Từ ngày</span>
                    <input
                      type="date"
                      value={fromDate}
                      max={toDate || undefined}
                      onChange={(event) => setFromDate(event.target.value)}
                      aria-label="Từ ngày"
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Đến ngày</span>
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate || undefined}
                      onChange={(event) => setToDate(event.target.value)}
                      aria-label="Đến ngày"
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Từ số tiền</span>
                    <input
                      inputMode="numeric"
                      autoComplete="off"
                      value={minAmountInput}
                      onChange={(event) =>
                        setMinAmountInput(
                          normalizeTransactionAmountInput(event.target.value),
                        )
                      }
                      placeholder="Ví dụ: 100.000"
                      aria-label="Số tiền tối thiểu"
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Đến số tiền</span>
                    <input
                      inputMode="numeric"
                      autoComplete="off"
                      value={maxAmountInput}
                      onChange={(event) =>
                        setMaxAmountInput(
                          normalizeTransactionAmountInput(event.target.value),
                        )
                      }
                      placeholder="Ví dụ: 500.000"
                      aria-label="Số tiền tối đa"
                    />
                  </label>
                </div>
              </div>
            </details>

            {filterError ? (
              <Alert
                tone="error"
                live="assertive"
                className={styles.filterAlert}
              >
                <AlertDescription>{filterError}</AlertDescription>
              </Alert>
            ) : null}

            {hasActiveFilters ? (
              <Button
                type="button"
                intent="quiet"
                targetSize="important"
                className={styles.resetButton}
                onClick={clearFilters}
              >
                Xóa bộ lọc
              </Button>
            ) : null}
          </div>

          {reviewFeatureAvailable && filtered.length ? (
            <div
              className={styles.selectionToolbar}
              aria-label="Chọn giao dịch"
            >
              <Button
                type="button"
                intent="secondary"
                targetSize="important"
                onClick={toggleVisibleSelection}
                disabled={isMutating || visibleIds.length === 0}
              >
                {allVisibleSelected ? "Bỏ chọn đang hiện" : "Chọn đang hiện"}
              </Button>
              <span aria-live="polite">
                Đã chọn <strong>{selectedIds.length}</strong> giao dịch
              </span>
              {selectedIds.length ? (
                <Button
                  type="button"
                  intent="quiet"
                  targetSize="important"
                  onClick={() => setSelectedIds([])}
                  disabled={isMutating}
                >
                  Bỏ chọn tất cả
                </Button>
              ) : null}
            </div>
          ) : null}

          {reviewFeatureAvailable && selectedIds.length ? (
            <section className={styles.bulkBar} aria-label="Thao tác hàng loạt">
              <div className={styles.bulkReviewActions}>
                <strong>{selectedIds.length} giao dịch</strong>
                <Button
                  type="button"
                  intent="secondary"
                  targetSize="important"
                  pending={isMutating}
                  pendingLabel="Đang cập nhật..."
                  onClick={() => void handleBulkReview("reviewed")}
                >
                  Đánh dấu đã duyệt
                </Button>
                <Button
                  type="button"
                  intent="secondary"
                  targetSize="important"
                  pending={isMutating}
                  pendingLabel="Đang cập nhật..."
                  onClick={() => void handleBulkReview("needs_review")}
                >
                  Chuyển sang cần kiểm tra
                </Button>
              </div>
              <div className={styles.bulkCategoryActions}>
                <label className={styles.field}>
                  <span>Danh mục mới</span>
                  <select
                    value={effectiveBulkCategoryId}
                    onChange={(event) => setBulkCategoryId(event.target.value)}
                    disabled={isMutating || !bulkCategorySelection.ok}
                    aria-label="Danh mục mới cho giao dịch đã chọn"
                  >
                    <option value="">Chọn danh mục</option>
                    {bulkCategoryOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  intent="primary"
                  targetSize="important"
                  pending={isMutating}
                  pendingLabel="Đang đổi..."
                  onClick={handleBulkCategory}
                  disabled={
                    !bulkCategorySelection.ok || !effectiveBulkCategoryId
                  }
                >
                  Đổi danh mục
                </Button>
              </div>
              {!bulkCategorySelection.ok ? (
                <p className={styles.bulkReason}>
                  {bulkCategorySelection.message}
                </p>
              ) : (
                <p className={styles.bulkHint}>
                  Chỉ danh mục của từng giao dịch thay đổi; số tiền, ngày và
                  tài khoản giữ nguyên.
                </p>
              )}

              {/*
                Đổi ngày and Xóa run per row through the same RPCs as the
                single-row actions, so transfers and reconciled entries keep
                their locks; locked rows are skipped with a reason rather than
                blocking the batch.
              */}
              <div className={styles.bulkEditActions}>
                <label className={styles.field}>
                  <span>Ngày mới</span>
                  <input
                    type="date"
                    value={bulkDateInput}
                    onChange={(event) => setBulkDateInput(event.target.value)}
                    disabled={isMutating}
                    aria-label="Ngày mới cho giao dịch đã chọn"
                  />
                </label>
                <Button
                  type="button"
                  intent="secondary"
                  targetSize="important"
                  pending={isMutating}
                  pendingLabel="Đang đổi..."
                  onClick={handleBulkDate}
                  disabled={!bulkDateInput || isMutating}
                >
                  Đổi ngày
                </Button>
                <Button
                  type="button"
                  intent="destructive"
                  targetSize="important"
                  pending={isMutating}
                  pendingLabel="Đang xóa..."
                  onClick={handleBulkDelete}
                  disabled={isMutating}
                >
                  <Icon name="trash" /> Xóa đã chọn
                </Button>
              </div>
            </section>
          ) : null}

          {!reviewFeatureAvailable && !viewer.isDemo ? (
            <Alert
              tone="info"
              live="polite"
              className={styles.featureUnavailable}
            >
              <AlertDescription>
                Kiểm tra và sửa hàng loạt sẽ xuất hiện sau khi migration tương
                ứng được bật.
              </AlertDescription>
            </Alert>
          ) : null}

          {grouped.length ? (
            <div className={styles.list} data-slot="ledger-list">
              <div
                className={`${styles.listHeader}${
                  runningBalance ? ` ${styles.listHeaderWithBalance}` : ""
                }`}
                aria-hidden="true"
              >
                <span>Giao dịch</span>
                <span>Số tiền</span>
                {runningBalance ? <span>Số dư sau giao dịch</span> : null}
                <span>Thao tác</span>
              </div>

              {grouped.map((group) => (
                <section
                  className={styles.dayGroup}
                  key={group.date}
                  data-slot="ledger-day-group"
                  aria-labelledby={`transaction-day-${group.date}`}
                >
                  <header className={styles.dayHeader}>
                    <h2 id={`transaction-day-${group.date}`}>
                      {group.relativeDate}, {group.displayDate}
                    </h2>
                    <span className={styles.dayTotal}>
                      <span>Tổng:</span>{" "}
                      <MoneyValue
                        amount={group.netForDay}
                        mode="signed"
                        label={`Tổng ${group.displayDate}`}
                      />
                    </span>
                  </header>

                  {group.transactions.map((transaction) => {
                    const meta =
                      categoryMeta[transaction.category] ??
                      categoryMeta["Thu nhập khác"];
                    const reviewStatus =
                      getTransactionReviewStatus(transaction);
                    const balance = runningBalance?.balanceAfter.get(
                      transaction.id,
                    );
                    return (
                      <article
                        className={`${styles.row}${
                          runningBalance ? ` ${styles.rowWithBalance}` : ""
                        }`}
                        key={transaction.id}
                        data-slot="ledger-row"
                        data-transaction-id={transaction.id}
                      >
                        <span
                          className={`${styles.transactionIcon} ${iconTone(transaction.kind)}`}
                        >
                          <Icon name={meta.icon as IconName} />
                        </span>
                        <div className={styles.detail}>
                          {reviewFeatureAvailable ? (
                            <div className={styles.rowReviewLine}>
                              <label className={styles.rowSelection}>
                                <input
                                  type="checkbox"
                                  checked={selectedSet.has(transaction.id)}
                                  onChange={() =>
                                    toggleTransactionSelection(transaction.id)
                                  }
                                  disabled={isMutating}
                                  aria-label={`Chọn giao dịch ${transaction.note}`}
                                />
                                <span>Chọn</span>
                              </label>
                              <span
                                className={`${styles.reviewBadge} ${
                                  reviewStatus === "needs_review"
                                    ? styles.needsReview
                                    : styles.reviewed
                                }`}
                              >
                                {reviewStatus === "needs_review"
                                  ? "Cần kiểm tra"
                                  : "Đã duyệt"}
                              </span>
                            </div>
                          ) : null}
                          <strong>{transaction.note}</strong>
                          <small>
                            {transaction.kind === "transfer"
                              ? transferRowSubtitle(
                                  transaction.account,
                                  transaction.destinationAccount,
                                )
                              : isSplitExpense(transaction)
                                ? `${transaction.category} · ${transaction.account} · ${transaction
                                    .splits!.map(
                                      (line) =>
                                        `${line.category} ${formatMoney(line.amount)}`,
                                    )
                                    .join(" · ")}`
                                : `${transaction.payee ? `${transaction.payee} · ` : ""}${transaction.category} · ${transaction.account}`}
                            {transaction.isRecurringPayment
                              ? " · Từ lịch định kỳ"
                              : ""}
                          </small>
                          <time dateTime={transaction.occurredAt}>
                            {transaction.relativeDate}
                          </time>
                        </div>
                        <MoneyValue
                          amount={transaction.amount}
                          mode="kind"
                          kind={transaction.kind}
                          emphasis="strong"
                          className={styles.amount}
                        />
                        {runningBalance ? (
                          balance == null ? (
                            <span
                              className={styles.balanceMissing}
                              title="Không tính được số dư cho dòng này"
                              aria-label="Không tính được số dư cho dòng này"
                            >
                              —
                            </span>
                          ) : (
                            <MoneyValue
                              amount={balance}
                              mode="plain"
                              currencyCode={runningBalance.currencyCode}
                              className={styles.balance}
                              label={`Số dư sau giao dịch ${transaction.note}`}
                            />
                          )
                        ) : null}
                        {transaction.isRecurringPayment ? (
                          <LinkButton
                            href="/commitments"
                            unstyled
                            targetSize="important"
                            className={styles.recurringLock}
                            title="Quản lý ở trang Định kỳ"
                            aria-label={`Quản lý ${transaction.note} ở trang Định kỳ`}
                          >
                            <Icon name="lock" />
                          </LinkButton>
                        ) : (
                          <span className={styles.rowActions}>
                            <IconButton
                              type="button"
                              variant="ghost"
                              className={styles.editButton}
                              onClick={() => handleEditClick(transaction)}
                              disabled={isMutating}
                              aria-label={
                                isSplitExpense(transaction)
                                  ? `Khoản chia ${transaction.note} — xóa rồi tạo lại để sửa`
                                  : `Sửa giao dịch ${transaction.note}`
                              }
                            >
                              <Icon name="edit" />
                            </IconButton>
                            <IconButton
                              type="button"
                              variant="ghost"
                              className={styles.deleteButton}
                              onClick={() => handleDelete(transaction)}
                              disabled={isMutating}
                              aria-label={`Xóa giao dịch ${transaction.note}`}
                            >
                              <Icon name="trash" />
                            </IconButton>
                          </span>
                        )}
                      </article>
                    );
                  })}
                </section>
              ))}

              {listWindow.hasMore ||
              listWindow.total > TRANSACTION_PAGE_SIZE ? (
                <div className={styles.loadMore} role="status">
                  <p>
                    Đang hiện <strong>{listWindow.shown}</strong> /{" "}
                    <strong>{listWindow.total}</strong> giao dịch
                    {listWindow.hasMore
                      ? ` · còn ${listWindow.remaining} nữa`
                      : ""}
                  </p>
                  {listWindow.hasMore ? (
                    <Button
                      type="button"
                      intent="secondary"
                      targetSize="important"
                      onClick={loadMore}
                    >
                      Tải thêm{" "}
                      {Math.min(TRANSACTION_PAGE_SIZE, listWindow.remaining)}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : transactions.length ? (
            <EmptyState
              icon={<Icon name="search" />}
              title="Không tìm thấy giao dịch"
              description={filterError ?? "Thử đổi từ khóa hoặc bỏ bớt bộ lọc."}
              primaryAction={
                <Button
                  type="button"
                  intent="secondary"
                  targetSize="important"
                  onClick={clearFilters}
                >
                  Xóa bộ lọc
                </Button>
              }
              className={styles.emptyState}
            />
          ) : (
            <EmptyState
              icon={<Icon name={isTimeline ? "timeline" : "arrows"} />}
              title={
                workspace.dataError
                  ? "Không tải được giao dịch"
                  : "Chưa có giao dịch"
              }
              description={
                workspace.dataError
                  ? "Dữ liệu của bạn vẫn được bảo vệ. Thử tải lại trang hoặc quay lại Tổng quan."
                  : isTimeline
                    ? "Ghi khoản chi hoặc thu để dòng tiền hiện trên timeline."
                    : "Ghi khoản chi đầu tiên để bắt đầu theo dõi dòng tiền."
              }
              primaryAction={
                workspace.dataError ? (
                  <LinkButton
                    href="/dashboard"
                    intent="secondary"
                    targetSize="important"
                  >
                    Về Tổng quan
                  </LinkButton>
                ) : (
                  <Button
                    type="button"
                    intent="secondary"
                    targetSize="important"
                    onClick={() => setDialogOpen(true)}
                  >
                    {GHI_CHI_TIEU_LABEL}
                  </Button>
                )
              }
              className={styles.emptyState}
            />
          )}
        </section>
      </main>

      <AddTransactionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={handleAdd}
        accounts={workspace.accounts}
        categories={workspace.categories}
        transactions={transactions}
        disabled={isMutating || Boolean(workspace.dataError)}
      />
      <TransferDialog
        open={transferOpen}
        accounts={workspace.accounts}
        onClose={() => setTransferOpen(false)}
        onTransfer={handleTransfer}
      />
      <SplitExpenseDialog
        open={splitOpen}
        accounts={workspace.accounts}
        categories={workspace.categories}
        onClose={() => setSplitOpen(false)}
        onSplit={handleSplit}
        disabled={isMutating || Boolean(workspace.dataError)}
      />
      {editing ? (
        <EditTransactionDialog
          key={editing.id}
          transaction={editing}
          accounts={workspace.accounts}
          categories={workspace.categories}
          onClose={() => setEditing(null)}
          onSave={handleUpdate}
          disabled={isMutating || Boolean(workspace.dataError)}
          payeeSuggestions={payeeSuggestions}
        />
      ) : null}
      <SecondaryReviewDialog
        open={Boolean(bulkCategoryReview)}
        onOpenChange={(open) => {
          if (!open && !isMutating) setBulkCategoryReview(null);
        }}
        title="Đổi danh mục?"
        description="Kiểm tra trước khi áp dụng cho các giao dịch đã chọn."
        details={bulkCategoryReview ? [
          { label: "Giao dịch", value: `${selectedIds.length} mục đã chọn` },
          { label: "Danh mục mới", value: bulkCategoryReview.name },
        ] : []}
        consequence="Số tiền, ngày và tài khoản của từng giao dịch giữ nguyên. Thay đổi áp dụng ngay cho tất cả mục đã chọn."
        confirmLabel="Đổi danh mục"
        pending={isMutating}
        onConfirm={confirmBulkCategory}
        slot="bulk-category-review"
      />
      <SecondaryReviewDialog
        open={Boolean(bulkDateReview)}
        onOpenChange={(open) => {
          if (!open && !isMutating) setBulkDateReview(null);
        }}
        title="Đổi ngày hàng loạt?"
        description="Kiểm tra trước khi áp dụng cho các giao dịch đã chọn."
        details={
          bulkDateReview
            ? [
                {
                  label: "Ngày mới",
                  value: bulkDateReview.occurredOn
                    .split("-")
                    .reverse()
                    .join("/"),
                },
                {
                  label: "Sẽ đổi",
                  value: `${bulkDateReview.eligible.length} giao dịch`,
                },
                ...(bulkDateReview.skipped.length
                  ? [
                      {
                        label: "Bỏ qua",
                        value: summarizeBulkSkips(bulkDateReview.skipped),
                      },
                    ]
                  : []),
              ]
            : []
        }
        consequence="Chỉ ngày giao dịch thay đổi; số tiền, danh mục và tài khoản của từng giao dịch giữ nguyên. Thay đổi áp dụng ngay cho các mục đủ điều kiện."
        confirmLabel="Đổi ngày"
        pending={isMutating}
        onConfirm={confirmBulkDate}
        slot="bulk-date-review"
      />
      <SecondaryReviewDialog
        open={Boolean(bulkDeleteReview)}
        onOpenChange={(open) => {
          if (!open && !isMutating) setBulkDeleteReview(null);
        }}
        title="Xóa các giao dịch đã chọn?"
        description="Kiểm tra trước khi ẩn khỏi sổ của bạn."
        details={
          bulkDeleteReview
            ? [
                {
                  label: "Sẽ xóa",
                  value: `${bulkDeleteReview.eligible.length} giao dịch`,
                },
                ...(bulkDeleteReview.skipped.length
                  ? [
                      {
                        label: "Bỏ qua",
                        value: summarizeBulkSkips(bulkDeleteReview.skipped),
                      },
                    ]
                  : []),
              ]
            : []
        }
        consequence="Các giao dịch sẽ được ẩn khỏi sổ của bạn. Bạn có thể hoàn tác trong 8 giây."
        confirmLabel="Xóa đã chọn"
        confirmIntent="destructive"
        pending={isMutating}
        onConfirm={confirmBulkDelete}
        slot="bulk-delete-review"
      />
      <SecondaryReviewDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isMutating) setDeleteTarget(null);
        }}
        title="Xóa giao dịch?"
        description="Kiểm tra trước khi ẩn khỏi sổ của bạn."
        details={deleteTarget ? [
          { label: "Giao dịch", value: deleteTarget.note },
          { label: "Số tiền", value: formatMoney(deleteTarget.amount) },
        ] : []}
        consequence="Giao dịch sẽ được ẩn khỏi sổ của bạn. Bạn có thể hoàn tác trong 8 giây."
        confirmLabel="Xóa giao dịch"
        confirmIntent="destructive"
        pending={isMutating}
        onConfirm={confirmDelete}
        slot="transaction-delete-review"
      />
    </AppShell>
  );
}
