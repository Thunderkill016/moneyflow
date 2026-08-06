"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  archiveIncomeTemplateAction,
  recordIncomeTemplateAction,
  saveIncomeTemplateAction,
  undoIncomeTemplateReceiptAction,
} from "@/app/actions/income-templates";
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import { IncomeTemplateDialog } from "@/components/planning/income-template-dialog";
import { PlanningCard } from "@/components/planning/planning-card";
import {
  Button,
  LinkButton,
  PlanningHeader,
  PlanningReviewDialog,
  PlanningSection,
  PlanningSummary,
  PlanningSummaryItem,
  PlanningWorkspace,
  planningStyles,
} from "@/components/planning/planning-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { type ViewerSummary } from "@/components/user-chip";
import { formatMoney } from "@/lib/money";
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
import { categoryMeta, type AccountOption, type CategoryOption } from "@/lib/sample-data";
import { readStoredTransactions, writeStoredTransactions } from "@/lib/transaction-store";

function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
}

function dueLabel(item: RecurringIncomeTemplate, today: string) {
  if (item.isReceived) return "Đã ghi nhận";
  const days = daysBetween(today, item.dueDate);
  if (days === 0) return "Dự kiến hôm nay";
  if (days < 0) return `Quá ngày dự kiến ${Math.abs(days)} ngày`;
  return `Dự kiến sau ${days} ngày`;
}

function incomeTone(item: RecurringIncomeTemplate, today: string) {
  if (item.isReceived) return "paid" as const;
  const days = daysBetween(today, item.dueDate);
  if (days < 0) return "overdue" as const;
  if (days <= 3) return "soon" as const;
  return "ok" as const;
}

type IncomeReviewAction = "record" | "undo" | "archive";
type IncomeReview = {
  item: RecurringIncomeTemplate;
  action: IncomeReviewAction;
};

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
  const [items, setItems] = useState(initialTemplates);
  const [hydrated, setHydrated] = useState(!viewer.isDemo);
  const [editing, setEditing] = useState<RecurringIncomeTemplate | null>(null);
  const [review, setReview] = useState<IncomeReview | null>(null);
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
  const archived = useMemo(() => items.filter((item) => item.isArchived), [items]);
  const visible = showArchived ? archived : active;
  const totals = incomeTemplateTotals(items);
  const pendingCount = pendingActiveCount(items);
  const canAdd = !dataError && accounts.length > 0 && categories.length > 0;

  function open(item: RecurringIncomeTemplate | null) {
    setEditing(item);
    setVersion((value) => value + 1);
    setDialogOpen(true);
  }

  async function save(input: SaveIncomeTemplateInput) {
    if (viewer.isDemo) {
      const category = categories.find((item) => item.id === input.categoryId);
      const account = accounts.find((item) => item.id === input.accountId);
      if (!category || !account) {
        return { ok: false, message: "Tài khoản hoặc danh mục không hợp lệ." };
      }
      if (category.kind !== "income") {
        return { ok: false, message: "Chỉ dùng danh mục thu cho khoản thu định kỳ." };
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
      setNotice(existing ? "Đã cập nhật khoản thu định kỳ demo." : "Đã thêm khoản thu định kỳ demo.");
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
      setNotice("Đã lưu khoản thu định kỳ.");
    }
    return result;
  }

  async function performArchive(item: RecurringIncomeTemplate) {
    if (viewer.isDemo) {
      setItems((current) => {
        const updated = current.map((value) =>
          value.id === item.id ? { ...value, isArchived: !value.isArchived } : value,
        );
        writeStoredIncomeTemplates(updated);
        return updated;
      });
    } else {
      const result = await archiveIncomeTemplateAction(item.id, !item.isArchived);
      if (!result.ok) {
        setNotice(result.message);
        return false;
      }
      setItems((current) =>
        current.map((value) =>
          value.id === item.id ? { ...value, isArchived: !value.isArchived } : value,
        ),
      );
    }
    setNotice(item.isArchived ? "Đã khôi phục khoản thu định kỳ." : "Đã lưu trữ khoản thu định kỳ.");
    return true;
  }

  async function performRecord(item: RecurringIncomeTemplate) {
    if (item.isReceived) return false;
    try {
      if (viewer.isDemo) {
        const transactionId = crypto.randomUUID();
        const income = buildIncomeTemplateReceipt(item, today, transactionId);
        writeStoredTransactions(appendIncomeReceipt(readStoredTransactions(), income));
        persistIncomeReceiptOccurrence(monthStart, item.id, transactionId);
        setItems((current) => markIncomeReceived(current, item.id, transactionId));
      } else {
        const result = await recordIncomeTemplateAction(
          item.id,
          monthStart,
          today,
          crypto.randomUUID(),
        );
        if (!result.ok) {
          setNotice(result.message);
          return false;
        }
        setItems((current) =>
          markIncomeReceived(current, item.id, result.transactionId ?? "received"),
        );
      }
      setNotice(`Đã ghi khoản thu ${formatMoney(item.amount)} cho ${item.name} vào sổ giao dịch.`);
      return true;
    } catch {
      setNotice("Không thể ghi nhận thu. Hãy thử lại.");
      return false;
    }
  }

  async function performUndo(item: RecurringIncomeTemplate) {
    if (!item.isReceived) return false;
    try {
      if (viewer.isDemo) {
        writeStoredTransactions(removeIncomeReceipt(readStoredTransactions(), item.transactionId));
        persistUndoIncomeReceipt(monthStart, item.id);
        setItems((current) => markIncomeUnreceived(current, item.id));
      } else {
        const result = await undoIncomeTemplateReceiptAction(item.id, monthStart);
        if (!result.ok) {
          setNotice(result.message);
          return false;
        }
        setItems((current) => markIncomeUnreceived(current, item.id));
      }
      setNotice("Đã hoàn tác ghi nhận thu và xóa giao dịch thu liên kết.");
      return true;
    } catch {
      setNotice("Không thể hoàn tác ghi nhận thu. Hãy thử lại.");
      return false;
    }
  }

  async function confirmReview() {
    if (!review) return;
    setBusyId(review.item.id);
    let succeeded = false;
    if (review.action === "record") succeeded = await performRecord(review.item);
    if (review.action === "undo") succeeded = await performUndo(review.item);
    if (review.action === "archive") succeeded = await performArchive(review.item);
    setBusyId(null);
    if (succeeded) setReview(null);
  }

  const reviewTitle =
    review?.action === "record"
      ? "Ghi khoản thu vào sổ?"
      : review?.action === "undo"
        ? "Hoàn tác ghi nhận thu?"
        : review?.item.isArchived
          ? "Khôi phục khoản thu định kỳ?"
          : "Lưu trữ khoản thu định kỳ?";
  const reviewConsequence =
    review?.action === "record"
      ? `MoneyFlow sẽ tạo một giao dịch thu thật vào ${review.item.accountName}. Số dư tài khoản và báo cáo thu nhập sẽ thay đổi.`
      : review?.action === "undo"
        ? "Giao dịch thu liên kết sẽ bị xóa và số dư tài khoản sẽ được tính lại. Bạn có thể ghi nhận lại sau."
        : "Trạng thái hoạt động của mẫu sẽ thay đổi. Các giao dịch đã ghi trước đây vẫn được giữ nguyên.";

  return (
    <AppShell
      viewer={viewer}
      primaryAction={{ label: "Thêm khoản thu định kỳ", onClick: () => open(null), disabled: !canAdd }}
      fabAction={{ label: "Thêm khoản thu định kỳ", onClick: () => open(null), disabled: !canAdd }}
      notice={notice}
    >
      <PlanningWorkspace>
        {dataError ? (
          <Alert tone="error" live="assertive">
            <AlertDescription>{dataError}</AlertDescription>
          </Alert>
        ) : null}

        <PlanningHeader
          section="Thu nhập dự kiến"
          title="Khoản thu định kỳ"
          description="Theo dõi lương và khoản thu lặp lại, rồi ghi vào sổ khi tiền thực sự về."
          truthNote="Số đang chờ nhận chỉ là kỳ vọng. MoneyFlow không cộng nó vào số dư hoặc thu nhập cho đến khi bạn xác nhận tạo giao dịch thu."
        />

        {dataError ? (
          <EmptyState
            icon={<Icon name="bell" />}
            title="Không tải được khoản thu định kỳ"
            description="Dữ liệu của bạn vẫn được bảo vệ. Thử tải lại trang hoặc quay lại Tổng quan."
            primaryAction={
              <LinkButton href="/dashboard" intent="secondary" targetSize="important">
                Về Tổng quan
              </LinkButton>
            }
          />
        ) : !hydrated ? (
          <section className={planningStyles.loadingGrid} aria-busy="true" aria-label="Đang tải khoản thu định kỳ">
            {Array.from({ length: 2 }, (_, index) => (
              <div className={planningStyles.loadingCard} key={index} />
            ))}
          </section>
        ) : (
          <>
            <PlanningSummary label="Tổng quan khoản thu định kỳ">
              <PlanningSummaryItem
                label="Dự kiến chưa nhận"
                meta="Không nằm trong số dư hoặc tổng thu đã ghi."
              >
                <MoneyValue amount={totals.expected} emphasis="strong" align="start" />
              </PlanningSummaryItem>
              <PlanningSummaryItem label="Đã ghi nhận vào sổ">
                <MoneyValue amount={totals.received} emphasis="strong" align="start" />
              </PlanningSummaryItem>
              <PlanningSummaryItem label="Chưa nhận">
                <strong>{pendingCount} khoản</strong>
              </PlanningSummaryItem>
            </PlanningSummary>

            <PlanningSection
              title={showArchived ? "Đã lưu trữ" : "Lịch thu tháng này"}
              description={
                <>
                  Khoản thu chỉ đi vào sổ sau review. Hóa đơn xem tại <Link href="/commitments">Khoản định kỳ</Link>.
                </>
              }
              slot="income-template-list"
              action={
                <Button
                  type="button"
                  intent="secondary"
                  targetSize="important"
                  onClick={() => setShowArchived((value) => !value)}
                >
                  {showArchived ? "Xem đang hoạt động" : `Đã lưu trữ (${archived.length})`}
                </Button>
              }
            >
              {visible.length ? (
                <div className={planningStyles.grid}>
                  {visible.map((item) => {
                    const meta = categoryMeta[item.categoryName] ?? {
                      icon: "wallet",
                      color: "green",
                    };
                    const tone = incomeTone(item, today);
                    const statusText = dueLabel(item, today);

                    return (
                      <PlanningCard key={item.id} tone={tone}>
                        <div className={planningStyles.cardTop}>
                          <span className={planningStyles.icon}>
                            <Icon name={meta.icon as IconName} />
                          </span>
                          <div className={planningStyles.cardTitle}>
                            <h3>{item.name}</h3>
                            <p>{item.categoryName} · {item.accountName} · ngày {item.dueDay}</p>
                          </div>
                          <span className={planningStyles.status} data-slot="planning-card-status">
                            {statusText}
                          </span>
                        </div>

                        <div className={planningStyles.metrics}>
                          <div className={planningStyles.metric}>
                            <span className={planningStyles.metricLabel}>Số tiền</span>
                            <MoneyValue amount={item.amount} emphasis="strong" align="start" />
                          </div>
                          <div className={planningStyles.metric}>
                            <span className={planningStyles.metricLabel}>Tài khoản nhận</span>
                            <strong>{item.accountName}</strong>
                          </div>
                          <div className={planningStyles.metric}>
                            <span className={planningStyles.metricLabel}>Trạng thái sổ</span>
                            <strong>{item.isReceived ? "Đã có giao dịch thu" : "Chưa ghi giao dịch"}</strong>
                          </div>
                        </div>

                        <div className={planningStyles.actions} data-slot="planning-card-actions">
                          {!item.isArchived && (item.isReceived ? (
                            <Button
                              type="button"
                              intent="secondary"
                              targetSize="important"
                              disabled={busyId === item.id}
                              onClick={() => setReview({ item, action: "undo" })}
                            >
                              <Icon name="restore" /> Hoàn tác ghi nhận
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              intent="primary"
                              targetSize="important"
                              disabled={busyId === item.id}
                              onClick={() => setReview({ item, action: "record" })}
                            >
                              <Icon name="check" /> Ghi đã nhận
                            </Button>
                          ))}
                          {!item.isArchived ? (
                            <Button
                              type="button"
                              intent="secondary"
                              targetSize="important"
                              disabled={busyId === item.id}
                              onClick={() => open(item)}
                            >
                              <Icon name="edit" /> Sửa
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            intent="quiet"
                            targetSize="important"
                            disabled={busyId === item.id}
                            onClick={() => setReview({ item, action: "archive" })}
                          >
                            <Icon name={item.isArchived ? "restore" : "archive"} />
                            {item.isArchived ? "Khôi phục" : "Lưu trữ"}
                          </Button>
                        </div>
                      </PlanningCard>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<Icon name="wallet" />}
                  title={showArchived ? "Không có khoản đã lưu trữ" : "Chưa có khoản thu định kỳ"}
                  description={
                    showArchived
                      ? "Các khoản được lưu trữ sẽ xuất hiện tại đây."
                      : "Thêm lương hoặc khoản thu lặp để review và ghi nhận nhanh mỗi tháng."
                  }
                  primaryAction={
                    !showArchived && canAdd ? (
                      <Button type="button" intent="primary" targetSize="important" onClick={() => open(null)}>
                        <Icon name="plus" /> Thêm khoản thu đầu tiên
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </PlanningSection>
          </>
        )}
      </PlanningWorkspace>

      <IncomeTemplateDialog
        key={`${editing?.id ?? "new"}-${version}`}
        open={dialogOpen}
        template={editing}
        accounts={accounts}
        categories={categories}
        onClose={() => setDialogOpen(false)}
        onSave={save}
      />
      <PlanningReviewDialog
        open={Boolean(review)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !busyId) setReview(null);
        }}
        title={reviewTitle}
        description="Kiểm tra đúng khoản, tài khoản nhận và số tiền trước khi tiếp tục."
        details={[
          { label: "Khoản", value: review?.item.name ?? "" },
          { label: "Tài khoản nhận", value: review?.item.accountName ?? "" },
          { label: "Số tiền", value: review ? formatMoney(review.item.amount) : "" },
          { label: "Ngày dự kiến", value: review ? String(review.item.dueDay) : "" },
        ]}
        consequence={reviewConsequence}
        confirmLabel={
          review?.action === "record"
            ? "Tạo giao dịch thu"
            : review?.action === "undo"
              ? "Xóa giao dịch liên kết"
              : review?.item.isArchived
                ? "Khôi phục"
                : "Lưu trữ"
        }
        confirmIntent={review?.action === "undo" ? "destructive" : "primary"}
        pending={Boolean(review && busyId === review.item.id)}
        onConfirm={confirmReview}
      />
    </AppShell>
  );
}
