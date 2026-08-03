"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import styles from "./transactions-page.module.css";
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
export type TransactionsPageVariant = "ledger" | "timeline";

type TransactionsWorkspace = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  totalBalance: number;
  today: string;
  dataError: string | null;
  reviewFeatureAvailable?: boolean;
};

type TransactionsPageProps = {
  viewer: ViewerSummary;
  workspace: TransactionsWorkspace;
  variant?: TransactionsPageVariant;
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

export function TransactionsPage({
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
}: TransactionsPageProps) {
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  useEffect(() => {
    const filteredIds = new Set(filtered.map((item) => item.id));
    setSelectedIds((current) => {
      const next = current.filter((id) => filteredIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [filtered]);

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

  useEffect(() => {
    if (
      !bulkCategoryOptions.some((item) => item.id === bulkCategoryId)
    ) {
      setBulkCategoryId("");
    }
  }, [bulkCategoryId, bulkCategoryOptions]);

  const filteredTotals = useMemo(() => {
    const income = filtered
      .filter((item) => item.kind === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const expense = filtered
      .filter((item) => item.kind === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    return { income, expense, net: income - expense };
  }, [filtered]);

  const grouped = useMemo(() => {
    const groups: {
      date: string;
      relativeDate: string;
      displayDate: string;
      transactions: Transaction[];
      netForDay: number;
    }[] = [];

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
      (item) => item.id === bulkCategoryId,
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
      `Xóa giao dịch “${transaction.note}” (${formatMoney(transaction.amount)})? Giao dịch sẽ được ẩn khỏi sổ của bạn.`,
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
        className={`dashboard transactions-workspace${
          isTimeline ? " timeline-workspace" : ""
        }`}
      >
        {workspace.dataError ? (
          <div className="data-alert" role="alert">
            <Icon name="bell" />
            <span>{workspace.dataError}</span>
          </div>
        ) : null}

        <section className="transactions-title-row">
          <div>
            <p className="eyebrow">
              {isTimeline ? "Sổ đã duyệt" : "Dòng tiền của bạn"}
            </p>
            <h1>{isTimeline ? "Dòng thời gian (đã duyệt)" : "Sổ giao dịch"}</h1>
            <p>
              {isTimeline
                ? "Các giao dịch đã được duyệt — nguồn tin cậy cho số dư và insights."
                : "Lọc giao dịch, kiểm tra dữ liệu và sửa các lỗi phân loại lặp lại."}
            </p>
          </div>
          <div className="page-heading-actions">
            {isTimeline ? (
              <Link className="secondary-button" href="/reports/export?period=month">
                <Icon name="archive" /> Export
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setSplitOpen(true)}
                  disabled={
                    expenseCategoryCount < 2 ||
                    workspace.accounts.length < 1 ||
                    Boolean(workspace.dataError)
                  }
                >
                  <Icon name="spark" /> Chia khoản chi
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setTransferOpen(true)}
                  disabled={
                    workspace.accounts.length < 2 || Boolean(workspace.dataError)
                  }
                >
                  <Icon name="arrows" /> Chuyển tiền ví
                </button>
              </>
            )}
          </div>
        </section>

        <section
          className={`transaction-summary transaction-summary-four ${styles.summary}`}
          aria-label="Tóm tắt theo bộ lọc"
          aria-live="polite"
        >
          <div>
            <p>{isTimeline ? "Đã duyệt" : "Giao dịch"}</p>
            <span className="font-mono">{filtered.length}</span>
          </div>
          <div>
            <p>Tiền vào</p>
            <MoneyValue
              amount={filteredTotals.income}
              mode="kind"
              kind="income"
              label="Tiền vào"
            />
          </div>
          <div>
            <p>Tiền ra</p>
            <MoneyValue
              amount={filteredTotals.expense}
              mode="kind"
              kind="expense"
              label="Tiền ra"
            />
          </div>
          <div>
            <p>Còn lại</p>
            <MoneyValue
              amount={filteredTotals.net}
              mode="signed"
              label="Còn lại"
            />
          </div>
        </section>

        <section className="transaction-manager panel">
          <div className="manager-toolbar">
            <label className="mobile-manager-search">
              <Icon name="search" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo ghi chú, danh mục..."
                aria-label={
                  isTimeline ? "Tìm trong dòng thời gian" : "Tìm trong giao dịch"
                }
              />
            </label>

            <div className="filter-group" aria-label="Lọc theo loại">
              {(["all", "expense", "income", "transfer"] as KindFilter[]).map(
                (value) => (
                  <button
                    type="button"
                    key={value}
                    className={kind === value ? "active" : ""}
                    onClick={() => setKind(value)}
                    aria-pressed={kind === value}
                  >
                    {value === "all"
                      ? "Tất cả"
                      : value === "expense"
                        ? "Khoản chi"
                        : value === "income"
                          ? "Khoản thu"
                          : "Chuyển tiền"}
                  </button>
                ),
              )}
            </div>

            <label className="category-filter account-filter">
              <span className="sr-only">Lọc theo danh mục</span>
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

            <label className="account-filter">
              <span className="sr-only">Lọc theo tài khoản</span>
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
              <label className="account-filter">
                <span className="sr-only">Lọc theo trạng thái kiểm tra</span>
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

            <div
              className={styles.rangeFilters}
              aria-label="Lọc theo thời gian và số tiền"
            >
              <label className={styles.rangeField}>
                <span>Từ ngày</span>
                <input
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(event) => setFromDate(event.target.value)}
                  aria-label="Từ ngày"
                />
              </label>
              <label className={styles.rangeField}>
                <span>Đến ngày</span>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(event) => setToDate(event.target.value)}
                  aria-label="Đến ngày"
                />
              </label>
              <label className={styles.rangeField}>
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
              <label className={styles.rangeField}>
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
              {filterError ? (
                <p className={styles.filterError} role="alert">
                  {filterError}
                </p>
              ) : null}
            </div>

            {hasActiveFilters ? (
              <button
                type="button"
                className="filter-reset-button"
                onClick={clearFilters}
              >
                Xóa bộ lọc
              </button>
            ) : null}
          </div>

          {reviewFeatureAvailable && filtered.length ? (
            <div className={styles.selectionToolbar} aria-label="Chọn giao dịch">
              <button
                type="button"
                className="secondary-button"
                onClick={toggleVisibleSelection}
                disabled={isMutating || visibleIds.length === 0}
              >
                {allVisibleSelected ? "Bỏ chọn đang hiện" : "Chọn đang hiện"}
              </button>
              <span aria-live="polite">
                Đã chọn <strong>{selectedIds.length}</strong> giao dịch
              </span>
              {selectedIds.length ? (
                <button
                  type="button"
                  className={styles.clearSelection}
                  onClick={() => setSelectedIds([])}
                  disabled={isMutating}
                >
                  Bỏ chọn tất cả
                </button>
              ) : null}
            </div>
          ) : null}

          {reviewFeatureAvailable && selectedIds.length ? (
            <section className={styles.bulkBar} aria-label="Thao tác hàng loạt">
              <div className={styles.bulkReviewActions}>
                <span>{selectedIds.length} giao dịch</span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleBulkReview("reviewed")}
                  disabled={isMutating}
                >
                  Đánh dấu đã duyệt
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleBulkReview("needs_review")}
                  disabled={isMutating}
                >
                  Chuyển sang cần kiểm tra
                </button>
              </div>
              <div className={styles.bulkCategoryActions}>
                <label>
                  <span>Danh mục mới</span>
                  <select
                    value={bulkCategoryId}
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
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void handleBulkCategory()}
                  disabled={
                    isMutating ||
                    !bulkCategorySelection.ok ||
                    !bulkCategoryId
                  }
                >
                  Đổi danh mục
                </button>
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
            <p className={styles.featureUnavailable} role="status">
              Kiểm tra và sửa hàng loạt sẽ xuất hiện sau khi migration tương ứng được bật.
            </p>
          ) : null}

          {grouped.length ? (
            <div className="manager-list">
              <div className="manager-header" aria-hidden="true">
                <span>Giao dịch</span>
                <span>Thời gian</span>
                <span>Số tiền</span>
                <span />
              </div>

              {grouped.map((group) => (
                <div key={group.date}>
                  <div className="date-group-header">
                    <span className="date-group-title">
                      {group.relativeDate}, {group.displayDate}
                    </span>
                    <span className="date-group-total">
                      <span>Tổng:</span>{" "}
                      <MoneyValue
                        amount={group.netForDay}
                        mode="signed"
                        label={`Tổng ${group.displayDate}`}
                      />
                    </span>
                  </div>

                  {group.transactions.map((transaction) => {
                    const meta =
                      categoryMeta[transaction.category] ??
                      categoryMeta["Thu nhập khác"];
                    const reviewStatus = getTransactionReviewStatus(transaction);
                    return (
                      <article className="manager-row" key={transaction.id}>
                        <span className={`transaction-icon ${meta.color}`}>
                          <Icon name={meta.icon as IconName} />
                        </span>
                        <span className="transaction-detail">
                          {reviewFeatureAvailable ? (
                            <span className={styles.rowReviewLine}>
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
                            </span>
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
                        </span>
                        <time dateTime={transaction.occurredAt}>
                          {transaction.relativeDate}
                        </time>
                        <MoneyValue
                          amount={transaction.amount}
                          mode="kind"
                          kind={transaction.kind}
                          emphasis="strong"
                          className="manager-amount"
                        />
                        {transaction.isRecurringPayment ? (
                          <Link
                            href="/commitments"
                            className="recurring-lock"
                            title="Quản lý ở trang Định kỳ"
                            aria-label={`Quản lý ${transaction.note} ở trang Định kỳ`}
                          >
                            <Icon name="lock" />
                          </Link>
                        ) : (
                          <span className="manager-actions">
                            <button
                              type="button"
                              className="edit-button"
                              onClick={() => handleEditClick(transaction)}
                              disabled={isMutating}
                              aria-label={
                                isSplitExpense(transaction)
                                  ? `Khoản chia ${transaction.note} — xóa rồi tạo lại để sửa`
                                  : `Sửa giao dịch ${transaction.note}`
                              }
                            >
                              <Icon name="edit" />
                            </button>
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => handleDelete(transaction)}
                              disabled={isMutating}
                              aria-label={`Xóa giao dịch ${transaction.note}`}
                            >
                              <Icon name="trash" />
                            </button>
                          </span>
                        )}
                      </article>
                    );
                  })}
                </div>
              ))}

              {listWindow.hasMore || listWindow.total > TRANSACTION_PAGE_SIZE ? (
                <div className="list-load-more" role="status">
                  <p className="list-load-more-meta">
                    Đang hiện <span className="font-mono">{listWindow.shown}</span>
                    {" / "}
                    <span className="font-mono">{listWindow.total}</span> giao dịch
                    {listWindow.hasMore ? ` · còn ${listWindow.remaining} nữa` : ""}
                  </p>
                  {listWindow.hasMore ? (
                    <button
                      type="button"
                      className="secondary-button list-load-more-button"
                      onClick={loadMore}
                    >
                      Tải thêm {Math.min(TRANSACTION_PAGE_SIZE, listWindow.remaining)}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : transactions.length ? (
            <div className="filter-empty">
              <span>
                <Icon name="search" />
              </span>
              <h2>Không tìm thấy giao dịch</h2>
              <p>{filterError ?? "Thử đổi từ khóa hoặc bỏ bớt bộ lọc."}</p>
              <button type="button" onClick={clearFilters}>
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <EmptyState
              icon={isTimeline ? "timeline" : "arrows"}
              title="Chưa có giao dịch"
              description={
                isTimeline
                  ? "Ghi khoản chi hoặc thu để dòng tiền hiện trên timeline."
                  : "Ghi khoản chi đầu tiên để bắt đầu theo dõi dòng tiền."
              }
              actionLabel={GHI_CHI_TIEU_LABEL}
              onAction={() => setDialogOpen(true)}
              className="filter-empty-as-empty"
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
