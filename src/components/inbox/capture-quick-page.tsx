"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import {
  addCandidatesForClient,
  getPendingCountForClient,
} from "@/hooks/client-inbox";
import type {
  AccountOption,
  CategoryOption,
  CreateTransactionInput,
  Transaction,
} from "@/lib/sample-data";
import styles from "./capture-quick-page.module.css";

type QuickWorkspace = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  dataError: string | null;
};

/**
 * Capture → Quick Add (wireframes-inbox §7).
 * Reuses the locally owned AddTransactionDialog form in embedded mode with
 * date, keep-open and remembered preferences. Saves to the ledger and records
 * an optional high-confidence manual candidate as already approved.
 */
export function CaptureQuickPage({
  viewer,
  workspace,
}: {
  viewer: ViewerSummary;
  workspace: QuickWorkspace;
}) {
  const router = useRouter();
  const { addTransaction, isMutating } = useTransactions({
    initialTransactions: workspace.transactions,
    accounts: workspace.accounts,
    categories: workspace.categories,
    isDemo: viewer.isDemo,
  });
  const [notice, setNotice] = useState("");
  const [inboxCount, setInboxCount] = useState(0);
  const [formOpen, setFormOpen] = useState(true);

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
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function handleAdd(input: CreateTransactionInput) {
    const result = await addTransaction(input);
    if (!result.ok) return result;

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

    setNotice("Đã lưu giao dịch.");
    return result;
  }

  function handleClose() {
    setFormOpen(false);
    router.push("/capture");
  }

  const hasSetup =
    workspace.accounts.length > 0 && workspace.categories.length > 0;

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
              Ghi một khoản thu/chi tay — tần suất cao, rủi ro thấp. Tài khoản và danh mục được nhớ
              cho lần sau.
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

        {!workspace.dataError && !hasSetup ? (
          <EmptyState
            icon={<Icon name="wallet" />}
            title="Chưa sẵn sàng thêm giao dịch"
            description="Bạn cần ít nhất một tài khoản và danh mục trước khi thêm nhanh."
            primaryAction={
              <LinkButton
                href="/accounts"
                intent="primary"
                targetSize="important"
              >
                Quản lý tài khoản
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

        {!workspace.dataError && hasSetup ? (
          <AddTransactionDialog
            open={formOpen}
            embedded
            eyebrow="Capture"
            title="Thêm nhanh"
            onClose={handleClose}
            onAdd={handleAdd}
            accounts={workspace.accounts}
            categories={workspace.categories}
            disabled={isMutating}
          />
        ) : null}
      </main>
    </AppShell>
  );
}
