"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  archiveCommitmentAction,
  payCommitmentAction,
  saveCommitmentAction,
  undoCommitmentPaymentAction,
} from "@/app/actions/commitments";
import { EmptyState } from "@/components/empty-state";
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { PlanningCard } from "@/components/planning-card";
import { type ViewerSummary } from "@/components/user-chip";
import {
  hydrateCommitmentsWithOccurrences,
  persistPayOccurrence,
  persistUndoOccurrence,
} from "@/lib/commitment-occurrence-store";
import {
  appendPaymentExpense,
  buildCommitmentPaymentExpense,
  commitmentTotals,
  dueDateForMonth,
  markCommitmentPaid,
  markCommitmentUnpaid,
  removePaymentExpense,
  unpaidActiveCount,
  type RecurringCommitment,
  type SaveCommitmentInput,
} from "@/lib/commitments";
import { formatMoney } from "@/lib/money";
import {
  commitmentDueLabel,
  commitmentDueTone,
  PAGE_EMPTY_COMMITMENT,
  PAGE_EMPTY_COMMITMENT_ARCHIVED,
} from "@/lib/planning-pages";
import { maybeNotifyDueCommitments } from "@/lib/push-client";
import { categoryMeta, type AccountOption, type CategoryOption } from "@/lib/sample-data";
import { readStoredTransactions, writeStoredTransactions } from "@/lib/transaction-store";

const CommitmentDialog = dynamic(
  () =>
    import("@/components/commitment-dialog").then((m) => m.CommitmentDialog),
  { ssr: false },
);

export function CommitmentsPage({
  viewer,
  initialCommitments,
  accounts,
  categories,
  monthStart,
  today,
  dataError,
}: {
  viewer: ViewerSummary;
  initialCommitments: RecurringCommitment[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  monthStart: string;
  today: string;
  dataError: string | null;
}) {
  const [items, setItems] = useState(initialCommitments);
  const [hydrated, setHydrated] = useState(!viewer.isDemo);
  const [editing, setEditing] = useState<RecurringCommitment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!viewer.isDemo) return;
    const frame = window.requestAnimationFrame(() => {
      setItems(hydrateCommitmentsWithOccurrences(initialCommitments, monthStart));
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [viewer.isDemo, initialCommitments, monthStart]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /** TASK-130: once hydrated, maybe fire privacy-safe due reminder (opt-in, 1×/day). */
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void maybeNotifyDueCommitments(items, { today }).then((result) => {
        if (cancelled || result !== "shown") return;
        // Quiet success — OS notification is the primary signal; avoid noisy toast.
      });
    }, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hydrated, items, today]);

  const active = useMemo(
    () =>
      items
        .filter((item) => !item.isArchived)
        .sort((a, b) => Number(a.isPaid) - Number(b.isPaid) || a.dueDay - b.dueDay),
    [items],
  );
  const visible = showArchived ? items.filter((item) => item.isArchived) : active;
  const totals = commitmentTotals(items);
  const unpaidCount = unpaidActiveCount(items);
  const canAdd = !dataError && accounts.length > 0 && categories.length > 0;

  function open(item: RecurringCommitment | null) {
    setEditing(item);
    setVersion((value) => value + 1);
    setDialogOpen(true);
  }

  async function save(input: SaveCommitmentInput) {
    if (viewer.isDemo) {
      const category = categories.find((item) => item.id === input.categoryId);
      const account = accounts.find((item) => item.id === input.accountId);
      if (!category || !account) {
        return { ok: false, message: "Tài khoản hoặc danh mục không hợp lệ." };
      }
      const existing = items.find((item) => item.id === input.id);
      const dueDate = dueDateForMonth(monthStart, input.dueDay);
      const next: RecurringCommitment = {
        ...input,
        id: existing?.id ?? crypto.randomUUID(),
        dueDate,
        accountName: account.name,
        categoryName: category.name,
        categoryIcon: category.icon,
        categoryColor: category.color,
        isArchived: false,
        isPaid: existing?.isPaid ?? false,
        transactionId: existing?.transactionId ?? null,
      };
      setItems((current) =>
        existing
          ? current.map((item) => (item.id === existing.id ? next : item))
          : [...current, next],
      );
      setDialogOpen(false);
      setNotice(existing ? "Đã cập nhật khoản định kỳ demo." : "Đã thêm khoản định kỳ demo.");
      return { ok: true };
    }
    const result = await saveCommitmentAction(input, monthStart);
    if (result.ok && result.commitment) {
      setItems((current) =>
        current.some((item) => item.id === result.commitment!.id)
          ? current.map((item) =>
              item.id === result.commitment!.id ? result.commitment! : item,
            )
          : [...current, result.commitment!],
      );
      setDialogOpen(false);
      setNotice("Đã lưu khoản định kỳ.");
    }
    return result;
  }

  async function archive(item: RecurringCommitment) {
    const verb = item.isArchived ? "khôi phục" : "lưu trữ";
    if (
      !window.confirm(
        `${item.isArchived ? "Khôi phục" : "Lưu trữ"} “${item.name}”? Giao dịch đã ghi vẫn được giữ nguyên.`,
      )
    ) {
      return;
    }
    setBusyId(item.id);
    const result = viewer.isDemo
      ? { ok: true as const }
      : await archiveCommitmentAction(item.id, !item.isArchived);
    setBusyId(null);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setItems((current) =>
      current.map((value) =>
        value.id === item.id ? { ...value, isArchived: !value.isArchived } : value,
      ),
    );
    setNotice(`Đã ${verb} khoản định kỳ.`);
  }

  async function pay(item: RecurringCommitment) {
    if (item.isPaid) return;
    if (
      !window.confirm(
        `Xác nhận đã thanh toán “${item.name}” ${formatMoney(item.amount)}? MoneyFlow sẽ tạo một giao dịch chi thật từ ${item.accountName}.`,
      )
    ) {
      return;
    }
    setBusyId(item.id);
    try {
      if (viewer.isDemo) {
        const transactionId = crypto.randomUUID();
        const expense = buildCommitmentPaymentExpense(item, today, transactionId);
        const nextLedger = appendPaymentExpense(readStoredTransactions(), expense);
        writeStoredTransactions(nextLedger);
        persistPayOccurrence(monthStart, item.id, transactionId);
        setItems((current) => markCommitmentPaid(current, item.id, transactionId));
        setNotice(
          `Đã ghi khoản chi ${formatMoney(item.amount)} cho ${item.name} vào sổ giao dịch.`,
        );
        return;
      }
      const result = await payCommitmentAction(
        item.id,
        monthStart,
        today,
        crypto.randomUUID(),
      );
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setItems((current) =>
        markCommitmentPaid(current, item.id, result.transactionId ?? "paid"),
      );
      setNotice(
        `Đã ghi khoản chi ${formatMoney(item.amount)} cho ${item.name} vào sổ giao dịch.`,
      );
    } catch {
      setNotice("Không thể ghi thanh toán. Hãy thử lại.");
    } finally {
      setBusyId(null);
    }
  }

  async function undo(item: RecurringCommitment) {
    if (!item.isPaid) return;
    if (
      !window.confirm(
        `Hoàn tác thanh toán “${item.name}”? Giao dịch chi vừa liên kết sẽ bị xóa khỏi số dư.`,
      )
    ) {
      return;
    }
    setBusyId(item.id);
    try {
      if (viewer.isDemo) {
        const nextLedger = removePaymentExpense(
          readStoredTransactions(),
          item.transactionId,
        );
        writeStoredTransactions(nextLedger);
        persistUndoOccurrence(monthStart, item.id);
        setItems((current) => markCommitmentUnpaid(current, item.id));
        setNotice("Đã hoàn tác thanh toán.");
        return;
      }
      const result = await undoCommitmentPaymentAction(item.id, monthStart);
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setItems((current) => markCommitmentUnpaid(current, item.id));
      setNotice("Đã hoàn tác thanh toán.");
    } catch {
      setNotice("Không thể hoàn tác thanh toán. Hãy thử lại.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell
      viewer={viewer}
      primaryAction={{
        label: "Thêm khoản định kỳ",
        onClick: () => open(null),
        disabled: !canAdd,
      }}
      fabAction={{
        label: "Thêm khoản định kỳ",
        onClick: () => open(null),
        disabled: !canAdd,
      }}
      notice={notice}
    >
      <main className="dashboard commitments-workspace">
        {dataError ? (
          <div className="data-alert" role="alert">
            <Icon name="bell" />
            <span>{dataError}</span>
          </div>
        ) : null}

        <section className="budgets-heading">
          <div>
            <p className="eyebrow">
              <Link href="/insights" className="planning-back-link">
                Tổng quan
              </Link>
              {" · "}
              Tiền phải trả
            </p>
            <h1>Khoản định kỳ</h1>
            <p>
              Giữ trước tiền hóa đơn để con số “có thể chi” luôn thực tế.{" "}
              <Link href="/settings/notifications" className="planning-back-link">
                Nhắc đến hạn (opt-in)
              </Link>
            </p>
          </div>
        </section>

        {dataError ? (
          <EmptyState
            icon="bell"
            title="Không tải được khoản định kỳ"
            description="Dữ liệu của bạn vẫn được bảo vệ. Thử tải lại trang hoặc quay lại Tổng quan."
            secondaryLabel="Về Tổng quan"
            secondaryHref="/insights"
          />
        ) : !hydrated ? (
          <section className="commitment-card-grid" aria-busy="true" aria-label="Đang tải khoản định kỳ">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="loading-card" key={index} style={{ height: "120px", borderRadius: "16px" }} />
            ))}
          </section>
        ) : (
          <>
            <section className="budget-overview commitment-overview" aria-label="Tổng quan khoản định kỳ">
              <div>
                <span>Đang giữ trước</span>
                <strong className="font-mono">{formatMoney(totals.reserved)}</strong>
              </div>
              <div>
                <span>Đã thanh toán</span>
                <strong className="positive font-mono">{formatMoney(totals.paid)}</strong>
              </div>
              <div>
                <span>Chưa thanh toán</span>
                <strong>
                  {unpaidCount} khoản
                </strong>
              </div>
            </section>

            <div className="commitment-list-heading">
              <div>
                <h2>{showArchived ? "Đã lưu trữ" : "Lịch thanh toán tháng này"}</h2>
                <p>Ngày 31 sẽ tự chuyển thành ngày cuối tháng nếu tháng ngắn hơn.</p>
              </div>
              <button type="button" onClick={() => setShowArchived((value) => !value)}>
                {showArchived
                  ? "Xem đang hoạt động"
                  : `Đã lưu trữ (${items.filter((item) => item.isArchived).length})`}
              </button>
            </div>

            {visible.length ? (
              <section className="commitment-card-grid">
                {visible.map((item) => {
                  const meta = categoryMeta[item.categoryName] ?? {
                    icon: "receipt",
                    color: "cyan",
                  };
                  const tone = commitmentDueTone(item, today);
                  const statusText = commitmentDueLabel(item, today);
                  return (
                    <PlanningCard
                      key={item.id}
                      tone={tone}
                      className="commitment-card"
                    >
                      <div className="commitment-main">
                        <span className={`transaction-icon ${meta.color}`}>
                          <Icon name={meta.icon as IconName} />
                        </span>
                        <div>
                          <div className="commitment-title">
                            <h3>{item.name}</h3>
                            <span className="commitment-due-badge">{statusText}</span>
                          </div>
                          <p>
                            {item.categoryName} · {item.accountName} · hạn ngày {item.dueDay}
                          </p>
                        </div>
                        <strong className="font-mono">{formatMoney(item.amount)}</strong>
                      </div>
                      <div className="commitment-actions">
                        {!item.isArchived &&
                          (item.isPaid ? (
                            <button
                              type="button"
                              onClick={() => undo(item)}
                              disabled={busyId === item.id}
                            >
                              <Icon name="restore" />
                              Hoàn tác
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="commitment-pay"
                              onClick={() => pay(item)}
                              disabled={busyId === item.id}
                            >
                              <Icon name="check" />
                              Đã thanh toán
                            </button>
                          ))}
                        {!item.isArchived && (
                          <button
                            type="button"
                            onClick={() => open(item)}
                            disabled={busyId === item.id}
                          >
                            <Icon name="edit" />
                            Sửa
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => archive(item)}
                          disabled={busyId === item.id}
                        >
                          <Icon name={item.isArchived ? "restore" : "archive"} />
                          {item.isArchived ? "Khôi phục" : "Lưu trữ"}
                        </button>
                      </div>
                    </PlanningCard>
                  );
                })}
              </section>
            ) : (
              <EmptyState
                {...(showArchived ? PAGE_EMPTY_COMMITMENT_ARCHIVED : PAGE_EMPTY_COMMITMENT)}
                actionLabel={
                  !showArchived && canAdd ? PAGE_EMPTY_COMMITMENT.actionLabel : undefined
                }
                onAction={!showArchived && canAdd ? () => open(null) : undefined}
              />
            )}
          </>
        )}
      </main>
      <CommitmentDialog
        key={`${editing?.id ?? "new"}-${version}`}
        open={dialogOpen}
        commitment={editing}
        accounts={accounts}
        categories={categories}
        onClose={() => setDialogOpen(false)}
        onSave={save}
      />
    </AppShell>
  );
}
