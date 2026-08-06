"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AccountArchiveDialog } from "@/components/accounts/account-archive-dialog";
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ViewerSummary } from "@/components/user-chip";
import { saveAccountAction, setAccountArchivedAction } from "@/app/actions/accounts";
import { executeTransferMutation } from "@/hooks/transfer-mutation";
import {
  accountKindLabels,
  type AccountKind,
  type AccountSummary,
  type SaveAccountInput,
} from "@/lib/accounts";
import {
  canTransferSameCurrency,
  normalizeCurrencyCode,
  totalsByCurrency,
} from "@/lib/currency";
import { formatMoney } from "@/lib/money";
import type { CreateTransferInput } from "@/lib/sample-data";
import { readStoredTransactions } from "@/lib/transaction-store";
import { applyTransferBalances } from "@/lib/transfers";
import styles from "./accounts-workspace.module.css";

const AccountDialog = dynamic(
  () => import("@/components/account-dialog").then((module) => module.AccountDialog),
  { ssr: false },
);
const TransferDialog = dynamic(
  () => import("@/components/transfer-dialog").then((module) => module.TransferDialog),
  { ssr: false },
);

function accountIcon(kind: AccountSummary["kind"]): IconName {
  if (kind === "bank" || kind === "savings") return "bank";
  if (kind === "credit_card") return "card";
  return "wallet";
}

function kindClassName(kind: AccountKind) {
  if (kind === "bank") return styles.bank;
  if (kind === "savings") return styles.savings;
  if (kind === "e_wallet") return styles.eWallet;
  if (kind === "credit_card") return styles.creditCard;
  return "";
}

export function AccountsWorkspace({
  viewer,
  initialAccounts,
  dataError,
}: {
  viewer: ViewerSummary;
  initialAccounts: AccountSummary[];
  dataError: string | null;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editing, setEditing] = useState<AccountSummary | null>(null);
  const [dialogVersion, setDialogVersion] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AccountSummary | null>(null);
  const [notice, setNotice] = useState("");

  const activeAccounts = accounts.filter((item) => !item.isArchived);
  const archivedAccounts = accounts.filter((item) => item.isArchived);
  const activeCurrencyTotals = useMemo(
    () => totalsByCurrency(activeAccounts),
    [activeAccounts],
  );
  const archivedCurrencyTotals = useMemo(
    () => totalsByCurrency(archivedAccounts),
    [archivedAccounts],
  );
  const hasFx = activeCurrencyTotals.some((row) => row.currencyCode !== "VND");
  const canOpenTransfer = activeAccounts.some((source) =>
    activeAccounts.some((destination) =>
      canTransferSameCurrency(source, destination),
    ),
  );

  useEffect(() => {
    if (!viewer.isDemo) return;
    const frame = window.requestAnimationFrame(() => {
      const restored = readStoredTransactions()
        .filter(
          (transaction) =>
            transaction.kind === "transfer" && transaction.destinationAccountId,
        )
        .reduce(
          (current, transaction) =>
            applyTransferBalances(
              current,
              transaction.accountId,
              transaction.destinationAccountId!,
              transaction.amount,
            ),
          initialAccounts,
        );
      setAccounts(restored);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialAccounts, viewer.isDemo]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4800);
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
                    balance:
                      next.initialBalance + (item.balance - item.initialBalance),
                    isArchived: item.isArchived,
                  }
                : item,
            )
          : [...current, next],
      );
      setDialogOpen(false);
      setNotice(
        input.id ? "Đã cập nhật tài khoản demo." : "Đã thêm tài khoản demo.",
      );
      return { ok: true };
    }

    const result = await saveAccountAction(input);
    if (result.ok && result.account) {
      setAccounts((current) =>
        input.id
          ? current.map((item) =>
              item.id === input.id
                ? (result.account as AccountSummary)
                : item,
            )
          : [...current, result.account as AccountSummary],
      );
      setDialogOpen(false);
      setNotice(input.id ? "Đã cập nhật tài khoản." : "Đã thêm tài khoản.");
    }
    return result;
  }

  async function setArchived(account: AccountSummary, archived: boolean) {
    setBusyId(account.id);
    const result = viewer.isDemo
      ? { ok: true as const }
      : await setAccountArchivedAction(account.id, archived);
    setBusyId(null);

    if (!result.ok) {
      setNotice(result.message);
      return;
    }

    setAccounts((current) =>
      current.map((item) =>
        item.id === account.id ? { ...item, isArchived: archived } : item,
      ),
    );
    if (archived) setArchiveTarget(null);
    setNotice(
      archived
        ? `Đã lưu trữ ${account.name}. Số dư vẫn nằm trong nhóm đã lưu trữ.`
        : `Đã khôi phục ${account.name} vào tài khoản đang hoạt động.`,
    );
  }

  async function transfer(input: CreateTransferInput) {
    const result = await executeTransferMutation({
      input,
      accounts: activeAccounts,
      isDemo: viewer.isDemo,
    });
    if (result.ok) {
      if (result.isNew) {
        setAccounts((current) =>
          applyTransferBalances(
            current,
            result.source.id,
            result.destination.id,
            result.transaction.amount,
          ),
        );
      }
      setTransferOpen(false);
      setNotice(
        `Đã chuyển ${formatMoney(
          result.transaction.amount,
          false,
          result.source.currencyCode,
        )} sang ${result.destination.name}.`,
      );
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
      showPrimaryActionOnMobile
      notice={notice}
    >
      <main data-slot="accounts-workspace" className={styles.workspace}>
        {dataError ? (
          <Alert tone="error" live="assertive" className={styles.alert}>
            <AlertTitle>Chưa tải được tài khoản</AlertTitle>
            <AlertDescription>{dataError}</AlertDescription>
          </Alert>
        ) : null}

        <header className={styles.heading}>
          <div className={styles.headingCopy}>
            <p className={styles.eyebrow}>Nơi giữ tiền</p>
            <h1>Tài khoản</h1>
            <p className={styles.headingDescription}>
              Quản lý tiền mặt, ngân hàng, ví điện tử
              {hasFx ? ", ngoại tệ" : ""} và các khoản nợ ở một nơi.
            </p>
          </div>
          <div className={styles.headingActions}>
            <Button
              type="button"
              intent="secondary"
              targetSize="important"
              onClick={() => setTransferOpen(true)}
              disabled={Boolean(dataError) || !canOpenTransfer}
            >
              <Icon name="arrows" /> Chuyển tiền
            </Button>
          </div>
        </header>

        <section
          data-slot="accounts-summary"
          className={styles.summary}
          aria-label="Tổng quan tài khoản đang hoạt động"
        >
          <div className={styles.summaryTotals}>
            <span className={styles.summaryLabel}>
              {hasFx
                ? "Số dư tài khoản đang hoạt động theo loại tiền"
                : "Tổng số dư tài khoản đang hoạt động"}
            </span>
            {activeCurrencyTotals.length === 0 ? (
              <MoneyValue
                amount={0}
                mode="plain"
                currencyCode="VND"
                emphasis="strong"
                align="start"
                label="Tổng số dư tài khoản đang hoạt động"
              />
            ) : (
              <ul className={styles.currencyTotals}>
                {activeCurrencyTotals.map((row) => (
                  <li className={styles.currencyTotal} key={row.currencyCode}>
                    <MoneyValue
                      amount={row.total}
                      mode="plain"
                      currencyCode={row.currencyCode}
                      emphasis="strong"
                      align="start"
                      label={`Tổng số dư đang hoạt động ${row.currencyCode}`}
                    />
                    <small>
                      {row.currencyCode}
                      {row.count > 1 ? ` · ${row.count} tài khoản` : ""}
                    </small>
                  </li>
                ))}
              </ul>
            )}
            <small className={styles.summaryCount}>
              {activeAccounts.length} tài khoản đang hoạt động
              {hasFx ? " · không cộng gộp ngoại tệ" : ""}
            </small>
          </div>
          <p className={styles.summaryNote}>
            {hasFx
              ? "Mỗi loại tiền được theo dõi riêng. MoneyFlow chưa chuyển chéo loại tiền hoặc quy đổi theo tỷ giá."
              : "Tổng này chỉ gồm tài khoản đang hoạt động. Tài khoản đã lưu trữ vẫn giữ lịch sử và số dư trong nhóm riêng bên dưới."}
          </p>
        </section>

        <section className={styles.section} aria-labelledby="active-accounts-title">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="active-accounts-title">Đang hoạt động</h2>
              <p className={styles.sectionDescription}>
                Có thể chọn khi ghi giao dịch mới.
              </p>
            </div>
          </div>

          {activeAccounts.length ? (
            <div data-slot="accounts-active-list" className={styles.grid}>
              {activeAccounts.map((account) => (
                <article
                  data-slot="account-card"
                  className={styles.card}
                  key={account.id}
                >
                  <div
                    className={`${styles.kindIcon} ${kindClassName(account.kind)}`}
                    aria-hidden="true"
                  >
                    <Icon name={accountIcon(account.kind)} />
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTitleRow}>
                      <div className={styles.cardTitle}>
                        <h3>{account.name}</h3>
                        <p className={styles.cardMeta}>
                          {accountKindLabels[account.kind]} · {account.currencyCode}
                          {account.currencyCode !== "VND"
                            ? " · chỉ theo dõi"
                            : ""}
                        </p>
                      </div>
                      <MoneyValue
                        amount={account.balance}
                        mode="plain"
                        currencyCode={account.currencyCode}
                        emphasis="strong"
                        className={styles.cardBalance}
                        label={`Số dư hiện tại ${account.name}`}
                      />
                    </div>
                    <div className={styles.cardFoot}>
                      <span className={styles.initialBalance}>
                        Số dư ban đầu:{" "}
                        <MoneyValue
                          amount={account.initialBalance}
                          mode="plain"
                          currencyCode={account.currencyCode}
                          align="start"
                          label={`Số dư ban đầu ${account.name}`}
                        />
                      </span>
                      <div className={styles.cardActions}>
                        <LinkButton
                          href={`/accounts/${account.id}`}
                          intent="quiet"
                          targetSize="important"
                          aria-label={`Xem sổ ${account.name}`}
                        >
                          <Icon name="timeline" /> Xem sổ
                        </LinkButton>
                        <Button
                          type="button"
                          intent="quiet"
                          targetSize="important"
                          onClick={() => openAccount(account)}
                          aria-label={`Sửa ${account.name}`}
                        >
                          <Icon name="edit" /> Sửa
                        </Button>
                        <Button
                          type="button"
                          intent="destructive"
                          targetSize="important"
                          onClick={() => setArchiveTarget(account)}
                          disabled={busyId === account.id}
                          aria-label={`Lưu trữ ${account.name}`}
                        >
                          <Icon name="archive" /> Lưu trữ
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Icon name="wallet" />}
              title="Chưa có tài khoản hoạt động"
              description="Thêm một tài khoản để bắt đầu ghi giao dịch. Tài khoản đã lưu trữ vẫn nằm trong nhóm bên dưới."
              primaryAction={
                <Button
                  type="button"
                  intent="primary"
                  targetSize="important"
                  onClick={() => openAccount(null)}
                  disabled={Boolean(dataError)}
                >
                  <Icon name="plus" /> Thêm tài khoản
                </Button>
              }
              className={styles.empty}
            />
          )}
        </section>

        {archivedAccounts.length > 0 ? (
          <section
            className={`${styles.section} ${styles.archivedSection}`}
            aria-labelledby="archived-accounts-title"
          >
            <div className={styles.sectionHeading}>
              <div>
                <h2 id="archived-accounts-title">Đã lưu trữ</h2>
                <p className={styles.sectionDescription}>
                  Vẫn giữ lịch sử, số dư và có thể khôi phục.
                </p>
              </div>
            </div>
            <p className={styles.archivedTotals}>
              {archivedCurrencyTotals.map((row, index) => (
                <span key={row.currencyCode}>
                  {index > 0 ? " · " : ""}
                  {row.count} tài khoản {row.currencyCode}:{" "}
                  <MoneyValue
                    amount={row.total}
                    mode="plain"
                    currencyCode={row.currencyCode}
                    align="start"
                    label={`Tổng số dư đã lưu trữ ${row.currencyCode}`}
                  />
                </span>
              ))}
            </p>
            <div data-slot="accounts-archived-list" className={styles.archivedList}>
              {archivedAccounts.map((account) => (
                <article
                  data-slot="archived-account-row"
                  className={styles.archivedRow}
                  key={account.id}
                >
                  <span
                    className={`${styles.kindIcon} ${kindClassName(account.kind)}`}
                    aria-hidden="true"
                  >
                    <Icon name={accountIcon(account.kind)} />
                  </span>
                  <div className={styles.archivedIdentity}>
                    <strong>{account.name}</strong>
                    <small>
                      {accountKindLabels[account.kind]} · {account.currencyCode}
                    </small>
                  </div>
                  <MoneyValue
                    amount={account.balance}
                    mode="plain"
                    currencyCode={account.currencyCode}
                    emphasis="strong"
                    className={styles.archivedBalance}
                    label={`Số dư đã lưu trữ ${account.name}`}
                  />
                  <div className={styles.archivedActions}>
                    <LinkButton
                      href={`/accounts/${account.id}`}
                      intent="quiet"
                      targetSize="important"
                      aria-label={`Xem sổ ${account.name}`}
                    >
                      <Icon name="timeline" /> Xem sổ
                    </LinkButton>
                    <Button
                      type="button"
                      intent="secondary"
                      targetSize="important"
                      onClick={() => void setArchived(account, false)}
                      disabled={busyId === account.id}
                      pending={busyId === account.id}
                      pendingLabel="Đang khôi phục..."
                    >
                      <Icon name="restore" /> Khôi phục
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <AccountDialog
        key={`${editing?.id ?? "new"}-${dialogVersion}`}
        open={dialogOpen}
        account={editing}
        onClose={() => setDialogOpen(false)}
        onSave={saveAccount}
      />
      <AccountArchiveDialog
        account={archiveTarget}
        open={Boolean(archiveTarget)}
        submitting={Boolean(archiveTarget && busyId === archiveTarget.id)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (archiveTarget) void setArchived(archiveTarget, true);
        }}
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
