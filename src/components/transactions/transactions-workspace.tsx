"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Button,
  IconButton,
  LinkButton,
} from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { type ViewerSummary } from "@/components/user-chip";
import { useTransactions } from "@/hooks/use-transactions";
import { formatMoney, formatMoneyInput } from "@/lib/money";
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
import { safeUserNotice } from "@/lib/safe-log";
import { isSplitExpense } from "@/lib/splits";
import {
  filterTransactions,
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
} from "@/lib/transaction-review";
import { transferRowSubtitle } from "@/lib/transfers";
import styles from "./transactions-workspace.module.css";

const AddTransactionDialog = dynamic(
  () =>
    import("@/components/add-transaction-dialog").then(
      (module) => module.AddTransactionDialog,
    ),
  { ssr: false },
);
const TransferDialog = dynamic(
  () => import("@/components/transfer-dialog").then((module) => module.TransferDialog),
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
  const [notice, setNotice] = useState("");
  const [pendingUndo, setPendingUndo] = useState<Transaction | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const pendingUndoRef = useRef<Transaction | null>(null);
  const expenseCategoryCount = workspace.categories.filter(
    (item) => item.kind === "expense",
  ).length;

  function clearNoticeTimer() {
    if (noticeTimerRef.current != null) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
  }

  function showNotice(message: string, ms = NOTICE_MS) {
    clearNoticeTimer();
    setPendingUndo(null);
    pendingUndoRef.current = null;
    setNotice(message);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice("");
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
  const selectedIds =
    selectionState.filterKey === filterKey ? selectionState.ids : [];

  function setSelectedIds(
    next: string[] | ((current: string[]) => string[]),
  ) {
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
    const result = await bulkSetReviewStatus({ ids: selectedIds, reviewStatus });
    if (!result.ok) {
      showNotice(safeUserNotice(result.message, "Không cập nhật được trạng thái."));
      return;
    }
    showNotice(
      reviewStatus === "reviewed"
        ? `Đã đánh dấu ${result.updatedIds.length} giao dịch là đã duyệt.`
        : `Đã chuyển ${result.updatedIds.length} giao dịch sang cần kiểm tra.`,
    );
    setSelectedIds([]);
  }

  async function handleBulkCategory() {
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
    const confirmed = window.confirm(
      `Đổi danh mục của ${selectedIds.length} giao dịch sang “${target.name}”? Số tiền, ngày và tài khoản sẽ giữ nguyên.`,
    );
    if (!confirmed) return;

    const result = await bulkUpdateCategory({
      ids: selectedIds,
      categoryId: target.id,
    });
    if (!result.ok) {
      showNotice(safeUserNotice(result.message, "Không đổi được danh mục."));
      return;
    }
    showNotice(`Đã đổi danh mục cho ${result.updatedIds.length} giao dịch.`);
    setSelectedIds([]);
    setBulkCategoryId("");
  }

  async function handleAdd(input: CreateTransactionInput) {
    const result = await addTransaction(input);
    if (result.ok && result.transaction) {
      setDialogOpen(false);
      showNotice(
        safeUserNotice(
          `Đã thêm ${result.transaction.note}.`,
          "Đã thêm giao dịch.",
        ),
      );
    }
    return result;
  }

  async function handleDelete(transaction: Transaction) {
    if (transaction.isRecurringPayment) {
      showNotice("Khoản này được quản lý ở trang Định kỳ.");
      return;
    }
    const confirmed = window.confirm(
      `Xóa giao dịch “${transaction.note}” (${formatMoney(transaction.amount)})? Giao dịch sẽ được ẩn khỏi sổ của bạn. Bạn có thể hoàn tác trong 8 giây.`,
    );
    if (!confirmed) return;

    const result = await deleteTransaction(transaction.id);
    if (!result.ok) {
      showNotice(safeUserNotice(result.message, "Không xóa được giao dịch."));
      return;
    }

    setSelectedIds((current) => current.filter((id) => id !== transaction.id));
    clearNoticeTimer();
    pendingUndoRef.current = transaction;
    setPendingUndo(transaction);
    setNotice(
      safeUserNotice(`Đã xóa ${transaction.note}.`, "Đã xóa giao dịch."),
    );
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice("");
      setPendingUndo(null);
      pendingUndoRef.current = null;
      noticeTimerRef.current = null;
    }, DELETE_UNDO_MS);
  }

  async function handleUndoDelete() {
    const snapshot = pendingUndoRef.current;
    if (!snapshot) return;
    clearNoticeTimer();
    setPendingUndo(null);
    pendingUndoRef.current = null;
    setNotice("");

    const result = await restoreTransaction(snapshot);
    if (result.ok) {
      showNotice("Đã khôi phục giao dịch.");
    } else {
      showNotice(
        safeUserNotice(
          result.message,
          "Không khôi phục được. Giao dịch vẫn đang ẩn.",
        ),
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

        <section className={styles.titleRow} aria-labelledby="transactions-title">
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
                    workspace.accounts.length < 2 || Boolean(workspace.dataError)
                  }
                >
                  <Icon name="arrows" /> Chuyển tiền ví
                </Button>
              </>
            )}
          </div>
        </section>

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
                    isTimeline ? "Tìm trong dòng thời gian" : "Tìm trong giao dịch"
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
                      setReview(event.target.value as TransactionReviewFilter)
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

            <div className={styles.rangeFilters} aria-label="Lọc theo thời gian và số tiền">
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
                    setMinAmountInput(formatMoneyInput(event.target.value))
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
                    setMaxAmountInput(formatMoneyInput(event.target.value))
                  }
                  placeholder="Ví dụ: 500.000"
                  aria-label="Số tiền tối đa"
                />
              </label>
            </div>

            {filterError ? (
              <Alert tone="error" live="assertive" className={styles.filterAlert}>
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
            <div className={styles.selectionToolbar} aria-label="Chọn giao dịch">
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
                  onClick={() => void handleBulkCategory()}
                  disabled={
                    !bulkCategorySelection.ok || !effectiveBulkCategoryId
                  }
                >
                  Đổi danh mục
                </Button>
              </div>
              {!bulkCategorySelection.ok ? (
                <p className={styles.bulkReason}>{bulkCategorySelection.message}</p>
              ) : (
                <p className={styles.bulkHint}>
                  Chỉ danh mục thay đổi; số tiền, ngày và tài khoản giữ nguyên.
                </p>
              )}
            </section>
          ) : null}

          {!reviewFeatureAvailable && !viewer.isDemo ? (
            <Alert tone="info" live="polite" className={styles.featureUnavailable}>
              <AlertDescription>
                Kiểm tra và sửa hàng loạt sẽ xuất hiện sau khi migration tương ứng được bật.
              </AlertDescription>
            </Alert>
          ) : null}

          {grouped.length ? (
            <div className={styles.list} data-slot="ledger-list">
              <div className={styles.listHeader} aria-hidden="true">
                <span>Giao dịch</span>
                <span>Số tiền</span>
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
                    const reviewStatus = getTransactionReviewStatus(transaction);
                    return (
                      <article
                        className={styles.row}
                        key={transaction.id}
                        data-slot="ledger-row"
                        data-transaction-id={transaction.id}
                      >
                        <span className={`${styles.transactionIcon} ${iconTone(transaction.kind)}`}>
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
                                ? `${transaction.category} · ${transaction.account} · ${transaction.splits!
                                    .map(
                                      (line) =>
                                        `${line.category} ${formatMoney(line.amount)}`,
                                    )
                                    .join(" · ")}`
                                : `${transaction.category} · ${transaction.account}`}
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

              {listWindow.hasMore || listWindow.total > TRANSACTION_PAGE_SIZE ? (
                <div className={styles.loadMore} role="status">
                  <p>
                    Đang hiện <strong>{listWindow.shown}</strong> /{" "}
                    <strong>{listWindow.total}</strong> giao dịch
                    {listWindow.hasMore ? ` · còn ${listWindow.remaining} nữa` : ""}
                  </p>
                  {listWindow.hasMore ? (
                    <Button
                      type="button"
                      intent="secondary"
                      targetSize="important"
                      onClick={loadMore}
                    >
                      Tải thêm {Math.min(TRANSACTION_PAGE_SIZE, listWindow.remaining)}
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
              title="Chưa có giao dịch"
              description={
                isTimeline
                  ? "Ghi khoản chi hoặc thu để dòng tiền hiện trên timeline."
                  : "Ghi khoản chi đầu tiên để bắt đầu theo dõi dòng tiền."
              }
              primaryAction={
                <Button
                  type="button"
                  intent="secondary"
                  targetSize="important"
                  onClick={() => setDialogOpen(true)}
                >
                  {GHI_CHI_TIEU_LABEL}
                </Button>
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
        />
      ) : null}
    </AppShell>
  );
}
