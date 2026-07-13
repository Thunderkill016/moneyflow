"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { saveAccountAction, setAccountArchivedAction } from "@/app/actions/accounts";
import { createTransferAction } from "@/app/actions/transactions";
import { AccountDialog } from "@/components/account-dialog";
import { Icon, type IconName } from "@/components/icons";
import { UserChip, type ViewerSummary } from "@/components/user-chip";
import { accountKindLabels, type AccountSummary, type SaveAccountInput } from "@/lib/accounts";
import { formatMoney } from "@/lib/money";
import { TransferDialog } from "@/components/transfer-dialog";
import type { CreateTransferInput, Transaction } from "@/lib/sample-data";
import { readStoredTransactions, writeStoredTransactions } from "@/lib/transaction-store";
import { applyTransferBalances } from "@/lib/transfers";

const navItems = [
  { label: "Tổng quan", icon: "home" as const, href: "/" },
  { label: "Giao dịch", icon: "arrows" as const, href: "/transactions" },
  { label: "Ngân sách", icon: "target" as const, href: "/budgets" },
  { label: "Báo cáo", icon: "chart" as const, href: "/reports" },
  { label: "Định kỳ", icon: "calendar" as const, href: "/commitments" },
  { label: "Mục tiêu", icon: "flag" as const, href: "/goals" },
  { label: "Tài khoản", icon: "wallet" as const, href: "/accounts" },
];

function accountIcon(kind: AccountSummary["kind"]): IconName {
  if (kind === "bank" || kind === "savings") return "bank";
  if (kind === "credit_card") return "card";
  return "wallet";
}

export function AccountsPage({ viewer, initialAccounts, dataError }: { viewer: ViewerSummary; initialAccounts: AccountSummary[]; dataError: string | null }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editing, setEditing] = useState<AccountSummary | null>(null);
  const [dialogVersion, setDialogVersion] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const activeAccounts = accounts.filter((item) => !item.isArchived);
  const archivedAccounts = accounts.filter((item) => item.isArchived);
  const totalBalance = useMemo(() => activeAccounts.reduce((sum, item) => sum + item.balance, 0), [activeAccounts]);

  useEffect(() => {
    if (!viewer.isDemo) return;
    const frame = window.requestAnimationFrame(() => {
      const restored = readStoredTransactions()
        .filter((transaction) => transaction.kind === "transfer" && transaction.destinationAccountId)
        .reduce((current, transaction) => applyTransferBalances(current, transaction.accountId, transaction.destinationAccountId!, transaction.amount), initialAccounts);
      setAccounts(restored);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialAccounts, viewer.isDemo]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function openAccount(account: AccountSummary | null) {
    setEditing(account);
    setDialogVersion((value) => value + 1);
    setDialogOpen(true);
  }

  async function saveAccount(input: SaveAccountInput) {
    if (viewer.isDemo) {
      const next: AccountSummary = {
        id: input.id ?? crypto.randomUUID(),
        name: input.name,
        kind: input.kind,
        currencyCode: "VND",
        initialBalance: input.initialBalance,
        balance: input.initialBalance,
        isArchived: false,
      };
      setAccounts((current) => input.id ? current.map((item) => item.id === input.id ? { ...next, balance: next.initialBalance + (item.balance - item.initialBalance), isArchived: item.isArchived } : item) : [...current, next]);
      setDialogOpen(false);
      setNotice(input.id ? "Đã cập nhật tài khoản demo." : "Đã thêm tài khoản demo.");
      return { ok: true };
    }

    const result = await saveAccountAction(input);
    if (result.ok && result.account) {
      setAccounts((current) => input.id ? current.map((item) => item.id === input.id ? result.account as AccountSummary : item) : [...current, result.account as AccountSummary]);
      setDialogOpen(false);
      setNotice(input.id ? "Đã cập nhật tài khoản." : "Đã thêm tài khoản.");
    }
    return result;
  }

  async function toggleArchived(account: AccountSummary) {
    const archived = !account.isArchived;
    if (archived && !window.confirm(`Lưu trữ tài khoản “${account.name}”? Tài khoản sẽ không xuất hiện khi thêm giao dịch mới.`)) return;
    setBusyId(account.id);
    const result = viewer.isDemo ? { ok: true as const } : await setAccountArchivedAction(account.id, archived);
    setBusyId(null);
    if (!result.ok) { setNotice(result.message); return; }
    setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, isArchived: archived } : item));
    setNotice(archived ? "Đã lưu trữ tài khoản." : "Đã khôi phục tài khoản.");
  }

  async function transfer(input: CreateTransferInput) {
    const source = activeAccounts.find((item) => item.id === input.sourceAccountId); const destination = activeAccounts.find((item) => item.id === input.destinationAccountId);
    if (!source || !destination || source.id === destination.id) return { ok: false, message: "Chọn hai tài khoản hoạt động khác nhau." };
    if (viewer.isDemo) {
      const transaction: Transaction = { id: crypto.randomUUID(), kind: "transfer", categoryId: "", category: "Chuyển tiền", note: input.note || "Chuyển tiền", accountId: source.id, account: source.name, destinationAccountId: destination.id, destinationAccount: destination.name, amount: input.amount, occurredOn: input.occurredOn, occurredAt: new Date().toISOString(), relativeDate: "Vừa xong" };
      writeStoredTransactions([transaction, ...readStoredTransactions()]); setAccounts((current) => applyTransferBalances(current, source.id, destination.id, input.amount)); setTransferOpen(false); setNotice(`Đã chuyển ${formatMoney(input.amount)} sang ${destination.name}.`); return { ok: true };
    }
    const result = await createTransferAction(input); if (result.ok) { setAccounts((current) => applyTransferBalances(current, source.id, destination.id, input.amount)); setTransferOpen(false); setNotice(`Đã chuyển ${formatMoney(input.amount)} sang ${destination.name}.`); } return result;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Điều hướng chính">
        <Link className="brand" href="/" aria-label="MoneyFlow, trang tổng quan"><span className="brand-mark"><span /></span><span>MoneyFlow</span></Link>
        <nav>{navItems.map((item) => <Link href={item.href} className={item.href === "/accounts" ? "active" : ""} key={item.label}><Icon name={item.icon} /><span>{item.label}</span></Link>)}</nav>
        <div className="sidebar-bottom"><a href="#cai-dat"><Icon name="settings" /><span>Cài đặt</span></a><UserChip viewer={viewer} /></div>
      </aside>

      <div className="page-column">
        <header className="topbar"><Link className="mobile-brand brand" href="/" aria-label="MoneyFlow"><span className="brand-mark"><span /></span><span>MoneyFlow</span></Link><div /><div className="topbar-actions"><button className="icon-button" aria-label="Thông báo"><Icon name="bell" /></button><button className="primary-button desktop-add" onClick={() => openAccount(null)} disabled={Boolean(dataError)}><Icon name="plus" />Thêm tài khoản</button><span className="mobile-avatar avatar">M</span></div></header>
        <main className="dashboard accounts-workspace">
          {dataError && <div className="data-alert" role="alert"><Icon name="bell" /><span>{dataError}</span></div>}
          <section className="accounts-heading"><div><p className="eyebrow">Nơi giữ tiền</p><h1>Tài khoản</h1><p>Quản lý tiền mặt, ngân hàng, ví điện tử và các khoản nợ ở một nơi.</p></div><div className="page-heading-actions"><button className="secondary-button" onClick={() => setTransferOpen(true)} disabled={Boolean(dataError) || activeAccounts.length < 2}><Icon name="arrows" />Chuyển tiền</button><button className="primary-button" onClick={() => openAccount(null)} disabled={Boolean(dataError)}><Icon name="plus" />Thêm tài khoản</button></div></section>
          <section className="accounts-summary" aria-label="Tổng quan tài khoản"><div><span>Tổng số dư</span><strong className={totalBalance < 0 ? "negative" : ""}>{formatMoney(totalBalance)}</strong><small>Trên {activeAccounts.length} tài khoản hoạt động</small></div><p>Số dư này được dùng làm nền cho dự báo “có thể chi hôm nay”. Hãy nhập số dư ban đầu đúng với thực tế.</p></section>

          <section className="accounts-section"><div className="section-heading"><div><h2>Đang hoạt động</h2><p>Có thể chọn khi ghi giao dịch mới.</p></div></div>
            {activeAccounts.length ? <div className="account-grid">{activeAccounts.map((account) => <article className="account-card" key={account.id}><div className={`account-kind-icon ${account.kind}`}><Icon name={accountIcon(account.kind)} /></div><div className="account-card-title"><div><h3>{account.name}</h3><p>{accountKindLabels[account.kind]} · {account.currencyCode}</p></div><strong className={account.balance < 0 ? "negative" : ""}>{formatMoney(account.balance)}</strong></div><div className="account-card-foot"><span>Số dư ban đầu: {formatMoney(account.initialBalance)}</span><div><button onClick={() => openAccount(account)} aria-label={`Sửa ${account.name}`}><Icon name="edit" />Sửa</button><button onClick={() => toggleArchived(account)} disabled={busyId === account.id} aria-label={`Lưu trữ ${account.name}`}><Icon name="archive" />Lưu trữ</button></div></div></article>)}</div> : <div className="account-empty"><Icon name="wallet" /><h2>Chưa có tài khoản hoạt động</h2><p>Thêm một tài khoản để bắt đầu ghi giao dịch.</p><button onClick={() => openAccount(null)}>Thêm tài khoản</button></div>}
          </section>

          {archivedAccounts.length > 0 && <section className="accounts-section archived-section"><div className="section-heading"><div><h2>Đã lưu trữ</h2><p>Vẫn giữ lịch sử và có thể khôi phục.</p></div></div><div className="archived-list">{archivedAccounts.map((account) => <article key={account.id}><span className="account-kind-icon"><Icon name={accountIcon(account.kind)} /></span><div><strong>{account.name}</strong><small>{accountKindLabels[account.kind]}</small></div><span>{formatMoney(account.balance)}</span><button onClick={() => toggleArchived(account)} disabled={busyId === account.id}><Icon name="restore" />Khôi phục</button></article>)}</div></section>}
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Điều hướng di động">{navItems.map((item) => <Link href={item.href} className={item.href === "/accounts" ? "active" : ""} key={item.label}><Icon name={item.icon} /><span>{item.label}</span></Link>)}</nav>
      <button className="mobile-fab" onClick={() => openAccount(null)} disabled={Boolean(dataError)} aria-label="Thêm tài khoản"><Icon name="plus" /></button>
      <AccountDialog key={`${editing?.id ?? "new"}-${dialogVersion}`} open={dialogOpen} account={editing} onClose={() => setDialogOpen(false)} onSave={saveAccount} />
      <TransferDialog open={transferOpen} accounts={activeAccounts} onClose={() => setTransferOpen(false)} onTransfer={transfer} />
      <div className={notice ? "toast visible" : "toast"} role="status" aria-live="polite"><span><Icon name="check" /></span>{notice}</div>
    </div>
  );
}
