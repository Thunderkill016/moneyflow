"use client";

import { useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { type ViewerSummary } from "@/components/user-chip";
import { useTransactionLedger } from "@/hooks/use-transaction-ledger";
import { formatMoney } from "@/lib/money";
import {
  categoryMeta,
  type AccountOption,
  type CategoryOption,
  type Transaction,
} from "@/lib/sample-data";
import { GHI_CHI_TIEU_HREF, GHI_CHI_TIEU_LABEL } from "@/lib/nav-ia";
import { isSplitExpense } from "@/lib/splits";
import { filterTransactions } from "@/lib/transaction-filters";
import { getTransactionReviewStatus } from "@/lib/transaction-review";
import { transferRowSubtitle } from "@/lib/transfers";
import styles from "./transactions-workspace.module.css";

type TimelineWorkspaceData = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  totalBalance: number;
  today: string;
  dataError: string | null;
  reviewFeatureAvailable?: boolean;
};

type DayGroup = {
  date: string;
  relativeDate: string;
  displayDate: string;
  transactions: Transaction[];
  netForDay: number;
};

function iconTone(kind: Transaction["kind"]) {
  if (kind === "income") return styles.iconIncome;
  if (kind === "transfer") return styles.iconTransfer;
  return styles.iconExpense;
}

export function TimelineWorkspace({
  viewer,
  workspace,
}: {
  viewer: ViewerSummary;
  workspace: TimelineWorkspaceData;
}) {
  const [query, setQuery] = useState("");
  const transactions = useTransactionLedger({
    initialTransactions: workspace.transactions,
    isDemo: viewer.isDemo,
  });

  const reviewed = useMemo(
    () =>
      transactions.filter(
        (transaction) => getTransactionReviewStatus(transaction) === "reviewed",
      ),
    [transactions],
  );

  const filtered = useMemo(
    () =>
      filterTransactions(reviewed, {
        query,
        kind: "all",
        account: "all",
        category: "all",
        review: "reviewed",
        fromDate: "",
        toDate: "",
        minAmountInput: "",
        maxAmountInput: "",
      }),
    [query, reviewed],
  );

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
    for (const transaction of filtered) {
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
  }, [filtered]);

  return (
    <AppShell
      viewer={viewer}
      searchBar={{
        value: query,
        onChange: setQuery,
        placeholder: "Tìm trong dòng thời gian...",
      }}
      primaryAction={{
        label: GHI_CHI_TIEU_LABEL,
        href: GHI_CHI_TIEU_HREF,
        icon: "plus",
      }}
      fabAction={{
        label: GHI_CHI_TIEU_LABEL,
        href: GHI_CHI_TIEU_HREF,
        icon: "plus",
      }}
    >
      <main
        className={`${styles.workspace} ${styles.timeline}`}
        data-slot="timeline-workspace"
      >
        {workspace.dataError ? (
          <Alert tone="error" live="assertive" className={styles.dataAlert}>
            <AlertDescription className={styles.alertContent}>
              <Icon name="bell" />
              <span>{workspace.dataError}</span>
            </AlertDescription>
          </Alert>
        ) : null}

        <section className={styles.titleRow} aria-labelledby="timeline-title">
          <div className={styles.titleCopy}>
            <p className={styles.eyebrow}>Sổ đã duyệt</p>
            <h1 id="timeline-title">Dòng thời gian (đã duyệt)</h1>
            <p>
              Các giao dịch đã được duyệt — nguồn tin cậy cho số dư và báo cáo.
            </p>
          </div>
          <div className={styles.headingActions}>
            <LinkButton
              href="/reports/export?period=month"
              intent="secondary"
              targetSize="important"
            >
              <Icon name="archive" /> Export
            </LinkButton>
          </div>
        </section>

        <section
          className={styles.summary}
          aria-label="Tóm tắt giao dịch đã duyệt"
          aria-live="polite"
          data-slot="timeline-summary"
        >
          <div className={styles.summaryItem}>
            <p>Đã duyệt</p>
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

        <section className={styles.manager} aria-label="Dòng thời gian đã duyệt">
          <div className={styles.toolbar} data-slot="timeline-search">
            <label className={styles.searchField}>
              <span>Tìm giao dịch đã duyệt</span>
              <div className={styles.searchControl}>
                <Icon name="search" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm theo ghi chú, danh mục..."
                  aria-label="Tìm trong dòng thời gian"
                />
              </div>
            </label>
          </div>

          {grouped.length ? (
            <div className={styles.list} data-slot="timeline-list">
              <div className={styles.listHeader} aria-hidden="true">
                <span>Giao dịch</span>
                <span>Số tiền</span>
                <span>Trạng thái</span>
              </div>

              {grouped.map((group) => (
                <section
                  className={styles.dayGroup}
                  key={group.date}
                  data-slot="timeline-day-group"
                  aria-labelledby={`timeline-day-${group.date}`}
                >
                  <header className={styles.dayHeader}>
                    <h2 id={`timeline-day-${group.date}`}>
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
                    return (
                      <article
                        className={styles.row}
                        key={transaction.id}
                        data-slot="timeline-row"
                        data-transaction-id={transaction.id}
                      >
                        <span
                          className={`${styles.transactionIcon} ${iconTone(
                            transaction.kind,
                          )}`}
                        >
                          <Icon name={meta.icon as IconName} />
                        </span>
                        <div className={styles.detail}>
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
                        <span
                          className={`${styles.reviewBadge} ${styles.reviewed}`}
                          style={{ justifySelf: "end", alignSelf: "center" }}
                        >
                          Đã duyệt
                        </span>
                      </article>
                    );
                  })}
                </section>
              ))}
            </div>
          ) : reviewed.length ? (
            <EmptyState
              icon={<Icon name="search" />}
              title="Không tìm thấy giao dịch đã duyệt"
              description="Thử đổi từ khóa tìm kiếm."
              primaryAction={
                <LinkButton
                  href="/timeline"
                  intent="secondary"
                  targetSize="important"
                >
                  Xóa tìm kiếm
                </LinkButton>
              }
              className={styles.emptyState}
            />
          ) : (
            <EmptyState
              icon={<Icon name="timeline" />}
              title="Chưa có giao dịch đã duyệt"
              description="Ghi giao dịch mới rồi duyệt trong Sổ giao dịch để đưa vào dòng thời gian tin cậy."
              primaryAction={
                <LinkButton
                  href="/transactions"
                  intent="secondary"
                  targetSize="important"
                >
                  Mở Sổ giao dịch
                </LinkButton>
              }
              className={styles.emptyState}
            />
          )}
        </section>
      </main>
    </AppShell>
  );
}
