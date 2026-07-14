"use client";

import { useEffect, useMemo, useState } from "react";
import { saveAccountAction, setAccountArchivedAction } from "@/app/actions/accounts";
import { createTransferAction } from "@/app/actions/transactions";
import { AccountDialog } from "@/components/account-dialog";
import { Icon, type IconName } from "@/components/icons";
import { type ViewerSummary } from "@/components/user-chip";
import { accountKindLabels, type AccountSummary, type SaveAccountInput } from "@/lib/accounts";
import {
  canTransferSameCurrency,
  normalizeCurrencyCode,
  totalsByCurrency,
  transferCurrencyMismatchMessage,
} from "@/lib/currency";
import { formatMoney } from "@/lib/money";
import { TransferDialog } from "@/components/transfer-dialog";
import type { CreateTransferInput, Transaction } from "@/lib/sample-data";
import { readStoredTransactions, writeStoredTransactions } from "@/lib/transaction-store";
import { applyTransferBalances } from "@/lib/transfers";
import { AppShell } from "@/components/layout/app-shell";

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
  const currencyTotals = useMemo(() => totalsByCurrency(activeAccounts), [activeAccounts]);
  const hasFx = currencyTotals.some((row) => row.currencyCode !== "VND");
  const canOpenTransfer = activeAccounts.some((source) =>
    activeAccounts.some((destination) => canTransferSameCurrency(source, destination)),
  );

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
      const currencyCode = normalizeCurrencyCode(input.currencyCode ?? "VND");
      const next: AccountSummary = {
        id: input.id ?? crypto.randomUUID(),
        name: input.name,
        kind: input.kind,
        currencyCode,
        initialBalance: input.initialBalance,
        balance: input.initialBalance,
        isArchived: false,
      };
      setAccounts((current) =>
        input.id
          ? current.map((item) =>
              item.id === input.id
                ? {
                    ...next,
                    currencyCode: item.currencyCode,
                    balance: next.initialBalance + (item.balance - item.initialBalance),
                    isArchived: item.isArchived,
                  }
                : item,
            )
          : [...current, next],
      );
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
    const source = activeAccounts.find((item) => item.id === input.sourceAccountId);
    const destination = activeAccounts.find((item) => item.id === input.destinationAccountId);
    if (!source || !destination || source.id === destination.id) {
      return { ok: false, message: "Chọn hai tài khoản hoạt động khác nhau." };
    }
    if (!canTransferSameCurrency(source, destination)) {
      return { ok: false, message: transferCurrencyMismatchMessage() };
    }
    if (viewer.isDemo) {
      const transaction: Transaction = {
        id: crypto.randomUUID(),
        kind: "transfer",
        categoryId: "",
        category: "Chuyển tiền",
        note: input.note || "Chuyển tiền",
        accountId: source.id,
        account: source.name,
        destinationAccountId: destination.id,
        destinationAccount: destination.name,
        amount: input.amount,
        occurredOn: input.occurredOn,
        occurredAt: new Date().toISOString(),
        relativeDate: "Vừa xong",
      };
      writeStoredTransactions([transaction, ...readStoredTransactions()]);
      setAccounts((current) => applyTransferBalances(current, source.id, destination.id, input.amount));
      setTransferOpen(false);
      setNotice(`Đã chuyển ${formatMoney(input.amount, false, source.currencyCode)} sang ${destination.name}.`);
      return { ok: true };
    }
    const result = await createTransferAction(input);
    if (result.ok) {
      setAccounts((current) => applyTransferBalances(current, source.id, destination.id, input.amount));
      setTransferOpen(false);
      setNotice(`Đã chuyển ${formatMoney(input.amount, false, source.currencyCode)} sang ${destination.name}.`);
    }
    return result;
  }

  return (
    <AppShell
      viewer={viewer}
      primaryAction={{
        label: "Thêm tài khoản",
        onClick: () => openAccount(null),
        disabled: Boolean(dataError),
      }}
      fabAction={{
        label: "Thêm tài khoản",
        onClick: () => openAccount(null),
        disabled: Boolean(dataError),
      }}
      notice={notice}
    >
      <main className="dashboard accounts-workspace">
        {dataError && <div className="data-alert" role="alert"><Icon name="bell" /><span>{dataError}</span></div>}
        <section className="accounts-heading">
          <div>
            <p className="eyebrow">Nơi giữ tiền</p>
            <h1>Tài khoản</h1>
            <p>Quản lý tiền mặt, ngân hàng, ví điện tử{hasFx ? ", ngoại tệ" : ""} và các khoản nợ ở một nơi.</p>
          </div>
          <div className="page-heading-actions">
            <button
              className="secondary-button"
              onClick={() => setTransferOpen(true)}
              disabled={Boolean(dataError) || !canOpenTransfer}
            >
              <Icon name="arrows" />Chuyển tiền
            </button>
          </div>
        </section>

        <section className="accounts-summary" aria-label="Tổng quan tài khoản">
          <div className="accounts-summary-totals">
            <span>{hasFx ? "Số dư theo loại tiền" : "Tổng số dư"}</span>
            {currencyTotals.length === 0 ? (
              <strong className="font-mono">{formatMoney(0)}</strong>
            ) : (
              <ul className="accounts-currency-totals">
                {currencyTotals.map((row) => (
                  <li key={row.currencyCode}>
                    <strong className={`font-mono ${row.total < 0 ? "negative" : ""}`}>
                      {formatMoney(row.total, false, row.currencyCode)}
                    </strong>
                    <small>
                      {row.currencyCode}
                      {row.count > 1 ? ` · ${row.count} tài khoản` : ""}
                    </small>
                  </li>
                ))}
              </ul>
            )}
            <small>
              {activeAccounts.length} tài khoản hoạt động
              {hasFx ? " · không cộng gộp ngoại tệ" : ""}
            </small>
          </div>
          <p>
            {hasFx
              ? "Số dư VND dùng cho dự báo “có thể chi hôm nay”. Tài khoản ngoại tệ chỉ hiển thị — chưa chuyển chéo loại tiền hay quy đổi tỷ giá."
              : "Số dư này được dùng làm nền cho dự báo “có thể chi hôm nay”. Hãy nhập số dư ban đầu đúng với thực tế."}
          </p>
        </section>

        <section className="accounts-section">
          <div className="section-heading">
            <div>
              <h2>Đang hoạt động</h2>
              <p>Có thể chọn khi ghi giao dịch mới.</p>
            </div>
          </div>
          {activeAccounts.length ? (
            <div className="account-grid">
              {activeAccounts.map((account) => (
                <article className="account-card" key={account.id}>
                  <div className={`account-kind-icon ${account.kind}`}>
                    <Icon name={accountIcon(account.kind)} />
                  </div>
                  <div className="account-card-title">
                    <div>
                      <h3>{account.name}</h3>
                      <p>
                        {accountKindLabels[account.kind]} · {account.currencyCode}
                        {account.currencyCode !== "VND" ? " · chỉ theo dõi" : ""}
                      </p>
                    </div>
                    <strong className={`font-mono ${account.balance < 0 ? "negative" : ""}`}>
                      {formatMoney(account.balance, false, account.currencyCode)}
                    </strong>
                  </div>
                  <div className="account-card-foot">
                    <span className="font-mono">
                      Số dư ban đầu: {formatMoney(account.initialBalance, false, account.currencyCode)}
                    </span>
                    <div>
                      <button onClick={() => openAccount(account)} aria-label={`Sửa ${account.name}`}>
                        <Icon name="edit" />Sửa
                      </button>
                      <button
                        onClick={() => toggleArchived(account)}
                        disabled={busyId === account.id}
                        aria-label={`Lưu trữ ${account.name}`}
                      >
                        <Icon name="archive" />Lưu trữ
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="account-empty">
              <Icon name="wallet" />
              <h2>Chưa có tài khoản hoạt động</h2>
              <p>Thêm một tài khoản để bắt đầu ghi giao dịch.</p>
              <button onClick={() => openAccount(null)}>Thêm tài khoản</button>
            </div>
          )}
        </section>

        {archivedAccounts.length > 0 && (
          <section className="accounts-section archived-section">
            <div className="section-heading">
              <div>
                <h2>Đã lưu trữ</h2>
                <p>Vẫn giữ lịch sử và có thể khôi phục.</p>
              </div>
            </div>
            <div className="archived-list">
              {archivedAccounts.map((account) => (
                <article key={account.id}>
                  <span className="account-kind-icon">
                    <Icon name={accountIcon(account.kind)} />
                  </span>
                  <div>
                    <strong>{account.name}</strong>
                    <small>
                      {accountKindLabels[account.kind]} · {account.currencyCode}
                    </small>
                  </div>
                  <span className="font-mono">
                    {formatMoney(account.balance, false, account.currencyCode)}
                  </span>
                  <button onClick={() => toggleArchived(account)} disabled={busyId === account.id}>
                    <Icon name="restore" />Khôi phục
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
      <AccountDialog
        key={`${editing?.id ?? "new"}-${dialogVersion}`}
        open={dialogOpen}
        account={editing}
        onClose={() => setDialogOpen(false)}
        onSave={saveAccount}
      />
      <TransferDialog
        open={transferOpen}
        accounts={activeAccounts}
        onClose={() => setTransferOpen(false)}
        onTransfer={transfer}
      />
    </AppShell>
  );
}
