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
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
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
  hydrateCommitmentsWithOccurrences,
  persistPayOccurrence,
  persistUndoOccurrence,
} from "@/lib/planning/commitment-occurrence-store";
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
} from "@/lib/planning/commitments";
import { commitmentDueLabel, commitmentDueTone } from "@/lib/planning-pages";
import { maybeNotifyDueCommitments } from "@/lib/push-client";
import { categoryMeta, type AccountOption, type CategoryOption } from "@/lib/sample-data";
import { readStoredTransactions, writeStoredTransactions } from "@/lib/transaction-store";

const CommitmentDialog = dynamic(
  () =>
    import("@/components/planning/commitment-dialog").then(
      (module) => module.CommitmentDialog,
    ),
  { ssr: false },
);

type CommitmentReviewAction = "pay" | "undo" | "archive";
type CommitmentReview = {
  item: RecurringCommitment;
  action: CommitmentReviewAction;
};

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
  const [review, setReview] = useState<CommitmentReview | null>(null);
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

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void maybeNotifyDueCommitments(items, { today }).then((result) => {
        if (cancelled || result !== "shown") return;
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
  const archived = useMemo(() => items.filter((item) => item.isArchived), [items]);
  const visible = showArchived ? archived : active;
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

  async function performArchive(item: RecurringCommitment) {
    const result = viewer.isDemo
      ? { ok: true as const }
      : await archiveCommitmentAction(item.id, !item.isArchived);
    if (!result.ok) {
      setNotice(result.message);
      return false;
    }
    setItems((current) =>
      current.map((value) =>
        value.id === item.id ? { ...value, isArchived: !value.isArchived } : value,
      ),
    );
    setNotice(item.isArchived ? "Đã khôi phục khoản định kỳ." : "Đã lưu trữ khoản định kỳ.");
    return true;
  }

  async function performPay(item: RecurringCommitment) {
    if (item.isPaid) return false;
    try {
      if (viewer.isDemo) {
        const transactionId = crypto.randomUUID();
        const expense = buildCommitmentPaymentExpense(item, today, transactionId);
        writeStoredTransactions(appendPaymentExpense(readStoredTransactions(), expense));
        persistPayOccurrence(monthStart, item.id, transactionId);
        setItems((current) => markCommitmentPaid(current, item.id, transactionId));
      } else {
        const result = await payCommitmentAction(
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
          markCommitmentPaid(current, item.id, result.transactionId ?? "paid"),
        );
      }
      setNotice(`Đã ghi khoản chi ${formatMoney(item.amount)} cho ${item.name} vào sổ giao dịch.`);
      return true;
    } catch {
      setNotice("Không thể ghi thanh toán. Hãy thử lại.");
      return false;
    }
  }

  async function performUndo(item: RecurringCommitment) {
    if (!item.isPaid) return false;
    try {
      if (viewer.isDemo) {
        writeStoredTransactions(
          removePaymentExpense(readStoredTransactions(), item.transactionId),
        );
        persistUndoOccurrence(monthStart, item.id);
        setItems((current) => markCommitmentUnpaid(current, item.id));
      } else {
        const result = await undoCommitmentPaymentAction(item.id, monthStart);
        if (!result.ok) {
          setNotice(result.message);
          return false;
        }
        setItems((current) => markCommitmentUnpaid(current, item.id));
      }
      setNotice("Đã hoàn tác thanh toán và xóa giao dịch chi liên kết.");
      return true;
    } catch {
      setNotice("Không thể hoàn tác thanh toán. Hãy thử lại.");
      return false;
    }
  }

  async function confirmReview() {
    if (!review) return;
    setBusyId(review.item.id);
    let succeeded = false;
    if (review.action === "pay") succeeded = await performPay(review.item);
    if (review.action === "undo") succeeded = await performUndo(review.item);
    if (review.action === "archive") succeeded = await performArchive(review.item);
    setBusyId(null);
    if (succeeded) setReview(null);
  }

  const reviewTitle =
    review?.action === "pay"
      ? "Ghi thanh toán vào sổ?"
      : review?.action === "undo"
        ? "Hoàn tác thanh toán?"
        : review?.item.isArchived
          ? "Khôi phục khoản định kỳ?"
          : "Lưu trữ khoản định kỳ?";
  const reviewConsequence =
    review?.action === "pay"
      ? `MoneyFlow sẽ tạo một giao dịch chi thật từ ${review.item.accountName}. Số dư tài khoản và báo cáo chi tiêu sẽ thay đổi.`
      : review?.action === "undo"
        ? "Giao dịch chi liên kết sẽ bị xóa và số dư tài khoản sẽ được tính lại. Bạn có thể ghi thanh toán lại sau."
        : "Trạng thái hoạt động của mẫu sẽ thay đổi. Các giao dịch đã ghi trước đây vẫn được giữ nguyên.";

  return (
    <AppShell
      viewer={viewer}
      primaryAction={{ label: "Thêm khoản định kỳ", onClick: () => open(null), disabled: !canAdd }}
      showPrimaryActionOnMobile
      notice={notice}
    >
      <PlanningWorkspace>
        {dataError ? (
          <Alert tone="error" live="assertive">
            <AlertDescription>{dataError}</AlertDescription>
          </Alert>
        ) : null}

        <PlanningHeader
          section="Tiền phải trả"
          title="Khoản định kỳ"
          description={
            <>
              Theo dõi các khoản dự kiến phải trả và chỉ ghi chi khi bạn xác nhận đã thanh toán. {" "}
              <Link href="/settings/notifications">Nhắc đến hạn (opt-in)</Link>
            </>
          }
          truthNote="Khoản chưa thanh toán là một dự kiến trong kế hoạch, không phải tiền đã bị khóa hoặc giữ riêng khỏi tài khoản. Chỉ nút “Ghi đã thanh toán” mới tạo giao dịch chi thật."
        />

        {dataError ? (
          <EmptyState
            icon={<Icon name="bell" />}
            title="Không tải được khoản định kỳ"
            description="Dữ liệu của bạn vẫn được bảo vệ. Thử tải lại trang hoặc quay lại Tổng quan."
            primaryAction={
              <LinkButton href="/dashboard" intent="secondary" targetSize="important">
                Về Tổng quan
              </LinkButton>
            }
          />
        ) : !hydrated ? (
          <section className={planningStyles.loadingGrid} aria-busy="true" aria-label="Đang tải khoản định kỳ">
            {Array.from({ length: 3 }, (_, index) => (
              <div className={planningStyles.loadingCard} key={index} />
            ))}
          </section>
        ) : (
          <>
            <PlanningSummary label="Tổng quan khoản định kỳ">
              <PlanningSummaryItem
                label="Dự kiến phải trả"
                meta="Tổng các khoản đang hoạt động chưa được ghi thanh toán."
              >
                <MoneyValue amount={totals.reserved} emphasis="strong" align="start" />
              </PlanningSummaryItem>
              <PlanningSummaryItem label="Đã ghi thanh toán">
                <MoneyValue amount={totals.paid} emphasis="strong" align="start" />
              </PlanningSummaryItem>
              <PlanningSummaryItem label="Chưa thanh toán">
                <strong>{unpaidCount} khoản</strong>
              </PlanningSummaryItem>
            </PlanningSummary>

            <PlanningSection
              title={showArchived ? "Đã lưu trữ" : "Lịch thanh toán tháng này"}
              description="Ngày 31 tự chuyển thành ngày cuối tháng nếu tháng ngắn hơn."
              slot="commitment-list"
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
                      icon: "receipt",
                      color: "cyan",
                    };
                    const tone = commitmentDueTone(item, today);
                    const statusText = commitmentDueLabel(item, today);

                    return (
                      <PlanningCard key={item.id} tone={tone}>
                        <div className={planningStyles.cardTop}>
                          <span className={planningStyles.icon}>
                            <Icon name={meta.icon as IconName} />
                          </span>
                          <div className={planningStyles.cardTitle}>
                            <h3>{item.name}</h3>
                            <p>{item.categoryName} · {item.accountName} · hạn ngày {item.dueDay}</p>
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
                            <span className={planningStyles.metricLabel}>Tài khoản</span>
                            <strong>{item.accountName}</strong>
                          </div>
                          <div className={planningStyles.metric}>
                            <span className={planningStyles.metricLabel}>Trạng thái sổ</span>
                            <strong>{item.isPaid ? "Đã có giao dịch chi" : "Chưa ghi giao dịch"}</strong>
                          </div>
                        </div>

                        <div className={planningStyles.actions} data-slot="planning-card-actions">
                          {!item.isArchived && (item.isPaid ? (
                            <Button
                              type="button"
                              intent="secondary"
                              targetSize="important"
                              disabled={busyId === item.id}
                              onClick={() => setReview({ item, action: "undo" })}
                            >
                              <Icon name="restore" /> Hoàn tác thanh toán
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              intent="primary"
                              targetSize="important"
                              disabled={busyId === item.id}
                              onClick={() => setReview({ item, action: "pay" })}
                            >
                              <Icon name="check" /> Ghi đã thanh toán
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
                  icon={<Icon name="calendar" />}
                  title={showArchived ? "Không có khoản đã lưu trữ" : "Chưa có khoản định kỳ"}
                  description={
                    showArchived
                      ? "Các khoản được lưu trữ sẽ xuất hiện tại đây."
                      : "Thêm tiền nhà hoặc hóa đơn để theo dõi ngày và chỉ ghi chi khi bạn thanh toán."
                  }
                  primaryAction={
                    !showArchived && canAdd ? (
                      <Button type="button" intent="primary" targetSize="important" onClick={() => open(null)}>
                        <Icon name="plus" /> Thêm khoản đầu tiên
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </PlanningSection>
          </>
        )}
      </PlanningWorkspace>

      <CommitmentDialog
        key={`${editing?.id ?? "new"}-${version}`}
        open={dialogOpen}
        commitment={editing}
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
        description="Kiểm tra đúng khoản, tài khoản và số tiền trước khi tiếp tục."
        details={[
          { label: "Khoản", value: review?.item.name ?? "" },
          { label: "Tài khoản", value: review?.item.accountName ?? "" },
          { label: "Số tiền", value: review ? formatMoney(review.item.amount) : "" },
          { label: "Hạn ngày", value: review ? String(review.item.dueDay) : "" },
        ]}
        consequence={reviewConsequence}
        confirmLabel={
          review?.action === "pay"
            ? "Tạo giao dịch chi"
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
