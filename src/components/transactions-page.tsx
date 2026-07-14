"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AddTransactionDialog } from "@/components/add-transaction-dialog";
import { Icon, type IconName } from "@/components/icons";
import { useTransactions } from "@/hooks/use-transactions";
import { formatMoney } from "@/lib/money";
import {
  categoryMeta,
  type AccountOption,
  type CategoryOption,
  type CreateTransactionInput,
  type Transaction,
} from "@/lib/sample-data";
import { type ViewerSummary } from "@/components/user-chip";
import { TransferDialog } from "@/components/transfer-dialog";
import { EditTransactionDialog } from "@/components/edit-transaction-dialog";
import type { CreateTransferInput, UpdateMoneyTransactionInput, UpdateTransferInput } from "@/lib/sample-data";
import { AppShell } from "@/components/layout/app-shell";

type KindFilter = "all" | Transaction["kind"];

/** `timeline` = wireframes §16 (đã duyệt); `ledger` = classic sổ giao dịch. */
export type TransactionsPageVariant = "ledger" | "timeline";

type TransactionsWorkspace = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  totalBalance: number;
  today: string;
  dataError: string | null;
};

export function TransactionsPage({
  viewer,
  workspace,
  variant = "ledger",
}: {
  viewer: ViewerSummary;
  workspace: TransactionsWorkspace;
  variant?: TransactionsPageVariant;
}) {
  const isTimeline = variant === "timeline";
  const { transactions, addTransaction, addTransfer, updateTransaction, deleteTransaction, isMutating } = useTransactions({
    initialTransactions: workspace.transactions,
    accounts: workspace.accounts,
    categories: workspace.categories,
    isDemo: viewer.isDemo,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [account, setAccount] = useState("all");
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    return transactions.filter((transaction) => {
      const matchesQuery =
        !normalizedQuery ||
        `${transaction.note} ${transaction.category} ${transaction.account} ${transaction.destinationAccount ?? ""}`
          .toLocaleLowerCase("vi")
          .includes(normalizedQuery);
      const matchesKind = kind === "all" || transaction.kind === kind;
      const matchesAccount = account === "all" || transaction.account === account || transaction.destinationAccount === account;
      return matchesQuery && matchesKind && matchesAccount;
    });
  }, [account, kind, query, transactions]);

  const filteredTotals = useMemo(
    () => ({
      income: filtered.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0),
      expense: filtered.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0),
    }),
    [filtered],
  );

  const grouped = useMemo(() => {
    const groups: {
      date: string;
      relativeDate: string;
      displayDate: string;
      transactions: typeof filtered;
      netForDay: number;
    }[] = [];

    for (const tx of filtered) {
      let group = groups.find((g) => g.date === tx.occurredOn);
      if (!group) {
        const parts = tx.occurredOn.split("-");
        const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : tx.occurredOn;
        group = {
          date: tx.occurredOn,
          relativeDate: tx.relativeDate,
          displayDate,
          transactions: [],
          netForDay: 0,
        };
        groups.push(group);
      }
      group.transactions.push(tx);
      if (tx.kind === "income") {
        group.netForDay += tx.amount;
      } else if (tx.kind === "expense") {
        group.netForDay -= tx.amount;
      }
    }

    return groups;
  }, [filtered]);

  async function handleAdd(input: CreateTransactionInput) {
    const result = await addTransaction(input);
    if (result.ok && result.transaction) {
      setDialogOpen(false);
      setNotice(`Đã thêm ${result.transaction.note}.`);
      window.setTimeout(() => setNotice(""), 3500);
    }
    return result;
  }

  async function handleDelete(transaction: Transaction) {
    if (transaction.isRecurringPayment) { setNotice("Khoản này được quản lý ở trang Định kỳ."); window.setTimeout(() => setNotice(""), 3500); return; }
    const confirmed = window.confirm(
      `Xóa giao dịch “${transaction.note}” (${formatMoney(transaction.amount)})? Giao dịch sẽ được ẩn khỏi sổ của bạn.`,
    );
    if (!confirmed) return;
    const result = await deleteTransaction(transaction.id);
    setNotice(result.ok ? `Đã xóa ${transaction.note}.` : result.message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function handleUpdate(input: UpdateMoneyTransactionInput | UpdateTransferInput) {
    const result = await updateTransaction(input);
    if (result.ok) {
      setEditing(null);
      setNotice("Đã cập nhật giao dịch.");
      window.setTimeout(() => setNotice(""), 3500);
    }
    return result;
  }

  async function handleTransfer(input: CreateTransferInput) {
    const result = await addTransfer(input);
    if (result.ok) {
      setTransferOpen(false);
      setNotice("Đã chuyển ví thành công.");
      window.setTimeout(() => setNotice(""), 3500);
    }
    return result;
  }

  return (
    <AppShell
      viewer={viewer}
      primaryAction={
        isTimeline
          ? {
              label: "Mở Inbox",
              href: "/inbox",
            }
          : {
              label: "Thêm giao dịch",
              onClick: () => setDialogOpen(true),
              disabled: Boolean(workspace.dataError),
            }
      }
      fabAction={
        isTimeline
          ? {
              label: "Capture",
              href: "/capture",
            }
          : {
              label: "Thêm giao dịch",
              onClick: () => setDialogOpen(true),
              disabled: Boolean(workspace.dataError),
            }
      }
      notice={notice}
    >
      <main className={`dashboard transactions-workspace${isTimeline ? " timeline-workspace" : ""}`}>
        {workspace.dataError && <div className="data-alert" role="alert"><Icon name="bell" /><span>{workspace.dataError}</span></div>}
        <section className="transactions-title-row">
          <div>
            <p className="eyebrow">{isTimeline ? "Sổ đã duyệt" : "Dòng tiền của bạn"}</p>
            <h1>{isTimeline ? "Dòng thời gian (đã duyệt)" : "Sổ giao dịch"}</h1>
            <p>
              {isTimeline
                ? "Các giao dịch đã được duyệt từ Inbox — nguồn tin cậy cho số dư và insights."
                : "Kiểm tra và quản lý mọi khoản thu chi phát sinh."}
            </p>
          </div>
          <div className="page-heading-actions">
            {isTimeline ? (
              <Link className="secondary-button" href="/reports/export?period=month">
                <Icon name="archive" /> Export
              </Link>
            ) : (
              <button className="secondary-button" onClick={() => setTransferOpen(true)} disabled={workspace.accounts.length < 2 || Boolean(workspace.dataError)}>
                <Icon name="arrows" /> Chuyển tiền ví
              </button>
            )}
          </div>
        </section>

        <section className="transaction-summary">
          <div><span className="font-mono">{filtered.length}</span><p>{isTimeline ? "Đã duyệt" : "Giao dịch"}</p></div>
          <div><span className="positive font-mono">+{formatMoney(filteredTotals.income)}</span><p>Tổng thu</p></div>
          <div><span className="negative font-mono">−{formatMoney(filteredTotals.expense)}</span><p>Tổng chi</p></div>
        </section>

        <section className="transaction-manager panel">
          <div className="manager-toolbar">
            <label className="mobile-manager-search">
              <Icon name="search" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo ghi chú, danh mục..." aria-label={isTimeline ? "Tìm trong dòng thời gian" : "Tìm trong giao dịch"} />
            </label>
            <div className="filter-group" aria-label="Lọc theo loại">
              {(["all", "expense", "income", "transfer"] as KindFilter[]).map((value) => (
                <button key={value} className={kind === value ? "active" : ""} onClick={() => setKind(value)} aria-pressed={kind === value}>
                  {value === "all" ? "Tất cả" : value === "expense" ? "Khoản chi" : value === "income" ? "Khoản thu" : "Chuyển tiền"}
                </button>
              ))}
            </div>
            <label className="account-filter"><span className="sr-only">Lọc theo tài khoản</span><select value={account} onChange={(event) => setAccount(event.target.value)}><option value="all">Mọi tài khoản</option>{workspace.accounts.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}</select></label>
          </div>

          {grouped.length ? (
            <div className="manager-list">
              <div className="manager-header" aria-hidden="true"><span>Giao dịch</span><span>Thời gian</span><span>Số tiền</span><span /></div>
              {grouped.map((group) => (
                <div key={group.date}>
                  <div className="date-group-header">
                    <span className="date-group-title">{group.relativeDate}, {group.displayDate}</span>
                    <span className={`date-group-total font-mono ${group.netForDay > 0 ? "positive" : group.netForDay < 0 ? "negative" : ""}`}>
                      Tổng: {group.netForDay > 0 ? "+" : group.netForDay < 0 ? "−" : ""}{formatMoney(Math.abs(group.netForDay))}
                    </span>
                  </div>
                  {group.transactions.map((transaction) => {
                    const meta = categoryMeta[transaction.category] ?? categoryMeta["Thu nhập khác"];
                    return (
                      <article className="manager-row" key={transaction.id}>
                        <span className={`transaction-icon ${meta.color}`}><Icon name={meta.icon as IconName} /></span>
                        <span className="transaction-detail"><strong>{transaction.note}</strong><small>{transaction.kind === "transfer" ? `${transaction.account} → ${transaction.destinationAccount}` : `${transaction.category} · ${transaction.account}`}{transaction.isRecurringPayment ? " · Từ lịch định kỳ" : ""}</small></span>
                        <time dateTime={transaction.occurredAt}>{transaction.relativeDate}</time>
                        <strong className={`font-mono ${transaction.kind === "income" ? "manager-amount income" : transaction.kind === "transfer" ? "manager-amount transfer" : "manager-amount"}`}>{transaction.kind === "income" ? "+ ↑ " : transaction.kind === "transfer" ? "↔ " : "− ↓ "}{formatMoney(transaction.amount)}</strong>
                        {transaction.isRecurringPayment ? <Link href="/commitments" className="recurring-lock" title="Quản lý ở trang Định kỳ" aria-label={`Quản lý ${transaction.note} ở trang Định kỳ`}><Icon name="lock" /></Link> : <span className="manager-actions"><button className="edit-button" onClick={() => setEditing(transaction)} disabled={isMutating} aria-label={`Sửa giao dịch ${transaction.note}`}><Icon name="edit" /></button><button className="delete-button" onClick={() => handleDelete(transaction)} disabled={isMutating} aria-label={`Xóa giao dịch ${transaction.note}`}><Icon name="trash" /></button></span>}
                      </article>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : transactions.length ? (
            <div className="filter-empty"><span><Icon name="search" /></span><h2>Không tìm thấy giao dịch</h2><p>Thử đổi từ khóa hoặc bỏ bớt bộ lọc.</p><button onClick={() => { setQuery(""); setKind("all"); setAccount("all"); }}>Xóa bộ lọc</button></div>
          ) : isTimeline ? (
            <div className="filter-empty">
              <span><Icon name="timeline" /></span>
              <h2>Chưa có giao dịch đã duyệt</h2>
              <p>Chưa có giao dịch sạch — hãy xử lý Inbox hoặc Capture để đưa khoản vào sổ.</p>
              <div className="empty-state-actions">
                <Link className="primary-button" href="/inbox">
                  <Icon name="inbox" /> Mở Inbox
                </Link>
                <Link className="secondary-button" href="/capture">
                  <Icon name="plus" /> Capture
                </Link>
              </div>
            </div>
          ) : (
            <div className="filter-empty"><span><Icon name="arrows" /></span><h2>Chưa có giao dịch</h2><p>Thêm khoản thu hoặc chi đầu tiên để bắt đầu theo dõi dòng tiền.</p><button onClick={() => setDialogOpen(true)} disabled={Boolean(workspace.dataError)}>Thêm giao dịch</button></div>
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
      <TransferDialog open={transferOpen} accounts={workspace.accounts} onClose={() => setTransferOpen(false)} onTransfer={handleTransfer} />
      {editing && <EditTransactionDialog key={editing.id} transaction={editing} accounts={workspace.accounts} categories={workspace.categories} onClose={() => setEditing(null)} onSave={handleUpdate} disabled={isMutating || Boolean(workspace.dataError)} />}
    </AppShell>
  );
}

