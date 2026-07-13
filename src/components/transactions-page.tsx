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
import { UserChip, type ViewerSummary } from "@/components/user-chip";
import { TransferDialog } from "@/components/transfer-dialog";
import { EditTransactionDialog } from "@/components/edit-transaction-dialog";
import type { CreateTransferInput, UpdateMoneyTransactionInput, UpdateTransferInput } from "@/lib/sample-data";

const navItems = [
  { label: "Tổng quan", icon: "home" as const, href: "/" },
  { label: "Giao dịch", icon: "arrows" as const, href: "/transactions" },
  { label: "Ngân sách", icon: "target" as const, href: "/budgets" },
  { label: "Báo cáo", icon: "chart" as const, href: "/reports" },
  { label: "Định kỳ", icon: "calendar" as const, href: "/commitments" },
  { label: "Mục tiêu", icon: "flag" as const, href: "/goals" },
  { label: "Tài khoản", icon: "wallet" as const, href: "/accounts" },
];

type KindFilter = "all" | Transaction["kind"];

type TransactionsWorkspace = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  totalBalance: number;
  today: string;
  dataError: string | null;
};

export function TransactionsPage({ viewer, workspace }: { viewer: ViewerSummary; workspace: TransactionsWorkspace }) {
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

  async function handleTransfer(input: CreateTransferInput) { const result = await addTransfer(input); if (result.ok && result.transaction) { setTransferOpen(false); setNotice(`Đã chuyển ${formatMoney(result.transaction.amount)} từ ${result.transaction.account} sang ${result.transaction.destinationAccount}.`); window.setTimeout(() => setNotice(""), 3500); } return result; }

  async function handleUpdate(input: UpdateMoneyTransactionInput | UpdateTransferInput) { const result = await updateTransaction(input); if (result.ok && result.transaction) { setEditing(null); setNotice(`Đã cập nhật ${result.transaction.note}.`); window.setTimeout(() => setNotice(""), 3500); } return result; }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Điều hướng chính">
        <Link className="brand" href="/" aria-label="MoneyFlow, trang tổng quan">
          <span className="brand-mark"><span /></span><span>MoneyFlow</span>
        </Link>
        <nav>
          {navItems.map((item) => (
            <Link href={item.href} className={item.href === "/transactions" ? "active" : ""} key={item.label}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="#cai-dat"><Icon name="settings" /><span>Cài đặt</span></a>
          <UserChip viewer={viewer} />
        </div>
      </aside>

      <div className="page-column">
        <header className="topbar">
          <Link className="mobile-brand brand" href="/" aria-label="MoneyFlow">
            <span className="brand-mark"><span /></span><span>MoneyFlow</span>
          </Link>
          <div className="desktop-search">
            <Icon name="search" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Tìm giao dịch" placeholder="Tìm giao dịch..." />
            <kbd>⌘ K</kbd>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Thông báo"><Icon name="bell" /><span className="notification-dot" /></button>
            <button className="primary-button desktop-add" onClick={() => setDialogOpen(true)} disabled={Boolean(workspace.dataError)}><Icon name="plus" />Thêm giao dịch</button>
            <span className="mobile-avatar avatar">M</span>
          </div>
        </header>

        <main className="dashboard transactions-workspace">
          {workspace.dataError && <div className="data-alert" role="alert"><Icon name="bell" /><span>{workspace.dataError}</span></div>}
          <section className="transactions-title-row">
            <div><p className="eyebrow">Dòng tiền của bạn</p><h1>Giao dịch</h1><p>Tìm, kiểm tra và quản lý mọi khoản thu chi ở một nơi.</p></div>
            <div className="page-heading-actions"><button className="secondary-button" onClick={() => setTransferOpen(true)} disabled={Boolean(workspace.dataError) || workspace.accounts.length < 2}><Icon name="arrows" />Chuyển tiền</button><button className="primary-button mobile-page-add" onClick={() => setDialogOpen(true)} disabled={Boolean(workspace.dataError)}><Icon name="plus" />Thêm mới</button></div>
          </section>

          <section className="transaction-summary" aria-label="Tóm tắt các giao dịch đang hiển thị">
            <div><span>{filtered.length}</span><p>Giao dịch</p></div>
            <div><span className="positive">+{formatMoney(filteredTotals.income)}</span><p>Tổng thu</p></div>
            <div><span className="negative">−{formatMoney(filteredTotals.expense)}</span><p>Tổng chi</p></div>
          </section>

          <section className="transaction-manager panel">
            <div className="manager-toolbar">
              <label className="mobile-manager-search">
                <Icon name="search" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo ghi chú, danh mục..." aria-label="Tìm trong giao dịch" />
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

            {filtered.length ? (
              <div className="manager-list">
                <div className="manager-header" aria-hidden="true"><span>Giao dịch</span><span>Thời gian</span><span>Số tiền</span><span /></div>
                {filtered.map((transaction) => {
                  const meta = categoryMeta[transaction.category] ?? categoryMeta["Thu nhập khác"];
                  return (
                    <article className="manager-row" key={transaction.id}>
                      <span className={`transaction-icon ${meta.color}`}><Icon name={meta.icon as IconName} /></span>
                      <span className="transaction-detail"><strong>{transaction.note}</strong><small>{transaction.kind === "transfer" ? `${transaction.account} → ${transaction.destinationAccount}` : `${transaction.category} · ${transaction.account}`}{transaction.isRecurringPayment ? " · Từ lịch định kỳ" : ""}</small></span>
                      <time dateTime={transaction.occurredAt}>{transaction.relativeDate}</time>
                      <strong className={transaction.kind === "income" ? "manager-amount income" : transaction.kind === "transfer" ? "manager-amount transfer" : "manager-amount"}>{transaction.kind === "income" ? "+" : transaction.kind === "transfer" ? "↔ " : "−"}{formatMoney(transaction.amount)}</strong>
                      {transaction.isRecurringPayment ? <Link href="/commitments" className="recurring-lock" title="Quản lý ở trang Định kỳ" aria-label={`Quản lý ${transaction.note} ở trang Định kỳ`}><Icon name="lock" /></Link> : <span className="manager-actions"><button className="edit-button" onClick={() => setEditing(transaction)} disabled={isMutating} aria-label={`Sửa giao dịch ${transaction.note}`}><Icon name="edit" /></button><button className="delete-button" onClick={() => handleDelete(transaction)} disabled={isMutating} aria-label={`Xóa giao dịch ${transaction.note}`}><Icon name="trash" /></button></span>}
                    </article>
                  );
                })}
              </div>
            ) : transactions.length ? (
              <div className="filter-empty"><span><Icon name="search" /></span><h2>Không tìm thấy giao dịch</h2><p>Thử đổi từ khóa hoặc bỏ bớt bộ lọc.</p><button onClick={() => { setQuery(""); setKind("all"); setAccount("all"); }}>Xóa bộ lọc</button></div>
            ) : (
              <div className="filter-empty"><span><Icon name="arrows" /></span><h2>Chưa có giao dịch</h2><p>Thêm khoản thu hoặc chi đầu tiên để bắt đầu theo dõi dòng tiền.</p><button onClick={() => setDialogOpen(true)} disabled={Boolean(workspace.dataError)}>Thêm giao dịch</button></div>
            )}
          </section>
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Điều hướng di động">
        {navItems.map((item) => (
          <Link href={item.href} className={item.href === "/transactions" ? "active" : ""} key={item.label}><Icon name={item.icon} /><span>{item.label}</span></Link>
        ))}
      </nav>
      <button className="mobile-fab" onClick={() => setDialogOpen(true)} disabled={Boolean(workspace.dataError)} aria-label="Thêm giao dịch"><Icon name="plus" /></button>
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
      <div className={notice ? "toast visible" : "toast"} role="status" aria-live="polite"><span><Icon name="check" /></span>{notice}</div>
    </div>
  );
}
