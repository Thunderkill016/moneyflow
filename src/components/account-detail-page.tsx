"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon, type IconName } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import type { ViewerSummary } from "@/components/user-chip";
import {
  accountKindLabels,
  type AccountSummary,
} from "@/lib/accounts";
import type {
  AccountRegisterEntry,
  AccountRegisterFilter,
  AccountRegisterSummary,
} from "@/lib/account-register";
import {
  buildAccountRegister,
  filterAccountRegisterEntries,
  reconcileAccountBalanceSnapshot,
  summarizeAccountRegister,
} from "@/lib/account-register";
import { formatMoney } from "@/lib/money";
import {
  GHI_CHI_TIEU_HREF,
  GHI_CHI_TIEU_LABEL,
} from "@/lib/nav-ia";
import {
  readDemoTransactionBaseline,
  readStoredTransactions,
} from "@/lib/transaction-store";
import styles from "./account-detail-page.module.css";

function accountIcon(kind: AccountSummary["kind"]): IconName {
  if (kind === "bank" || kind === "savings") return "bank";
  if (kind === "credit_card") return "card";
  return "wallet";
}

function displayDate(date: string) {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

// Same order as the transactions toolbar: all → expense → income → transfer.
const REGISTER_KIND_FILTERS = [
  "all",
  "expense",
  "income",
  "transfer",
] as const;

function registerKindLabel(value: AccountRegisterFilter["kind"]) {
  if (value === "income") return "Khoản thu";
  if (value === "expense") return "Khoản chi";
  if (value === "transfer") return "Chuyển tiền";
  return "Tất cả";
}

function entrySubtitle(entry: AccountRegisterEntry) {
  const { transaction } = entry;
  if (transaction.kind === "transfer") {
    const counterparty = entry.transferCounterparty ?? "tài khoản khác";
    return entry.direction === "in"
      ? `Nhận từ ${counterparty} · không tính thu nhập`
      : `Chuyển đến ${counterparty} · không tính chi tiêu`;
  }

  const splitDetail = transaction.splits?.length
    ? ` · ${transaction.splits.map((line) => line.category).join(" · ")}`
    : "";
  return `${transaction.category}${splitDetail}`;
}

type AccountRegisterGroup = {
  date: string;
  relativeDate: string;
  entries: AccountRegisterEntry[];
  dailyImpact: number;
};

function groupEntries(entries: AccountRegisterEntry[]): AccountRegisterGroup[] {
  const groups: AccountRegisterGroup[] = [];
  for (const entry of entries) {
    const { transaction } = entry;
    let group = groups.find((item) => item.date === transaction.occurredOn);
    if (!group) {
      group = {
        date: transaction.occurredOn,
        relativeDate: transaction.relativeDate,
        entries: [],
        dailyImpact: 0,
      };
      groups.push(group);
    }
    group.entries.push(entry);
    group.dailyImpact += entry.impact;
  }
  return groups;
}

export function AccountDetailPage({
  viewer,
  account,
  entries,
  summary,
  dataError,
}: {
  viewer: ViewerSummary;
  account: AccountSummary | null;
  entries: AccountRegisterEntry[];
  summary: AccountRegisterSummary;
  dataError: string | null;
}) {
  const [demoDetail, setDemoDetail] = useState<{
    account: AccountSummary | null;
    entries: AccountRegisterEntry[];
    summary: AccountRegisterSummary;
  } | null>(null);
  const [registerFilter, setRegisterFilter] = useState<AccountRegisterFilter>({
    kind: "all",
    query: "",
  });

  useEffect(() => {
    if (!viewer.isDemo || !account) return;
    const frame = window.requestAnimationFrame(() => {
      const liveEntries = buildAccountRegister(
        readStoredTransactions(),
        account.id,
      );
      const baselineEntries = buildAccountRegister(
        readDemoTransactionBaseline(),
        account.id,
      );
      setDemoDetail({
        account: {
          ...account,
          balance: reconcileAccountBalanceSnapshot(
            account.balance,
            baselineEntries,
            liveEntries,
          ),
        },
        entries: liveEntries,
        summary: summarizeAccountRegister(liveEntries),
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [account, entries, summary, viewer.isDemo]);

  const matchingDemoDetail =
    viewer.isDemo && account && demoDetail?.account?.id === account.id
      ? demoDetail
      : null;
  const displayAccount = matchingDemoDetail?.account ?? account;
  const displayEntries = matchingDemoDetail?.entries ?? entries;
  const displaySummary = matchingDemoDetail?.summary ?? summary;
  const demoLedgerPending =
    viewer.isDemo && !dataError && Boolean(account) && !matchingDemoDetail;
  // Filtering narrows only the visible rows; `displaySummary` stays register-wide.
  const filteredEntries = filterAccountRegisterEntries(
    displayEntries,
    registerFilter,
  );
  const registerFilterActive =
    registerFilter.kind !== "all" || registerFilter.query.trim() !== "";
  const groups = groupEntries(filteredEntries);
  const registerAvailable = !dataError;

  return (
    <AppShell
      viewer={viewer}
      primaryAction={{
        label: GHI_CHI_TIEU_LABEL,
        href: GHI_CHI_TIEU_HREF,
        icon: "plus",
        disabled: Boolean(dataError),
      }}
      fabAction={{
        label: GHI_CHI_TIEU_LABEL,
        href: GHI_CHI_TIEU_HREF,
        icon: "plus",
        disabled: Boolean(dataError),
      }}
    >
      <main className={styles.workspace}>
        <nav className={styles.breadcrumb} aria-label="Điều hướng tài khoản">
          <Link href="/accounts">
            <Icon name="arrowRight" className={styles.backIcon} />
            Tất cả tài khoản
          </Link>
        </nav>

        {dataError ? (
          <div className="data-alert" role="alert">
            <Icon name="bell" />
            <span>{dataError}</span>
          </div>
        ) : null}

        {!displayAccount ? (
          <section className={styles.errorPanel}>
            <p className="eyebrow">Sổ tài khoản</p>
            <h1>Chưa tải được tài khoản</h1>
            <p>Hãy quay lại danh sách tài khoản và thử lại.</p>
            <Link className="secondary-button" href="/accounts">
              Quay lại tài khoản
            </Link>
          </section>
        ) : (
          <>
            <section className={styles.heading}>
              <div className={styles.identity}>
                <span className={styles.accountIcon}>
                  <Icon name={accountIcon(displayAccount.kind)} />
                </span>
                <div>
                  <p className="eyebrow">Sổ tài khoản</p>
                  <div className={styles.titleLine}>
                    <h1>{displayAccount.name}</h1>
                    {displayAccount.isArchived ? (
                      <span className={styles.archivedBadge}>Đã lưu trữ</span>
                    ) : null}
                  </div>
                  <p>
                    {accountKindLabels[displayAccount.kind]} · {displayAccount.currencyCode}
                    {displayAccount.currencyCode !== "VND" ? " · chỉ theo dõi" : ""}
                  </p>
                </div>
              </div>
              <div className={styles.headingActions}>
                <Link
                  className="secondary-button"
                  href={`/accounts/${displayAccount.id}/reconcile`}
                >
                  <Icon name="check" />
                  Đối soát
                </Link>
                <Link className="secondary-button" href="/transactions">
                  <Icon name="timeline" />
                  Mở sổ giao dịch
                </Link>
              </div>
            </section>

            {demoLedgerPending ? (
              <section
                className={styles.ledgerPending}
                role="status"
                aria-live="polite"
                aria-label="Đang đối soát sổ tài khoản"
              >
                <p className="eyebrow">Sổ tài khoản</p>
                <h2>Đang đối soát giao dịch trên thiết bị</h2>
                <p>
                  Số dư, tổng biến động và lịch sử sẽ hiển thị sau khi sổ giao dịch demo
                  được đọc xong.
                </p>
              </section>
            ) : (
              <>
                <section
                  className={`${styles.summaryGrid} ${
                    registerAvailable ? "" : styles.summaryGridSingle
                  }`}
                  aria-label="Tóm tắt tài khoản"
                >
              <article className={styles.summaryPrimary}>
                <span>Số dư hiện tại</span>
                <MoneyValue
                  amount={displayAccount.balance}
                  mode="plain"
                  currencyCode={displayAccount.currencyCode}
                  emphasis="strong"
                  align="start"
                  label={`Số dư hiện tại ${displayAccount.name}`}
                />
                <small>
                  Số dư ban đầu:{" "}
                  <span className="font-mono">
                    {formatMoney(
                      displayAccount.initialBalance,
                      false,
                      displayAccount.currencyCode,
                    )}
                  </span>
                </small>
              </article>
              {registerAvailable ? (
                <>
                  <article>
                    <span>Thu nhập</span>
                    <MoneyValue
                      amount={displaySummary.income}
                      mode="kind"
                      kind="income"
                      currencyCode={displayAccount.currencyCode}
                      emphasis="strong"
                      align="start"
                      label="Thu nhập của tài khoản"
                    />
                    <small>Không gồm chuyển tiền nội bộ</small>
                  </article>
                  <article>
                    <span>Chi tiêu</span>
                    <MoneyValue
                      amount={displaySummary.expense}
                      mode="kind"
                      kind="expense"
                      currencyCode={displayAccount.currencyCode}
                      emphasis="strong"
                      align="start"
                      label="Chi tiêu của tài khoản"
                    />
                    <small>Không gồm chuyển tiền nội bộ</small>
                  </article>
                  <article>
                    <span>Chuyển ròng</span>
                    <MoneyValue
                      amount={displaySummary.transferIn - displaySummary.transferOut}
                      mode="signed"
                      currencyCode={displayAccount.currencyCode}
                      emphasis="strong"
                      align="start"
                      label="Chuyển ròng của tài khoản"
                    />
                    <small>
                      Vào {formatMoney(displaySummary.transferIn, false, displayAccount.currencyCode)} · Ra{" "}
                      {formatMoney(displaySummary.transferOut, false, displayAccount.currencyCode)}
                    </small>
                  </article>
                </>
              ) : null}
            </section>

            {registerAvailable ? (
              <section className={styles.registerPanel} aria-labelledby="account-register-title">
                <div className={styles.registerHeading}>
                  <div>
                    <p className="eyebrow">Lịch sử số dư</p>
                    <h2 id="account-register-title">Biến động tài khoản</h2>
                    <p>
                      {displaySummary.transactionCount} giao dịch · Biến động ghi nhận{" "}
                      <MoneyValue
                        amount={displaySummary.netMovement}
                        mode="signed"
                        currencyCode={displayAccount.currencyCode}
                        label="Biến động ghi nhận"
                      />
                    </p>
                  </div>
                </div>

                {displayEntries.length ? (
                  <div className={styles.registerControls}>
                    <label className={styles.searchField}>
                      <span>Tìm trong sổ</span>
                      <div className={styles.searchControl}>
                        <Icon name="search" />
                        <input
                          value={registerFilter.query}
                          onChange={(event) =>
                            setRegisterFilter((filter) => ({
                              ...filter,
                              query: event.target.value,
                            }))
                          }
                          placeholder="Ghi chú, người nhận, danh mục..."
                          aria-label="Tìm trong biến động tài khoản"
                        />
                      </div>
                    </label>

                    <div
                      className={styles.kindFilter}
                      aria-label="Lọc theo loại biến động"
                    >
                      {REGISTER_KIND_FILTERS.map((value) => (
                        <Button
                          type="button"
                          unstyled
                          targetSize="important"
                          key={value}
                          className={`${styles.kindButton}${
                            registerFilter.kind === value
                              ? ` ${styles.kindButtonActive}`
                              : ""
                          }`}
                          onClick={() =>
                            setRegisterFilter((filter) => ({
                              ...filter,
                              kind: value,
                            }))
                          }
                          aria-pressed={registerFilter.kind === value}
                        >
                          {registerKindLabel(value)}
                        </Button>
                      ))}
                    </div>

                    {registerFilterActive ? (
                      <p className={styles.registerFilterMeta}>
                        Đang hiển thị {filteredEntries.length}/
                        {displayEntries.length} giao dịch
                        <button
                          type="button"
                          className={styles.resetFilter}
                          onClick={() =>
                            setRegisterFilter({ kind: "all", query: "" })
                          }
                        >
                          Xoá lọc
                        </button>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {groups.length ? (
                  <div className={styles.registerList}>
                    {groups.map((group) => (
                      <section key={group.date} className={styles.dateGroup}>
                        <header className={styles.dateHeader}>
                          <span>
                            {group.relativeDate}, {displayDate(group.date)}
                          </span>
                          <MoneyValue
                            amount={group.dailyImpact}
                            mode="signed"
                            currencyCode={displayAccount.currencyCode}
                            label={`Biến động ngày ${displayDate(group.date)}`}
                          />
                        </header>
                        <div className={styles.rows}>
                          {group.entries.map((entry) => (
                            <article className={styles.row} key={entry.transaction.id}>
                              <span className={styles.rowIcon}>
                                <Icon
                                  name={
                                    entry.transaction.kind === "transfer"
                                      ? "arrows"
                                      : "receipt"
                                  }
                                />
                              </span>
                              <div className={styles.rowDetail}>
                                <strong>{entry.transaction.note}</strong>
                                <small>{entrySubtitle(entry)}</small>
                              </div>
                              <time dateTime={entry.transaction.occurredAt}>
                                {entry.transaction.relativeDate}
                              </time>
                              <MoneyValue
                                amount={entry.impact}
                                mode="signed"
                                currencyCode={displayAccount.currencyCode}
                                emphasis="strong"
                                className={styles.rowAmount}
                                label={`${entry.transaction.note}, tác động tài khoản`}
                              />
                            </article>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : displayEntries.length ? (
                  <div className={styles.filteredEmpty} role="status">
                    <p>Không có biến động nào khớp bộ lọc đang dùng.</p>
                    <Button
                      type="button"
                      intent="secondary"
                      targetSize="important"
                      onClick={() =>
                        setRegisterFilter({ kind: "all", query: "" })
                      }
                    >
                      Xoá bộ lọc
                    </Button>
                  </div>
                ) : (
                  <EmptyState
                    icon="receipt"
                    title="Chưa có biến động trong tài khoản này"
                    description="Số dư hiện tại vẫn được giữ nguyên. Ghi giao dịch mới để bắt đầu lịch sử."
                    actionLabel={GHI_CHI_TIEU_LABEL}
                    actionHref={GHI_CHI_TIEU_HREF}
                    className={styles.emptyState}
                  />
                )}
              </section>
            ) : (
              <section className={styles.errorPanel} aria-labelledby="register-unavailable-title">
                <p className="eyebrow">Lịch sử số dư</p>
                <h2 id="register-unavailable-title">Chưa tải được biến động tài khoản</h2>
                <p>MoneyFlow không hiển thị tổng thu, chi hoặc chuyển tiền khi dữ liệu lịch sử chưa xác thực.</p>
                <Link className="secondary-button" href={`/accounts/${displayAccount.id}`}>
                  Thử tải lại
                </Link>
              </section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}
