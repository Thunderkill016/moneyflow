"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AddTransactionDialog } from "@/components/add-transaction-dialog";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import { useTransactions } from "@/hooks/use-transactions";
import {
  addCandidatesForClient,
  getPendingCountForClient,
} from "@/lib/inbox/client-inbox";
import type {
  AccountOption,
  CategoryOption,
  CreateTransactionInput,
  Transaction,
} from "@/lib/sample-data";

type QuickWorkspace = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  dataError: string | null;
};

/**
 * Capture → Quick Add (wireframes-inbox §7).
 * Reuses AddTransactionDialog form (embedded) with date + keep-open + remember prefs.
 * Saves to ledger; also records a high-confidence manual candidate (approved).
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

    const account = workspace.accounts.find((item) => item.id === input.accountId);
    const category = workspace.categories.find((item) => item.id === input.categoryId);
    const merchant = input.note.trim() || category?.name || "Thêm nhanh";

    try {
      // Optional high-confidence trail in inbox store (already committed to ledger).
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
      /* candidate mirror is optional — ledger save already succeeded */
    }

    setNotice("Đã lưu giao dịch.");
    return result;
  }

  function handleClose() {
    setFormOpen(false);
    router.push("/capture");
  }

  const hasSetup = workspace.accounts.length > 0 && workspace.categories.length > 0;

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
      <main className="dashboard capture-workspace capture-quick-workspace">
        <section className="transactions-title-row capture-title-row">
          <div>
            <p className="eyebrow">
              <Link className="capture-paste-back" href="/capture">
                ← Capture
              </Link>
            </p>
            <h1>Thêm nhanh</h1>
            <p>
              Ghi một khoản thu/chi tay — tần suất cao, rủi ro thấp. Tài khoản và danh mục được nhớ
              cho lần sau.
            </p>
          </div>
          <div className="page-heading-actions">
            <Link className="secondary-button" href="/inbox">
              <Icon name="inbox" />
              Về Inbox
            </Link>
          </div>
        </section>

        {workspace.dataError && (
          <section className="panel capture-quick-state" role="alert">
            <h2>Không tải được dữ liệu</h2>
            <p>{workspace.dataError}</p>
            <button type="button" className="secondary-button" onClick={() => router.refresh()}>
              Thử lại
            </button>
          </section>
        )}

        {!workspace.dataError && !hasSetup && (
          <section className="panel capture-quick-state">
            <h2>Chưa sẵn sàng thêm giao dịch</h2>
            <p>Bạn cần ít nhất một tài khoản và danh mục trước khi thêm nhanh.</p>
            <div className="capture-quick-state-actions">
              <Link className="primary-button" href="/accounts">
                Quản lý tài khoản
              </Link>
              <Link className="secondary-button" href="/capture">
                Về Capture
              </Link>
            </div>
          </section>
        )}

        {!workspace.dataError && hasSetup && (
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
        )}
      </main>
    </AppShell>
  );
}
