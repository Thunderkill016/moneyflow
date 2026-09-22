"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddTransactionDialog } from "@/components/add-transaction-dialog";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ViewerSummary } from "@/components/user-chip";
import { useTransactions } from "@/hooks/use-transactions";
import { captureConsequence } from "@/lib/capture-consequence";
import {
  deriveFrequentLedgerPatterns,
  derivePayeeSuggestions,
} from "@/lib/quick-add-defaults";
import {
  buildQuickCaptureCorrectionMeta,
  buildQuickCaptureSaveMeta,
  trackProductEvent,
  type QuickCapturePatternRank,
} from "@/lib/safe-analytics";
import {
  addCandidatesForClient,
  getPendingCountForClient,
} from "@/hooks/client-inbox";
import type {
  AccountOption,
  CategoryOption,
  CreateTransactionInput,
  CreateTransferInput,
  Transaction,
  TransactionKind,
  UpdateMoneyTransactionInput,
  UpdateTransferInput,
} from "@/lib/sample-data";
import styles from "./capture-quick-page.module.css";

const TransferDialog = dynamic(
  () => import("@/components/transfer-dialog").then((mod) => mod.TransferDialog),
  { ssr: false },
);
const EditTransactionDialog = dynamic(
  () =>
    import("@/components/edit-transaction-dialog").then(
      (mod) => mod.EditTransactionDialog,
    ),
  { ssr: false },
);

type QuickWorkspace = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  dataError: string | null;
};

export type QuickCaptureMode = TransactionKind | "transfer";

/**
 * Capture → Quick Add.
 * Direct entry uses the same dialog/footer geometry as in-place Dashboard
 * capture so installed shortcuts and fallback `Ghi` navigation do not degrade
 * into a longer embedded form. Transaction and transfer mutations remain the
 * existing trusted boundaries.
 */
export function CaptureQuickPage({
  viewer,
  workspace,
  initialMode,
}: {
  viewer: ViewerSummary;
  workspace: QuickWorkspace;
  initialMode?: QuickCaptureMode;
}) {
  const router = useRouter();
  const canTransfer = workspace.accounts.length >= 2;
  const {
    transactions,
    addTransaction,
    addTransfer,
    updateTransaction,
    isMutating,
  } = useTransactions({
    initialTransactions: workspace.transactions,
    accounts: workspace.accounts,
    categories: workspace.categories,
    isDemo: viewer.isDemo,
  });
  const [notice, setNotice] = useState("");
  const [recentSaved, setRecentSaved] = useState<Transaction | null>(null);
  const recentSavedRef = useRef<Transaction | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [inboxCount, setInboxCount] = useState(0);
  const [formOpen, setFormOpen] = useState(
    initialMode !== "transfer" || !canTransfer,
  );
  const [transferOpen, setTransferOpen] = useState(
    initialMode === "transfer" && canTransfer,
  );
  const captureStartedAtRef = useRef<number | null>(null);
  const lastSavedAtRef = useRef<number | null>(null);
  const selectedPatternRankRef = useRef<QuickCapturePatternRank | null>(null);
  const hasQuickSetup =
    workspace.accounts.length > 0 && workspace.categories.length > 0;
  const frequentPatternCount = deriveFrequentLedgerPatterns({
    transactions,
    accounts: workspace.accounts,
    categories: workspace.categories,
  }).length;
  const payeeSuggestions = useMemo(
    () => derivePayeeSuggestions(transactions),
    [transactions],
  );

  useEffect(() => {
    let cancelled = false;
    void getPendingCountForClient(viewer.isDemo).then((count) => {
      if (!cancelled) setInboxCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [viewer.isDemo]);

  useEffect(() => {
    if (!formOpen || !hasQuickSetup || captureStartedAtRef.current !== null) return;
    captureStartedAtRef.current = performance.now();
  }, [formOpen, hasQuickSetup]);

  useEffect(() => {
    if (!notice) return;
    const returnToCapture = Boolean(recentSaved && !formOpen);
    const timer = window.setTimeout(() => {
      setNotice("");
      setRecentSaved(null);
      recentSavedRef.current = null;
      lastSavedAtRef.current = null;
      if (returnToCapture) router.push("/capture");
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [formOpen, notice, recentSaved, router]);

  async function handleAdd(input: CreateTransactionInput) {
    const startedAt = captureStartedAtRef.current ?? performance.now();
    const result = await addTransaction(input);
    const completedAt = performance.now();
    const measurement = buildQuickCaptureSaveMeta({
      elapsedMs: completedAt - startedAt,
      patternCount: frequentPatternCount,
      selectedPatternRank: selectedPatternRankRef.current,
      outcome: result.ok ? "success" : "failure",
    });
    if (measurement) trackProductEvent("quick_capture_save", measurement);
    if (!result.ok) return result;

    selectedPatternRankRef.current = null;

    const account = workspace.accounts.find(
      (item) => item.id === input.accountId,
    );
    const category = workspace.categories.find(
      (item) => item.id === input.categoryId,
    );
    const merchant = input.note.trim() || category?.name || "Thêm nhanh";

    try {
      await addCandidatesForClient(viewer.isDemo, [
        {
          kind: input.kind,
          amount: input.amount,
          merchant,
          note: input.note.trim(),
          occurredOn: input.occurredOn,
          source: "manual",
          confidence: "high",
          status: "approved",
          categoryId: input.categoryId,
          category: category?.name,
          accountId: input.accountId,
          account: account?.name,
          rawSnippet: merchant,
        },
      ]);
      setInboxCount(await getPendingCountForClient(viewer.isDemo));
    } catch {
      // Candidate mirroring is optional; the ledger save already succeeded.
    }

    lastSavedAtRef.current = performance.now();
    captureStartedAtRef.current = performance.now();

    /*
     * The moment after a save is the highest-attention moment in the app, and it
     * used to return four words carrying no information. Say what was recorded and
     * what it now adds up to — the user's own numbers, never guidance.
     */
    if (result.transaction) {
      recentSavedRef.current = result.transaction;
      setRecentSaved(result.transaction);
    }
    setNotice(
      result.transaction
        ? captureConsequence({
            saved: result.transaction,
            transactions: [result.transaction, ...transactions],
          })
        : "Đã lưu giao dịch.",
    );
    return result;
  }

  async function handleUpdate(
    input: UpdateMoneyTransactionInput | UpdateTransferInput,
  ) {
    const result = await updateTransaction(input);
    if (result.ok) {
      setEditing(null);
      setRecentSaved(null);
      recentSavedRef.current = null;
      setNotice("Đã cập nhật giao dịch.");
    }
    return result;
  }

  async function handleTransfer(input: CreateTransferInput) {
    const result = await addTransfer(input);
    if (result.ok) {
      setTransferOpen(false);
      setFormOpen(true);
      setRecentSaved(null);
      recentSavedRef.current = null;
      setNotice("Đã chuyển tiền giữa các tài khoản.");
    }
    return result;
  }

  function handleClose() {
    setFormOpen(false);
    if (recentSavedRef.current) {
      // Preserve the old return-to-Capture behavior, but delay it briefly so
      // the just-saved transaction can be corrected through the trusted edit path.
      recentSavedRef.current = null;
      return;
    }
    captureStartedAtRef.current = null;
    selectedPatternRankRef.current = null;
    router.push("/capture");
  }

  function openTransfer() {
    setFormOpen(false);
    setRecentSaved(null);
    recentSavedRef.current = null;
    captureStartedAtRef.current = null;
    lastSavedAtRef.current = null;
    selectedPatternRankRef.current = null;
    setTransferOpen(true);
  }

  function closeTransfer() {
    setTransferOpen(false);
    setFormOpen(true);
  }

  function editRecentSaved() {
    if (!recentSaved) return;
    if (lastSavedAtRef.current !== null) {
      const measurement = buildQuickCaptureCorrectionMeta(
        performance.now() - lastSavedAtRef.current,
      );
      if (measurement) {
        trackProductEvent("quick_capture_correction_opened", measurement);
      }
    }
    lastSavedAtRef.current = null;
    setEditing(recentSaved);
    setRecentSaved(null);
    recentSavedRef.current = null;
    setNotice("");
  }

  function addAnother() {
    setRecentSaved(null);
    recentSavedRef.current = null;
    setNotice("");
    captureStartedAtRef.current = performance.now();
    lastSavedAtRef.current = null;
    selectedPatternRankRef.current = null;
    setFormOpen(true);
  }

  const initialKind =
    initialMode === "expense" || initialMode === "income"
      ? initialMode
      : undefined;

  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
      primaryAction={{
        label: "Inbox",
        href: "/inbox",
        icon: "inbox",
      }}
      notice={notice}
      noticeAction={
        recentSaved
          ? {
              label: "Sửa",
              onClick: editRecentSaved,
              disabled: isMutating,
            }
          : undefined
      }
    >
      <main className={styles.workspace} data-slot="capture-quick-workspace">
        <section className={styles.titleRow} aria-labelledby="capture-quick-title">
          <div className={styles.titleCopy}>
            <LinkButton
              className={styles.eyebrow}
              href="/capture"
              intent="quiet"
              targetSize="important"
            >
              ← Capture
            </LinkButton>
            <h1 id="capture-quick-title">Thêm nhanh</h1>
            <p>
              Nhập số tiền trước. MoneyFlow dùng lựa chọn ổn định từ sổ gần đây;
              nếu chưa đủ chắc chắn, lựa chọn gần nhất trên thiết bị vẫn là dự phòng.
            </p>
          </div>
          <div className={styles.headingActions}>
            <LinkButton
              href="/inbox"
              intent="secondary"
              targetSize="important"
            >
              <Icon name="inbox" /> Về Inbox
            </LinkButton>
          </div>
        </section>

        {workspace.dataError ? (
          <Alert tone="error" live="assertive" className={styles.state}>
            <AlertTitle>Không tải được dữ liệu</AlertTitle>
            <AlertDescription>{workspace.dataError}</AlertDescription>
            <Button
              type="button"
              intent="secondary"
              targetSize="important"
              onClick={() => router.refresh()}
            >
              Thử lại
            </Button>
          </Alert>
        ) : null}

        {!workspace.dataError && !hasQuickSetup && !transferOpen ? (
          <EmptyState
            icon={<Icon name="wallet" />}
            title="Chưa sẵn sàng thêm giao dịch"
            description={
              workspace.accounts.length
                ? "Bạn cần ít nhất một danh mục trước khi thêm nhanh."
                : "Bạn cần ít nhất một tài khoản và danh mục trước khi thêm nhanh."
            }
            primaryAction={
              <LinkButton
                href={workspace.accounts.length ? "/categories" : "/accounts"}
                intent="primary"
                targetSize="important"
              >
                {workspace.accounts.length ? "Quản lý danh mục" : "Quản lý tài khoản"}
              </LinkButton>
            }
            secondaryAction={
              <LinkButton
                href="/capture"
                intent="secondary"
                targetSize="important"
              >
                Về Capture
              </LinkButton>
            }
            className={styles.state}
          />
        ) : null}

        {!workspace.dataError && hasQuickSetup && recentSaved && !formOpen ? (
          <Alert tone="success" live="polite" className={styles.state}>
            <AlertTitle>Đã lưu vào sổ</AlertTitle>
            <AlertDescription>
              Nếu vừa nhận ra tài khoản, danh mục hay ghi chú chưa đúng, chọn Sửa ngay;
              hoặc ghi tiếp một khoản khác.
            </AlertDescription>
            <div>
              <Button
                type="button"
                intent="secondary"
                targetSize="important"
                onClick={editRecentSaved}
                disabled={isMutating}
              >
                Sửa
              </Button>{" "}
              <Button
                type="button"
                intent="primary"
                targetSize="important"
                onClick={addAnother}
                disabled={isMutating}
              >
                Ghi khoản khác
              </Button>
            </div>
          </Alert>
        ) : null}

        {!workspace.dataError && hasQuickSetup ? (
          <AddTransactionDialog
            open={formOpen}
            eyebrow="Nhập nhanh"
            title="Ghi giao dịch"
            initialKind={initialKind}
            onClose={handleClose}
            onAdd={handleAdd}
            onTransferRequested={canTransfer ? openTransfer : undefined}
            onFrequentPatternSelectionChange={(rank) => {
              selectedPatternRankRef.current = rank;
            }}
            accounts={workspace.accounts}
            categories={workspace.categories}
            transactions={transactions}
            showFrequentPatterns
            disabled={isMutating}
          />
        ) : null}
      </main>

      <TransferDialog
        open={!workspace.dataError && canTransfer && transferOpen}
        accounts={workspace.accounts}
        onClose={closeTransfer}
        onTransfer={handleTransfer}
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
          payeeSuggestions={payeeSuggestions}
        />
      ) : null}
    </AppShell>
  );
}
