"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  permanentlyDeleteTransactionAction,
  restoreTransactionAction,
} from "@/app/actions/transactions";
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import {
  SecondaryHeader,
  SecondaryReviewDialog,
  SecondaryWorkspace,
} from "@/components/secondary/secondary-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ToastTone } from "@/components/ui/toast";
import type { ViewerSummary } from "@/components/user-chip";
import { getPendingCountForClient } from "@/hooks/client-inbox";
import {
  formatDeletedAtLabel,
  readStoredDeletedTransactions,
  releaseDeletedTransactions,
} from "@/lib/deleted-transactions";
import { safeUserNotice } from "@/lib/safe-log";
import {
  categoryMetaFor,
  categoryMetaIndex,
  type CategoryOption,
  type DeletedTransaction,
  type Transaction,
} from "@/lib/sample-data";
import { isSplitExpense } from "@/lib/splits";
import {
  readStoredTransactions,
  restoreTransactionInList,
  writeStoredTransactions,
} from "@/lib/transaction-store";
import { transferRowSubtitle } from "@/lib/transfers";
import styles from "./transactions-trash-page.module.css";

const NOTICE_MS = 4000;

function iconTone(kind: Transaction["kind"]) {
  if (kind === "income") return styles.iconIncome;
  if (kind === "transfer") return styles.iconTransfer;
  return styles.iconExpense;
}

/** Same subtitle contract as the live ledger rows. */
function trashRowSubtitle(transaction: Transaction) {
  if (transaction.kind === "transfer") {
    return transferRowSubtitle(
      transaction.account,
      transaction.destinationAccount,
    );
  }
  if (isSplitExpense(transaction)) {
    return `${transaction.category} · ${transaction.account} · ${transaction
      .splits!.map((line) => `${line.category}`)
      .join(" · ")}`;
  }
  return `${transaction.payee ? `${transaction.payee} · ` : ""}${transaction.category} · ${transaction.account}`;
}

export function TransactionsTrashPage({
  viewer,
  initialDeleted,
  categories,
  dataError,
}: {
  viewer: ViewerSummary;
  initialDeleted: DeletedTransaction[];
  categories: CategoryOption[];
  dataError: string | null;
}) {
  const metaIndex = categoryMetaIndex(categories);
  const router = useRouter();
  const isDemo = viewer.isDemo;
  const [entries, setEntries] = useState<DeletedTransaction[]>(initialDeleted);
  const [ready, setReady] = useState(!isDemo);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<ToastTone | undefined>(
    undefined,
  );
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<DeletedTransaction | null>(
    null,
  );
  const [purgeAllOpen, setPurgeAllOpen] = useState(false);
  const [purging, setPurging] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  const noticeTimerRef = useRef<number | null>(null);

  function showNotice(message: string, tone: ToastTone) {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    setNotice(safeUserNotice(message, "Đã cập nhật."));
    setNoticeTone(tone);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice("");
      setNoticeTone(undefined);
      noticeTimerRef.current = null;
    }, NOTICE_MS);
  }

  /* Same dual-store reader as the settings surfaces: the authenticated badge
     count is server-owned, the demo one lives on the device. */
  useEffect(() => {
    let cancelled = false;
    void getPendingCountForClient(isDemo)
      .then((count) => {
        if (!cancelled) setInboxCount(count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  /*
   * Demo tombstones live in localStorage — they cannot exist in the server
   * render, so the list hydrates on mount exactly like `useTransactions`.
   */
  useEffect(() => {
    if (!isDemo) return;
    const frame = window.requestAnimationFrame(() => {
      setEntries(readStoredDeletedTransactions());
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isDemo]);

  function removeEntry(id: string) {
    setEntries((current) =>
      current.filter((entry) => entry.transaction.id !== id),
    );
  }

  async function restoreEntry(entry: DeletedTransaction) {
    if (restoringId) return;
    setRestoringId(entry.transaction.id);
    try {
      if (isDemo) {
        /*
         * Commit the live store first, then release the tombstone: if the
         * write throws, the row is still recoverable here.
         */
        const next = restoreTransactionInList(
          readStoredTransactions(),
          entry.transaction,
        );
        writeStoredTransactions(next);
        releaseDeletedTransactions([entry.transaction.id]);
        removeEntry(entry.transaction.id);
        showNotice(`Đã khôi phục ${entry.transaction.note}.`, "success");
        return;
      }

      const result = await restoreTransactionAction(entry.transaction.id);
      if (result.ok) {
        removeEntry(entry.transaction.id);
        showNotice(`Đã khôi phục ${entry.transaction.note}.`, "success");
      } else {
        showNotice(
          result.message || "Không khôi phục được giao dịch. Thử lại.",
          "error",
        );
      }
    } catch {
      showNotice("Mất kết nối. Kiểm tra mạng rồi thử lại.", "error");
    } finally {
      setRestoringId(null);
    }
  }

  async function purgeEntry(entry: DeletedTransaction) {
    if (purging) return;
    setPurging(true);
    try {
      if (isDemo) {
        /*
         * Demo tombstones live in localStorage — dropping them here is the
         * real permanent delete for demo data, so the affordance stays
         * honest instead of being hidden.
         */
        releaseDeletedTransactions([entry.transaction.id]);
        removeEntry(entry.transaction.id);
        setPurgeTarget(null);
        showNotice("Đã xóa vĩnh viễn.", "success");
        return;
      }

      const result = await permanentlyDeleteTransactionAction(
        entry.transaction.id,
      );
      if (result.ok) {
        removeEntry(entry.transaction.id);
        setPurgeTarget(null);
        showNotice("Đã xóa vĩnh viễn.", "success");
      } else {
        showNotice(
          result.message || "Không xóa được giao dịch. Thử lại.",
          "error",
        );
      }
    } catch {
      showNotice("Mất kết nối. Kiểm tra mạng rồi thử lại.", "error");
    } finally {
      setPurging(false);
    }
  }

  async function purgeAllEntries() {
    if (purging || entries.length === 0) return;
    setPurging(true);
    try {
      if (isDemo) {
        releaseDeletedTransactions(
          entries.map((entry) => entry.transaction.id),
        );
        setEntries([]);
        setPurgeAllOpen(false);
        showNotice("Đã dọn sạch thùng rác.", "success");
        return;
      }

      /*
       * Per-row RPC sequentially: a partial failure keeps the remaining
       * rows in place and the notice says so, rather than faking a clean
       * sweep.
       */
      const failed: string[] = [];
      for (const entry of entries) {
        const result = await permanentlyDeleteTransactionAction(
          entry.transaction.id,
        );
        if (result.ok) {
          removeEntry(entry.transaction.id);
        } else {
          failed.push(entry.transaction.id);
        }
      }
      setPurgeAllOpen(false);
      if (failed.length === 0) {
        showNotice("Đã dọn sạch thùng rác.", "success");
      } else {
        showNotice(
          `Chưa dọn hết — còn ${failed.length} giao dịch. Thử lại.`,
          "error",
        );
      }
      router.refresh();
    } catch {
      showNotice("Mất kết nối. Kiểm tra mạng rồi thử lại.", "error");
    } finally {
      setPurging(false);
    }
  }

  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
      notice={notice}
      noticeTone={noticeTone}
    >
      <SecondaryWorkspace slot="transactions-trash">
        <SecondaryHeader
          section="Giao dịch"
          title="Giao dịch đã xóa"
          eyebrowHref="/transactions"
          eyebrowLabel="Sổ giao dịch"
          description={
            <>
              <p>
                Các giao dịch bạn xóa được giữ ở đây để khôi phục, hoặc xóa vĩnh
                viễn khi bạn chắc chắn. Khôi phục sẽ đưa giao dịch trở lại sổ —
                trạng thái đối soát đã xác nhận không được giữ lại, các dòng
                quay về chờ đối soát.
              </p>
              <p className={styles.note}>
                Giao dịch đã đối soát hoặc tạo từ lịch định kỳ không thể xóa,
                nên sẽ không xuất hiện ở đây.
              </p>
            </>
          }
          actions={
            <>
              <LinkButton
                href="/transactions"
                intent="secondary"
                targetSize="important"
              >
                <Icon name="arrows" /> Về sổ giao dịch
              </LinkButton>
              {entries.length > 0 ? (
                <Button
                  type="button"
                  intent="secondary"
                  targetSize="important"
                  disabled={purging}
                  onClick={() => setPurgeAllOpen(true)}
                >
                  <Icon name="trash" /> Dọn sạch thùng rác
                </Button>
              ) : null}
            </>
          }
        />

        {dataError ? (
          <Alert tone="error" live="assertive" className={styles.dataAlert}>
            <AlertDescription className={styles.alertContent}>
              <span>{dataError}</span>
              <Button
                type="button"
                intent="secondary"
                targetSize="important"
                onClick={() => router.refresh()}
              >
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {!ready ? (
          <section
            className={styles.loading}
            aria-busy="true"
            aria-label="Đang tải giao dịch đã xóa"
          >
            <span />
            <span />
            <span />
          </section>
        ) : null}

        {ready && !dataError && entries.length === 0 ? (
          <EmptyState
            icon={<Icon name="trash" />}
            title="Chưa có giao dịch nào bị xóa"
            description="Khi bạn xóa một giao dịch, nó sẽ nằm ở đây và có thể khôi phục bất cứ lúc nào."
            primaryAction={
              <LinkButton
                href="/transactions"
                intent="secondary"
                targetSize="important"
              >
                Về sổ giao dịch
              </LinkButton>
            }
            className={styles.emptyState}
          />
        ) : null}

        {ready && entries.length > 0 ? (
          <section className={styles.list} aria-label="Giao dịch đã xóa">
            {entries.map((entry) => {
              const transaction = entry.transaction;
              const meta = categoryMetaFor(
                metaIndex,
                transaction.kind,
                transaction.category,
              );
              const restoring = restoringId === transaction.id;
              return (
                <article
                  className={styles.row}
                  key={transaction.id}
                  data-slot="trash-row"
                  data-transaction-id={transaction.id}
                >
                  <span
                    className={`${styles.transactionIcon} ${iconTone(transaction.kind)}`}
                  >
                    <Icon name={meta.icon as IconName} />
                  </span>
                  <div className={styles.detail}>
                    <strong>{transaction.note}</strong>
                    <small>{trashRowSubtitle(transaction)}</small>
                    <time
                      className={styles.deletedAt}
                      dateTime={entry.deletedAt}
                    >
                      Đã xóa lúc {formatDeletedAtLabel(entry.deletedAt)}
                    </time>
                  </div>
                  <MoneyValue
                    amount={transaction.amount}
                    mode="kind"
                    kind={transaction.kind}
                    emphasis="strong"
                    className={styles.amount}
                  />
                  <Button
                    type="button"
                    intent="secondary"
                    targetSize="important"
                    className={styles.restoreButton}
                    pending={restoring}
                    pendingLabel="Đang khôi phục…"
                    disabled={restoringId !== null || purging}
                    onClick={() => void restoreEntry(entry)}
                  >
                    <Icon name="restore" /> Khôi phục
                  </Button>
                  <Button
                    type="button"
                    intent="destructive"
                    targetSize="important"
                    aria-label={`Xóa vĩnh viễn ${transaction.note}`}
                    disabled={restoringId !== null || purging}
                    onClick={() => setPurgeTarget(entry)}
                  >
                    <Icon name="trash" />
                  </Button>
                </article>
              );
            })}
          </section>
        ) : null}
      </SecondaryWorkspace>

      <SecondaryReviewDialog
        open={purgeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !purging) setPurgeTarget(null);
        }}
        title="Xóa vĩnh viễn?"
        description="Giao dịch sẽ bị xóa khỏi thùng rác."
        details={
          purgeTarget
            ? [
                {
                  label: "Giao dịch",
                  value:
                    purgeTarget.transaction.note ||
                    purgeTarget.transaction.category,
                },
                {
                  label: "Đã xóa lúc",
                  value: formatDeletedAtLabel(purgeTarget.deletedAt),
                },
              ]
            : []
        }
        consequence="Không thể khôi phục sau khi xóa vĩnh viễn."
        confirmLabel="Xóa vĩnh viễn"
        confirmIntent="destructive"
        pending={purging}
        onConfirm={() =>
          purgeTarget ? void purgeEntry(purgeTarget) : undefined
        }
        slot="trash-purge"
      />

      <SecondaryReviewDialog
        open={purgeAllOpen}
        onOpenChange={(open) => {
          if (!open && !purging) setPurgeAllOpen(false);
        }}
        title="Dọn sạch thùng rác?"
        description={`Xóa vĩnh viễn ${entries.length} giao dịch trong thùng rác.`}
        details={[
          { label: "Số giao dịch", value: String(entries.length) },
          { label: "Phạm vi", value: "Toàn bộ thùng rác" },
        ]}
        consequence="Không thể khôi phục bất kỳ giao dịch nào sau khi dọn."
        confirmLabel="Xóa hết"
        confirmIntent="destructive"
        pending={purging}
        onConfirm={() => void purgeAllEntries()}
        slot="trash-purge-all"
      />
    </AppShell>
  );
}
