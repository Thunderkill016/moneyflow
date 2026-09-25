"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, IconButton, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SecondaryReviewDialog } from "@/components/secondary/secondary-layout";
import type { ToastTone } from "@/components/ui/toast";
import { type ViewerSummary } from "@/components/user-chip";
import { useTransactions } from "@/hooks/use-transactions";
import {
  activeDatePreset,
  datePresetRange,
  type DatePreset,
} from "@/lib/date-presets";
import { formatMoney } from "@/lib/money";
import {
  pauseCountdown,
  pausedCountdown,
  resumeCountdown,
  startCountdown,
  type Countdown,
} from "@/lib/pausable-countdown";
import {
  categoryMetaFor,
  categoryMetaIndex,
  type AccountOption,
  type CategoryOption,
  type CreateSplitExpenseInput,
  type CreateTransactionInput,
  type CreateTransferInput,
  type GoalOption,
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
import { findLedgerDuplicateGroups } from "@/lib/ledger-duplicates";
import {
  reconciliationImportEvidenceLabel,
  type ReconciliationImportEvidenceData,
} from "@/lib/reconciliation-import-evidence";
import {
  dismissLedgerDupePatterns,
  readLedgerDupeDismissals,
} from "@/lib/ledger-duplicate-dismissals";
import {
  isAppSearchTarget,
  isEditableKeyboardTarget,
  isInteractiveKeyboardTarget,
  moveFocusIndex,
} from "@/lib/keyboard";
import { safeUserNotice } from "@/lib/safe-log";
import { isSplitExpense } from "@/lib/splits";
import { derivePayeeSuggestions } from "@/lib/quick-add-defaults";
import {
  filterTransactions,
  normalizeTransactionAmountInput,
  transactionFilterError,
  transactionFilterSearch,
  type TransactionFilterKind,
  type TransactionFilterValues,
  type TransactionReviewFilter,
} from "@/lib/transaction-filters";
import {
  deleteSavedTransactionFilter,
  readSavedTransactionFilters,
  sameSavedFilterValues,
  SAVED_TRANSACTION_FILTERS_LIMIT,
  SAVED_TRANSACTION_FILTER_NAME_MAX,
  saveTransactionFilter,
  type SavedTransactionFilter,
} from "@/lib/saved-transaction-filters";
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
  resolveLedgerEscape,
  resolveLedgerShortcut,
} from "@/lib/transactions/keyboard";
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
  /**
   * Active + archived categories for row presentation. Historical rows keep
   * their archived category's stored identity through this list; pickers keep
   * using `categories`. Falls back to `categories` when absent.
   */
  metaCategories?: CategoryOption[];
  /** Goal picker options for the edit dialog; demo ids are strings. */
  goals?: GoalOption[];
  totalBalance: number;
  today: string;
  dataError: string | null;
  reviewFeatureAvailable?: boolean;
};

type TransactionsWorkspaceProps = {
  viewer: ViewerSummary;
  /**
   * Stable viewer id (Supabase sub; "demo-user" in demo) — scopes the
   * device-local saved-filter presets so a later sign-in on the same
   * browser cannot read or mutate the previous viewer's presets.
   */
  viewerId: string;
  workspace: TransactionsWorkspaceData;
  /**
   * Server-read import provenance keyed by transaction id (the same map the
   * reconciliation surface uses). Rows with no entry render no subtitle —
   * provenance is evidence, never an assumed manual-entry default.
   */
  importEvidence?: ReconciliationImportEvidenceData;
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

/** A live delete-undo offer: rows "Hoàn tác" restores + the toast text. */
type PendingUndo = {
  snapshots: Transaction[];
  message: string;
};

/**
 * One pausable timed slot on the toast region — the component-owned
 * `setTimeout` handle plus the pure countdown state from
 * `src/lib/pausable-countdown.ts`.
 */
type CountdownSlot = {
  timer: number | null;
  countdown: Countdown | null;
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

/** dd/mm/yyyy for the duplicate-review rows — same shape as the day headers. */
function formatDayMonth(occurredOn: string) {
  const parts = occurredOn.split("-");
  return parts.length === 3
    ? `${parts[2]}/${parts[1]}/${parts[0]}`
    : occurredOn;
}

export function TransactionsWorkspace({
  viewer,
  viewerId,
  workspace,
  importEvidence,
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
  const router = useRouter();
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
    mutatingIds,
  } = useTransactions({
    initialTransactions: workspace.transactions,
    accounts: workspace.accounts,
    categories: workspace.categories,
    goals: workspace.goals,
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
  const [noticeTone, setNoticeTone] = useState<ToastTone | undefined>(undefined);
  /**
   * Live delete-undo offer: the snapshots "Hoàn tác" restores plus the message
   * the toast falls back to while the offer is open. Kept independent of the
   * transient notice text so an unrelated notice cannot kill a live undo.
   */
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);
  const pendingUndoRef = useRef<PendingUndo | null>(null);
  /**
   * Two pausable countdowns share the toast region: `noticeSlot` expires the
   * transient text, `undoSlot` expires the undo window. While an undo is open
   * the undo text owns the toast and needs no text timer of its own — the undo
   * deadline IS its expiry. Hover/focus on the region pauses both (WCAG
   * 2.2.1: the undo toast holds the only recovery path, so it must not keep
   * ticking while the reader is interacting with it).
   */
  const noticeSlotRef = useRef<CountdownSlot>({
    timer: null,
    countdown: null,
  });
  const undoSlotRef = useRef<CountdownSlot>({ timer: null, countdown: null });
  const noticeHeldRef = useRef(false);
  /** True while the toast currently displays the undo message (vs a newer notice). */
  const undoNoticeVisibleRef = useRef(false);

  /*
   * Ledger-duplicate review strip. Detection runs over the loaded transaction
   * list — demo and authenticated modes share `transactions`, so both work
   * unchanged. Dismissals are device-local and keyed on the flagged pattern
   * (account|kind|amount|note), matching the recurring-dismissal convention:
   * `null` until localStorage is read so already-dismissed groups never flash.
   * The strip is advisory only — the sole mutation it offers is the existing
   * soft-delete path (handleDelete → confirm → 8s undo).
   */
  const [dismissedDupeKeys, setDismissedDupeKeys] = useState<Set<string> | null>(
    null,
  );
  const [dupeReviewOpen, setDupeReviewOpen] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDismissedDupeKeys(new Set(readLedgerDupeDismissals()));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  /*
   * Named filter presets — a device-local convenience in localStorage, the
   * same class as duplicate dismissals: never ledger data, never synced.
   * Scoped per viewer: presets carry readable names, free-text queries and
   * account/category names, so the next person signing into this browser
   * must not inherit them. Read after mount so the server render cannot
   * disagree with the client.
   */
  const savedFilterScope = viewerId;
  const [savedFilters, setSavedFilters] = useState<SavedTransactionFilter[]>(
    [],
  );
  const [saveFilterOpen, setSaveFilterOpen] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState("");
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSavedFilters(readSavedTransactionFilters(savedFilterScope));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [savedFilterScope]);

  const dupeGroups = useMemo(
    () => findLedgerDuplicateGroups(transactions),
    [transactions],
  );
  const visibleDupeGroups = useMemo(
    () =>
      dismissedDupeKeys === null
        ? []
        : dupeGroups.filter((group) => !dismissedDupeKeys.has(group.key)),
    [dupeGroups, dismissedDupeKeys],
  );
  const dupeFlaggedCount = useMemo(
    () =>
      visibleDupeGroups.reduce((count, group) => count + group.rows.length, 0),
    [visibleDupeGroups],
  );

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
      else if (resolution.type === "notice") {
        showNotice(resolution.message, "info");
      } else showNotice(TRANSACTION_OPEN_MISSING_NOTICE, "warning");
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep-link resolution fires once against the settled list
  }, [initialOpenId, transactions, ledgerSettled]);
  const expenseCategoryCount = workspace.categories.filter(
    (item) => item.kind === "expense",
  ).length;

  function clearSlot(slot: CountdownSlot) {
    if (slot.timer != null) {
      window.clearTimeout(slot.timer);
      slot.timer = null;
    }
    slot.countdown = null;
  }

  function armSlot(slot: CountdownSlot, ms: number, onExpire: () => void) {
    clearSlot(slot);
    /*
     * If the reader is already holding the region when the toast appears
     * (it mounted under the pointer, or focus was inside), arm the countdown
     * paused — the deadline only runs while nobody is interacting with it.
     */
    slot.countdown = noticeHeldRef.current
      ? pausedCountdown(ms)
      : startCountdown(ms, Date.now());
    if (slot.countdown.running) {
      slot.timer = window.setTimeout(onExpire, ms);
    }
  }

  function pauseSlot(slot: CountdownSlot) {
    if (slot.timer != null) {
      window.clearTimeout(slot.timer);
      slot.timer = null;
    }
    if (slot.countdown) {
      slot.countdown = pauseCountdown(slot.countdown, Date.now());
    }
  }

  function resumeSlot(slot: CountdownSlot, onExpire: () => void) {
    const countdown = slot.countdown;
    if (!countdown || countdown.running) return;
    const next = resumeCountdown(countdown, Date.now());
    if (!next.running) {
      // The window lapsed while held — expire now rather than strand it.
      slot.countdown = null;
      onExpire();
      return;
    }
    slot.countdown = next;
    slot.timer = window.setTimeout(onExpire, next.remainingMs);
  }

  /** Hover/focus hold on the toast region — pauses every live countdown. */
  function handleNoticeHold(held: boolean) {
    noticeHeldRef.current = held;
    if (held) {
      pauseSlot(noticeSlotRef.current);
      pauseSlot(undoSlotRef.current);
    } else {
      resumeSlot(noticeSlotRef.current, expireNotice);
      resumeSlot(undoSlotRef.current, expireUndoWindow);
    }
  }

  /**
   * Transient text lapsed. When an undo window is still open underneath, put
   * the undo offer back on screen for the rest of its own countdown instead
   * of letting the recovery path die with the newer message.
   */
  function expireNotice() {
    noticeSlotRef.current.timer = null;
    noticeSlotRef.current.countdown = null;
    const undo = pendingUndoRef.current;
    if (undo) {
      undoNoticeVisibleRef.current = true;
      setNotice(undo.message);
      setNoticeTone("neutral");
    } else {
      setNotice("");
      setNoticeTone(undefined);
    }
    setRecentSaved(null);
  }

  /** Undo window closed for good: drop the snapshots and the toast text. */
  function expireUndoWindow() {
    undoSlotRef.current.timer = null;
    undoSlotRef.current.countdown = null;
    pendingUndoRef.current = null;
    setPendingUndo(null);
    if (undoNoticeVisibleRef.current) {
      undoNoticeVisibleRef.current = false;
      setNotice("");
      setNoticeTone(undefined);
    }
  }

  function showNotice(
    message: string,
    tone: ToastTone,
    ms = NOTICE_MS,
    preserveRecentSaved = false,
  ) {
    /*
     * Only the text timer is replaced — a live delete-undo window keeps its
     * own countdown, so an unrelated notice cannot kill a pending "Hoàn tác".
     * The undo action stays attached to whatever notice is on screen and the
     * undo message resurfaces when this text expires (see expireNotice).
     */
    clearSlot(noticeSlotRef.current);
    undoNoticeVisibleRef.current = false;
    if (!preserveRecentSaved) setRecentSaved(null);
    setNotice(message);
    setNoticeTone(tone);
    armSlot(noticeSlotRef.current, ms, expireNotice);
  }

  useEffect(
    () => () => {
      clearSlot(noticeSlotRef.current);
      clearSlot(undoSlotRef.current);
    },
    [],
  );

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
  // Row icons resolve through the viewer's own category rows so a custom
  // icon picked in /categories shows here, not only on the manage page.
  const categoryMetaByName = useMemo(
    () => categoryMetaIndex(workspace.metaCategories ?? workspace.categories),
    [workspace.metaCategories, workspace.categories],
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

  /*
   * Keyboard layer — mirrors the inbox shortcuts (shared helpers live in
   * src/lib/keyboard.ts, the ledger mapping in src/lib/transactions/keyboard.ts).
   * The focus index walks `listWindow.visible`, the flat display order the day
   * groups render. The listener re-subscribes every render (no dep array) so
   * row actions always see the current filter key, selection and dialog state
   * rather than stale closures.
   */
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const rowIndexById = useMemo(() => {
    const map = new Map<string, number>();
    listWindow.visible.forEach((transaction, index) => {
      map.set(transaction.id, index);
    });
    return map;
  }, [listWindow.visible]);
  const safeFocusedIndex =
    listWindow.visible.length === 0 || focusedIndex < 0
      ? -1
      : Math.min(focusedIndex, listWindow.visible.length - 1);
  const modalOpen = Boolean(
    dialogOpen ||
      transferOpen ||
      splitOpen ||
      editing ||
      deleteTarget ||
      bulkCategoryReview ||
      bulkDateReview ||
      bulkDeleteReview,
  );

  useEffect(() => {
    if (safeFocusedIndex < 0) return;
    document
      .querySelector<HTMLElement>(`[data-ledger-index="${safeFocusedIndex}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [safeFocusedIndex]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Any open dialog owns its keys (Esc dismissal, Enter confirm).
      if (event.defaultPrevented || modalOpen) return;

      if (event.key === "Escape") {
        // Esc is never text input, so it is evaluated before the editable
        // guard: it peels search → selection → row focus, innermost first.
        const escapeTarget = resolveLedgerEscape({
          searchActive:
            isAppSearchTarget(document.activeElement) || query.trim() !== "",
          hasSelection: selectedIds.length > 0,
          hasRowFocus: safeFocusedIndex >= 0,
        });
        if (!escapeTarget) return;
        event.preventDefault();
        if (escapeTarget === "search") setQuery("");
        else if (escapeTarget === "selection") setSelectedIds([]);
        else setFocusedIndex(-1);
        return;
      }

      if (isEditableKeyboardTarget(event.target)) return;
      const action = resolveLedgerShortcut(event.key, {
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
      });
      if (!action) return;

      const list = listWindow.visible;

      if (action === "search") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if (action === "add") {
        event.preventDefault();
        if (isTimeline) router.push(GHI_CHI_TIEU_HREF);
        else if (!workspace.dataError) setDialogOpen(true);
        return;
      }
      if (list.length === 0) return;

      if (action === "next" || action === "prev") {
        event.preventDefault();
        setFocusedIndex((current) =>
          moveFocusIndex(current, action === "next" ? 1 : -1, list.length),
        );
        return;
      }

      const row =
        safeFocusedIndex >= 0 ? list[safeFocusedIndex] : undefined;
      if (!row) {
        showNotice("Dùng J/K chọn một giao dịch trước.", "info");
        return;
      }
      // Enter/e must not hijack a focused control's own activation — the row's
      // edit/delete buttons and the recurring-row commitments link keep their
      // native click.
      if (action === "edit" && isInteractiveKeyboardTarget(event.target)) {
        return;
      }
      event.preventDefault();
      if (action === "edit") {
        if (row.isRecurringPayment) router.push("/commitments");
        else handleEditClick(row);
        return;
      }
      if (action === "toggle_select") {
        if (reviewFeatureAvailable && !rowBusy(row.id)) {
          toggleTransactionSelection(row.id);
        }
        return;
      }
      if (action === "delete" && !rowBusy(row.id)) {
        handleDelete(row);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

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

  const currentFilterValues = (): TransactionFilterValues => ({
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

  const activeSavedFilterName =
    savedFilters.find((preset) =>
      sameSavedFilterValues(preset.values, currentFilterValues()),
    )?.name ?? null;

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

  /*
   * Applying a preset writes every filter field — the URL sync effect then
   * serialises the result, so a loaded preset is deep-linkable for free.
   */
  function applySavedFilter(preset: SavedTransactionFilter) {
    const v = preset.values;
    setQuery(v.query);
    setKind(v.kind);
    setAccount(v.account);
    setCategory(v.category);
    setReview(reviewFeatureAvailable ? v.review : "all");
    setFromDate(v.fromDate);
    setToDate(v.toDate);
    setMinAmountInput(v.minAmountInput);
    setMaxAmountInput(v.maxAmountInput);
    showNotice(`Đang lọc: ${preset.name}`, "info");
  }

  function handleSaveFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = saveFilterName.trim();
    const result = saveTransactionFilter(
      trimmed,
      currentFilterValues(),
      savedFilterScope,
    );
    if (!result.ok) {
      /*
       * Keep the form open with the name intact — a quota/private-mode
       * denial may be transient, and retyping the name is the annoying part.
       */
      showNotice(
        result.reason === "storage"
          ? "Trình duyệt không cho lưu — kiểm tra dung lượng hoặc chế độ riêng tư, rồi thử lại."
          : result.reason === "limit"
            ? `Chỉ lưu được ${SAVED_TRANSACTION_FILTERS_LIMIT} bộ lọc. Xoá bớt trước khi thêm.`
            : "Đặt tên cho bộ lọc trước khi lưu.",
        "warning",
      );
      return;
    }
    setSavedFilters(result.filters);
    setSaveFilterOpen(false);
    setSaveFilterName("");
    showNotice(`Đã lưu bộ lọc “${trimmed}”.`, "success");
  }

  function handleDeleteSavedFilter(name: string) {
    const result = deleteSavedTransactionFilter(name, savedFilterScope);
    if (!result.ok) {
      showNotice(
        "Trình duyệt không cho ghi — chưa xoá được. Thử lại.",
        "warning",
      );
      return;
    }
    setSavedFilters(result.filters);
    showNotice(`Đã xoá bộ lọc “${name}”.`, "info");
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
        "error",
      );
      return;
    }
    showNotice(
      reviewStatus === "reviewed"
        ? `Đã đánh dấu ${result.updatedIds.length} giao dịch là đã duyệt.`
        : `Đã chuyển ${result.updatedIds.length} giao dịch sang cần kiểm tra.`,
      "success",
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
        "warning",
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
      showNotice(
        safeUserNotice(result.message, "Không đổi được danh mục."),
        "error",
      );
      return;
    }
    setBulkCategoryReview(null);
    showNotice(
      `Đã đổi danh mục cho ${result.updatedIds.length} giao dịch.`,
      "success",
    );
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
      showNotice(plan.message, "warning");
      return;
    }
    if (plan.eligible.length === 0) {
      showNotice(
        `Không có giao dịch nào đổi được. Bỏ qua: ${summarizeBulkSkips(plan.skipped)}.`,
        "warning",
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
      showNotice(
        safeUserNotice(result.message, "Không đổi được ngày."),
        "error",
      );
      return;
    }
    setBulkDateReview(null);
    showNotice(
      result.skipped.length
        ? `Đã đổi ngày ${result.updatedIds.length} giao dịch. Bỏ qua ${result.skipped.length}: ${summarizeBulkSkips(result.skipped)}.`
        : `Đã đổi ngày cho ${result.updatedIds.length} giao dịch.`,
      "success",
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
      showNotice(plan.message, "warning");
      return;
    }
    if (plan.eligible.length === 0) {
      showNotice(
        `Không xóa được giao dịch nào. Bỏ qua: ${summarizeBulkSkips(plan.skipped)}.`,
        "warning",
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
      showNotice(
        safeUserNotice(result.message, "Không xóa được giao dịch."),
        "error",
      );
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
        "success",
        NOTICE_MS,
        true,
      );
    }
    return result;
  }

  function handleDelete(transaction: Transaction) {
    if (transaction.isRecurringPayment) {
      showNotice("Khoản này được quản lý ở trang Định kỳ.", "info");
      return;
    }
    setDeleteTarget(transaction);
  }

  /**
   * Dismiss one duplicate pattern (or every flagged pattern from the strip).
   * Keys are bucket-level, so a dismissed "Cà phê 30k" pattern stays quiet even
   * when new rows join it — see ledger-duplicate-dismissals.ts.
   */
  function dismissDupeGroups(keys: string[]) {
    if (keys.length === 0) return;
    setDismissedDupeKeys(new Set(dismissLedgerDupePatterns(keys)));
    showNotice("Đã bỏ qua gợi ý trùng.", "success", NOTICE_MS, true);
  }

  /**
   * Shared 8-second undo window for single and bulk soft deletes — the notice
   * keeps the deleted snapshots so "Hoàn tác" can restore each via the same
   * restore RPC the single-row path uses. A second delete supersedes the
   * pending undo slot; unrelated notices must not (see `showNotice`).
   */
  function showDeleteNotice(message: string, snapshots: Transaction[]) {
    setSelectedIds((current) =>
      current.filter((id) => !snapshots.some((item) => item.id === id)),
    );
    clearSlot(noticeSlotRef.current);
    clearSlot(undoSlotRef.current);
    setRecentSaved(null);
    const text = safeUserNotice(message, "Đã xóa giao dịch.");
    const undo: PendingUndo | null = snapshots.length
      ? { snapshots, message: text }
      : null;
    pendingUndoRef.current = undo;
    setPendingUndo(undo);
    undoNoticeVisibleRef.current = undo != null;
    setNotice(text);
    /*
     * A real undo offer reads as neutral, not a fresh success — the delete
     * already happened and the action restores it. When every selected row
     * was skipped there is nothing to undo, so the notice is a warning.
     */
    setNoticeTone(snapshots.length ? "neutral" : "warning");
    if (undo) {
      armSlot(undoSlotRef.current, DELETE_UNDO_MS, expireUndoWindow);
    } else {
      armSlot(noticeSlotRef.current, DELETE_UNDO_MS, expireNotice);
    }
  }

  async function confirmDelete() {
    const transaction = deleteTarget;
    if (!transaction) return;

    const result = await deleteTransaction(transaction.id);
    if (!result.ok) {
      setDeleteTarget(null);
      showNotice(
        safeUserNotice(result.message, "Không xóa được giao dịch."),
        "error",
      );
      return;
    }
    setDeleteTarget(null);
    showDeleteNotice(`Đã xóa ${transaction.note}.`, [transaction]);
  }

  async function handleUndoDelete() {
    const pending = pendingUndoRef.current;
    if (!pending?.snapshots.length) return;
    clearSlot(noticeSlotRef.current);
    clearSlot(undoSlotRef.current);
    undoNoticeVisibleRef.current = false;
    setPendingUndo(null);
    pendingUndoRef.current = null;
    setNotice("");
    setNoticeTone(undefined);

    let restored = 0;
    let lastFailure = "";
    for (const snapshot of pending.snapshots) {
      const result = await restoreTransaction(snapshot);
      if (result.ok) restored += 1;
      else lastFailure = result.message;
    }
    if (restored === pending.snapshots.length) {
      showNotice(
        pending.snapshots.length === 1
          ? "Đã khôi phục giao dịch."
          : `Đã khôi phục ${restored} giao dịch.`,
        "success",
      );
    } else {
      showNotice(
        safeUserNotice(
          lastFailure,
          "Không khôi phục được hết. Một số giao dịch vẫn đang ẩn.",
        ) +
          ` Đã khôi phục ${restored}/${pending.snapshots.length} giao dịch.`,
        "error",
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
        "success",
      );
    }
    return result;
  }

  async function handleTransfer(input: CreateTransferInput) {
    const result = await addTransfer(input);
    if (result.ok) {
      setTransferOpen(false);
      showNotice("Đã chuyển ví thành công.", "success");
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
        "success",
      );
    }
    return result;
  }

  function handleEditClick(transaction: Transaction) {
    if (isSplitExpense(transaction)) {
      showNotice(
        "Khoản chia danh mục: xóa rồi tạo lại nếu cần sửa các dòng.",
        "info",
      );
      return;
    }
    setEditing(transaction);
  }

  function editRecentSaved() {
    if (!recentSaved) return;
    clearSlot(noticeSlotRef.current);
    undoNoticeVisibleRef.current = false;
    setNotice("");
    setNoticeTone(undefined);
    setRecentSaved(null);
    setEditing(recentSaved);
  }

  /**
   * Row-scoped busy check: a row freezes when its own mutation is in flight
   * (`mutatingIds`) or when a workspace-wide op — a bulk action or a
   * form-level add/transfer/split — holds the global flag.
   */
  function rowBusy(id: string) {
    return isMutating || mutatingIds.has(id);
  }

  /*
   * The delete-confirm dialog tracks its own row's RPC: while the delete is
   * in flight the confirm button spins and Esc dismissal stays locked — but
   * an unrelated row's mutation no longer holds the dialog hostage.
   */
  const deleteTargetBusy =
    deleteTarget != null && rowBusy(deleteTarget.id);

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
      noticeTone={noticeTone}
      onNoticeHoldChange={handleNoticeHold}
      noticeAction={
        pendingUndo
          ? {
              label: "Hoàn tác",
              onClick: () => void handleUndoDelete(),
              /*
               * Gate on this offer's own restore, not the workspace-wide
               * flag — an unrelated in-flight mutation must not eat the
               * undo window.
               */
              disabled: pendingUndo.snapshots.some((item) =>
                mutatingIds.has(item.id),
              ),
            }
          : recentSaved
            ? {
                label: "Sửa",
                onClick: editRecentSaved,
                disabled: rowBusy(recentSaved.id),
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
                {/*
                  Trash is where deletes land — a quiet link beside the actions
                  that create them keeps recovery discoverable without adding a
                  nav item.
                */}
                <LinkButton
                  href="/transactions/trash"
                  intent="quiet"
                  targetSize="important"
                >
                  <Icon name="trash" /> Đã xóa
                </LinkButton>
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
                  ref={searchInputRef}
                  data-app-search="true"
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

                <div className={styles.savedFiltersEditor}>
                  {saveFilterOpen ? (
                    <form
                      className={styles.savedFilterForm}
                      onSubmit={handleSaveFilterSubmit}
                    >
                      <label className={styles.field}>
                        <span>Tên bộ lọc</span>
                        <input
                          value={saveFilterName}
                          maxLength={SAVED_TRANSACTION_FILTER_NAME_MAX}
                          onChange={(event) =>
                            setSaveFilterName(event.target.value)
                          }
                          placeholder="Ví dụ: Chi ăn uống tháng này"
                          aria-label="Tên bộ lọc đã lưu"
                        />
                      </label>
                      <div className={styles.savedFilterFormActions}>
                        <Button
                          type="submit"
                          intent="secondary"
                          targetSize="important"
                        >
                          Lưu
                        </Button>
                        <Button
                          type="button"
                          intent="quiet"
                          targetSize="important"
                          onClick={() => {
                            setSaveFilterOpen(false);
                            setSaveFilterName("");
                          }}
                        >
                          Huỷ
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button
                      type="button"
                      intent="quiet"
                      targetSize="important"
                      disabled={!hasActiveFilters}
                      onClick={() => setSaveFilterOpen(true)}
                    >
                      Lưu bộ lọc này
                    </Button>
                  )}
                </div>
              </div>
            </details>

            {savedFilters.length > 0 ? (
              <div
                className={styles.savedFilters}
                aria-label="Bộ lọc đã lưu"
              >
                <span className={styles.savedFiltersLabel}>Đã lưu</span>
                <ul className={styles.savedFiltersList}>
                  {savedFilters.map((preset) => {
                    const active = activeSavedFilterName === preset.name;
                    return (
                      <li
                        key={preset.name}
                        className={styles.savedFilterItem}
                      >
                        <Button
                          type="button"
                          unstyled
                          targetSize="important"
                          className={`${styles.savedFilterApply}${
                            active ? ` ${styles.savedFilterApplyActive}` : ""
                          }`}
                          onClick={() => applySavedFilter(preset)}
                          aria-pressed={active}
                        >
                          {preset.name}
                        </Button>
                        <Button
                          type="button"
                          unstyled
                          targetSize="important"
                          className={styles.savedFilterDelete}
                          onClick={() => handleDeleteSavedFilter(preset.name)}
                          aria-label={`Xoá bộ lọc ${preset.name}`}
                        >
                          <Icon name="close" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

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

          {/*
            Ledger-duplicate review strip — advisory only. It never mutates
            anything; the review list's only action is the same soft-delete
            path the row trash button uses (confirm dialog + 8s undo).
          */}
          {!workspace.dataError && visibleDupeGroups.length > 0 ? (
            <section
              className={styles.dupeStrip}
              data-slot="ledger-dupe-strip"
              aria-label="Giao dịch có vẻ trùng"
            >
              <div className={styles.dupeSummary}>
                <span className={styles.dupeIcon} aria-hidden="true">
                  <Icon name="flag" />
                </span>
                <p className={styles.dupeText}>
                  <strong>{dupeFlaggedCount} giao dịch</strong> có vẻ trùng —
                  cùng tài khoản, cùng số tiền, ghi chú giống nhau.
                </p>
                <div className={styles.dupeActions}>
                  <Button
                    type="button"
                    intent="secondary"
                    targetSize="important"
                    onClick={() => setDupeReviewOpen((open) => !open)}
                    aria-expanded={dupeReviewOpen}
                  >
                    {dupeReviewOpen ? "Ẩn" : "Xem lại"}
                  </Button>
                  <Button
                    type="button"
                    intent="quiet"
                    targetSize="important"
                    onClick={() =>
                      dismissDupeGroups(
                        visibleDupeGroups.map((group) => group.key),
                      )
                    }
                  >
                    Bỏ qua
                  </Button>
                </div>
              </div>

              {dupeReviewOpen ? (
                <div className={styles.dupeGroups}>
                  <p className={styles.dupeHint}>
                    Chỉ gợi ý — MoneyFlow không tự thay đổi gì. Xóa một bản ghi
                    nếu đúng là nhập hai lần; bỏ qua nếu đây là các khoản thật.
                  </p>
                  {visibleDupeGroups.map((group) => (
                    <article
                      key={`${group.key}:${group.rows[0]!.id}`}
                      className={styles.dupeGroup}
                    >
                      <header className={styles.dupeGroupHead}>
                        <strong>{group.note || "(không ghi chú)"}</strong>
                        <span className={styles.dupeGroupMeta}>
                          {group.account} · {formatMoney(group.amount)} ·{" "}
                          {group.rows.length} lần
                          {group.hasSameDayPair
                            ? " · cùng ngày"
                            : ` · cách nhau ${group.spanDays} ngày`}
                        </span>
                        <Button
                          type="button"
                          intent="quiet"
                          targetSize="important"
                          onClick={() => dismissDupeGroups([group.key])}
                        >
                          Bỏ qua
                        </Button>
                      </header>
                      <ul className={styles.dupeRows}>
                        {group.rows.map((row) => (
                          <li key={row.id} className={styles.dupeRow}>
                            <span className={styles.dupeRowDate}>
                              {formatDayMonth(row.occurredOn)}
                            </span>
                            <span className={styles.dupeRowNote}>
                              {row.note || "(không ghi chú)"}
                            </span>
                            <MoneyValue
                              amount={row.amount}
                              mode="kind"
                              kind={row.kind}
                            />
                            <IconButton
                              type="button"
                              variant="ghost"
                              className={styles.deleteButton}
                              onClick={() => handleDelete(row)}
                              disabled={rowBusy(row.id)}
                              aria-label={`Xóa giao dịch ${row.note}`}
                            >
                              <Icon name="trash" />
                            </IconButton>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

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
                      categoryMetaFor(
                        categoryMetaByName,
                        transaction.kind,
                        transaction.category,
                      );
                    const reviewStatus =
                      getTransactionReviewStatus(transaction);
                    const balance = runningBalance?.balanceAfter.get(
                      transaction.id,
                    );
                    const rowIndex =
                      rowIndexById.get(transaction.id) ?? -1;
                    const rowFocused =
                      rowIndex >= 0 && rowIndex === safeFocusedIndex;
                    const provenance =
                      importEvidence?.byTransactionId[transaction.id];
                    return (
                      <article
                        className={`${styles.row}${
                          runningBalance ? ` ${styles.rowWithBalance}` : ""
                        }${rowFocused ? ` ${styles.focused}` : ""}`}
                        key={transaction.id}
                        data-slot="ledger-row"
                        data-transaction-id={transaction.id}
                        data-ledger-index={rowIndex}
                        aria-current={rowFocused ? "true" : undefined}
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
                                  disabled={rowBusy(transaction.id)}
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
                          {provenance ? (
                            <small
                              className={styles.rowProvenance}
                              data-slot="ledger-row-provenance"
                            >
                              Nguồn nhập ·{" "}
                              {reconciliationImportEvidenceLabel(provenance)}
                            </small>
                          ) : null}
                          {transaction.goalName ? (
                            <small
                              className={styles.rowGoal}
                              data-slot="ledger-row-goal"
                            >
                              Mục tiêu · {transaction.goalName}
                            </small>
                          ) : null}
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
                              disabled={rowBusy(transaction.id)}
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
                              disabled={rowBusy(transaction.id)}
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

              <div className={styles.listFooter}>
                <p aria-label="Phím tắt sổ giao dịch">
                  <kbd>J</kbd>/<kbd>K</kbd> di chuyển · <kbd>Enter</kbd>/
                  <kbd>E</kbd> sửa · <kbd>X</kbd> chọn · <kbd>Del</kbd> xóa ·{" "}
                  <kbd>N</kbd> thêm · <kbd>/</kbd> tìm · <kbd>Esc</kbd> bỏ
                </p>
              </div>
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
        goals={workspace.goals}
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
          goals={workspace.goals}
          onClose={() => setEditing(null)}
          onSave={handleUpdate}
          disabled={rowBusy(editing.id) || Boolean(workspace.dataError)}
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
          if (!open && !deleteTargetBusy) setDeleteTarget(null);
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
        pending={deleteTargetBusy}
        onConfirm={confirmDelete}
        slot="transaction-delete-review"
      />
    </AppShell>
  );
}
