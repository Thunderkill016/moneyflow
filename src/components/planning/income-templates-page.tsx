"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  archiveIncomeTemplateAction,
  recordIncomeTemplateAction,
  saveIncomeTemplateAction,
  undoIncomeTemplateReceiptAction,
} from "@/app/actions/income-templates";
import { EmptyState } from "@/components/empty-state";
import { Icon, type IconName } from "@/components/icons";
import { IncomeTemplateDialog } from "@/components/planning/income-template-dialog";
import { AppShell } from "@/components/layout/app-shell";
import { type ViewerSummary } from "@/components/user-chip";
import { useDemoMasterData } from "@/hooks/use-demo-master-data";
import {
  hydrateIncomeTemplatesWithOccurrences,
  persistIncomeReceiptOccurrence,
  persistUndoIncomeReceipt,
  readStoredIncomeTemplates,
  writeStoredIncomeTemplates,
} from "@/lib/planning/income-template-store";
import {
  appendIncomeReceipt,
  buildIncomeTemplateReceipt,
  dueDateForMonth,
  incomeTemplateTotals,
  markIncomeReceived,
  markIncomeUnreceived,
  pendingActiveCount,
  removeIncomeReceipt,
  type RecurringIncomeTemplate,
  type SaveIncomeTemplateInput,
} from "@/lib/planning/income-templates";
import { formatMoney } from "@/lib/money";
import { categoryMeta, type AccountOption, type CategoryOption } from "@/lib/sample-data";
import { readStoredTransactions, writeStoredTransactions } from "@/lib/transaction-store";

function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
}

function dueLabel(item: RecurringIncomeTemplate, today: string) {
  if (item.isReceived) return "Đã nhận";
  const days = daysBetween(today, item.dueDate);
  if (days === 0) return "Dự kiến hôm nay";
  if (days < 0) return `Quá ngày ${Math.abs(days)} ngày`;
  return `Còn ${days} ngày`;
}

export function IncomeTemplatesPage({
  viewer,
  initialTemplates,
  accounts,
  categories,
  monthStart,
  today,
  dataError,
}: {
  viewer: ViewerSummary;
  initialTemplates: RecurringIncomeTemplate[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  monthStart: string;
  today: string;
  dataError: string | null;
}) {
  const { accounts: liveAccounts, categories: liveCategories } =
    useDemoMasterData({
      isDemo: viewer.isDemo,
      accounts,
      categories,
    });
  const [items, setItems] = useState(initialTemplates);
  const [hydrated, setHydrated] = useState(!viewer.isDemo);
  const [editing, setEditing] = useState<RecurringIncomeTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!viewer.isDemo) return;
    const frame = window.requestAnimationFrame(() => {
      const stored = readStoredIncomeTemplates();
      const base = (stored ?? initialTemplates).map((item) => ({
        ...item,
        dueDate: dueDateForMonth(monthStart, item.dueDay),
      }));
      setItems(hydrateIncomeTemplatesWithOccurrences(base, monthStart));
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [viewer.isDemo, initialTemplates, monthStart]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const active = useMemo(
    () =>
      items
        .filter((item) => !item.isArchived)
        .sort((a, b) => Number(a.isReceived) - Number(b.isReceived) || a.dueDay - b.dueDay),
    [items],
  );
  const visible = showArchived ? items.filter((item) => item.isArchived) : active;
  const totals = incomeTemplateTotals(items);
  const pendingCount = pendingActiveCount(items);
  const canAdd =
    !dataError && liveAccounts.length > 0 && liveCategories.length > 0;

  function open(item: RecurringIncomeTemplate | null) {
    setEditing(item);
    setVersion((value) => value + 1);
    setDialogOpen(true);
  }

  async function save(input: SaveIncomeTemplateInput) {
    if (viewer.isDemo) {
      const category = liveCategories.find(
        (item) => item.id === input.categoryId,
      );
      const account = liveAccounts.find((item) => item.id === input.accountId);
      if (!category || !account) {
        return { ok: false, message: "Tài khoản hoặc danh mục không hợp lệ." };
      }
      if (category.kind !== "income") {
        return { ok: false, message: "Chỉ dùng danh mục thu cho lương định kỳ." };
      }
      const existing = items.find((item) => item.id === input.id);
      const dueDate = dueDateForMonth(monthStart, input.dueDay);
      const next: RecurringIncomeTemplate = {
        ...input,
        id: existing?.id ?? crypto.randomUUID(),
        dueDate,
        accountName: account.name,
        categoryName: category.name,
        categoryIcon: category.icon,
        categoryColor: category.color,
        isArchived: false,
        isReceived: existing?.isReceived ?? false,
        transactionId: existing?.transactionId ?? null,
      };
      setItems((current) => {
        const updated = existing
          ? current.map((item) => (item.id === existing.id ? next : item))
          : [...current, next];
        writeStoredIncomeTemplates(updated);
        return updated;
      });
      setDialogOpen(false);
      setNotice(existing ? "Đã cập nhật lương định kỳ demo." : "Đã thêm lương định kỳ demo.");
      return { ok: true };
    }
    const result = await saveIncomeTemplateAction(input, monthStart);
    if (result.ok && result.template) {
      setItems((current) =>
        current.some((item) => item.id === result.template!.id)
          ? current.map((item) =>
              item.id === result.template!.id ? result.template! : item,
            )
          : [...current, result.template!],
      );
      setDialogOpen(false);
      setNotice("Đã lưu lương định kỳ.");
    }
    return result;
  }

  async function archive(item: RecurringIncomeTemplate) {
    const verb = item.isArchived ? "khôi phục" : "lưu trữ";
    if (
      !window.confirm(
        `${item.isArchived ? "Khôi phục" : "Lưu trữ"} “${item.name}”? Giao dịch đã ghi vẫn được giữ nguyên.`,
      )
    ) {
      return;
    }
    setBusyId(item.id);
    if (viewer.isDemo) {
      setItems((current) => {
        const updated = current.map((value) =>
          value.id === item.id ? { ...value, isArchived: !value.isArchived } : value,
        );
        writeStoredIncomeTemplates(updated);
        return updated;
      });
      setBusyId(null);
      setNotice(`Đã ${verb} lương định kỳ.`);
      return;
    }
    const result = await archiveIncomeTemplateAction(item.id, !item.isArchived);
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
    setNotice(`Đã ${verb} lương định kỳ.`);
  }

  async function record(item: RecurringIncomeTemplate) {
    if (item.isReceived) return;
    if (
      !window.confirm(
        `Xác nhận đã nhận “${item.name}” ${formatMoney(item.amount)}? MoneyFlow sẽ tạo một giao dịch thu vào ${item.accountName}.`,
      )
    ) {
      return;
    }
    setBusyId(item.id);
    try {
      if (viewer.isDemo) {
        const transactionId = crypto.randomUUID();
        const income = buildIncomeTemplateReceipt(item, today, transactionId);
        const nextLedger = appendIncomeReceipt(readStoredTransactions(), income);
        writeStoredTransactions(nextLedger);
        persistIncomeReceiptOccurrence(monthStart, item.id, transactionId);
        setItems((current) => markIncomeReceived(current, item.id, transactionId));
        setNotice(
          `Đã ghi khoản thu ${formatMoney(item.amount)} cho ${item.name} vào sổ giao dịch.`,
        );
        return;
      }
      const result = await recordIncomeTemplateAction(
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
        markIncomeReceived(current, item.id, result.transactionId ?? "received"),
      );
      setNotice(
        `Đã ghi khoản thu ${formatMoney(item.amount)} cho ${item.name} vào sổ giao dịch.`,
      );
    } catch {
      setNotice("Không thể ghi nhận thu. Hãy thử lại.");
    } finally {
      setBusyId(null);
    }
  }

  async function undo(item: RecurringIncomeTemplate) {
    if (!item.isReceived) return;
    if (
      !window.confirm(
        `Hoàn tác ghi nhận “${item.name}”? Giao dịch thu vừa liên kết sẽ bị xóa khỏi số dư.`,
      )
    ) {
      return;
    }
    setBusyId(item.id);
    try {
      if (viewer.isDemo) {
        const nextLedger = removeIncomeReceipt(
          readStoredTransactions(),
          item.transactionId,
        );
        writeStoredTransactions(nextLedger);
        persistUndoIncomeReceipt(monthStart, item.id);
        setItems((current) => markIncomeUnreceived(current, item.id));
        setNotice("Đã hoàn tác ghi nhận thu.");
        return;
      }
      const result = await undoIncomeTemplateReceiptAction(item.id, monthStart);
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setItems((current) => markIncomeUnreceived(current, item.id));
      setNotice("Đã hoàn tác ghi nhận thu.");
    } catch {
      setNotice("Không thể hoàn tác. Hãy thử lại.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell
      viewer={viewer}
      primaryAction={{
        label: "Thêm lương định kỳ",
        onClick: () => open(null),
        disabled: !canAdd,
      }}
      fabAction={{
        label: "Thêm lương định kỳ",
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
              Thu nhập
            </p>
            <h1>Lương định kỳ</h1>
            <p>
              Theo dõi lương và khoản thu lặp lại — tách biệt hóa đơn (khoản chi giữ trước).
            </p>
          </div>
        </section>

        {dataError ? (
          <EmptyState
            icon="bell"
            title="Không tải được lương định kỳ"
            description="Dữ liệu của bạn vẫn được bảo vệ. Thử tải lại trang hoặc quay lại Tổng quan."
            secondaryLabel="Về Tổng quan"
            secondaryHref="/insights"
          />
        ) : !hydrated ? (
          <section
            className="commitment-card-grid"
            aria-busy="true"
            aria-label="Đang tải lương định kỳ"
          >
            {Array.from({ length: 2 }, (_, index) => (
              <div
                className="loading-card"
                key={index}
                style={{ height: "120px", borderRadius: "16px" }}
              />
            ))}
          </section>
        ) : (
          <>
            <section
              className="budget-overview commitment-overview"
              aria-label="Tổng quan lương định kỳ"
            >
              <div>
                <span>Chờ nhận tháng này</span>
                <strong className="positive font-mono">{formatMoney(totals.expected)}</strong>
              </div>
              <div>
                <span>Đã ghi nhận</span>
                <strong className="positive font-mono">{formatMoney(totals.received)}</strong>
              </div>
              <div>
                <span>Chưa nhận</span>
                <strong>{pendingCount} khoản</strong>
              </div>
            </section>

            <div className="commitment-list-heading">
              <div>
                <h2>{showArchived ? "Đã lưu trữ" : "Lịch thu tháng này"}</h2>
                <p>
                  Không giữ trước an toàn chi tiêu — chỉ nhắc và ghi thu khi tiền về. Hóa đơn xem tại{" "}
                  <Link href="/commitments">Khoản định kỳ</Link>.
                </p>
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
                    icon: "wallet",
                    color: "green",
                  };
                  const overdue = !item.isReceived && item.dueDate < today;
                  return (
                    <article
                      className={`commitment-card${item.isReceived ? " paid" : overdue ? " overdue" : ""}`}
                      key={item.id}
                    >
                      <div className="commitment-main">
                        <span className={`transaction-icon ${meta.color}`}>
                          <Icon name={meta.icon as IconName} />
                        </span>
                        <div>
                          <div className="commitment-title">
                            <h3>{item.name}</h3>
                            <span>{dueLabel(item, today)}</span>
                          </div>
                          <p>
                            {item.categoryName} · {item.accountName} · ngày {item.dueDay}
                          </p>
                        </div>
                        <strong className="positive font-mono" aria-label={`Khoản thu +${formatMoney(item.amount)}`}>
                          +{formatMoney(item.amount)}
                        </strong>
                      </div>
                      <div className="commitment-actions">
                        {!item.isArchived &&
                          (item.isReceived ? (
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
                              onClick={() => record(item)}
                              disabled={busyId === item.id}
                            >
                              <Icon name="check" />
                              Đã nhận
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
                    </article>
                  );
                })}
              </section>
            ) : (
              <EmptyState
                icon="wallet"
                title={showArchived ? "Không có khoản đã lưu trữ" : "Chưa có lương định kỳ"}
                description={
                  showArchived
                    ? "Các khoản bạn lưu trữ sẽ xuất hiện tại đây."
                    : "Thêm lương hoặc khoản thu lặp để ghi nhận nhanh mỗi tháng. Hóa đơn vẫn ở trang Định kỳ."
                }
                actionLabel={!showArchived && canAdd ? "Thêm lương đầu tiên" : undefined}
                onAction={!showArchived && canAdd ? () => open(null) : undefined}
              />
            )}
          </>
        )}
      </main>
      <IncomeTemplateDialog
        key={`${editing?.id ?? "new"}-${version}`}
        open={dialogOpen}
        template={editing}
        accounts={liveAccounts}
        categories={liveCategories}
        onClose={() => setDialogOpen(false)}
        onSave={save}
      />
    </AppShell>
  );
}
