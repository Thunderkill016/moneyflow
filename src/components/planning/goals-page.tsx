"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  reserveExplanation,
  reservePictureFromTotals,
} from "@/lib/planning/reserve";
import { adjustGoalAction, archiveGoalAction, saveGoalAction } from "@/app/actions/goals";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import {
  PlanningHeader,
  PlanningReviewDialog,
  PlanningSection,
  PlanningSummary,
  PlanningSummaryItem,
  PlanningWorkspace,
  Button,
  planningStyles,
} from "@/components/planning/planning-layout";
import { PlanningCard } from "@/components/planning/planning-card";
import { EmptyState } from "@/components/ui/empty-state";
import { type ViewerSummary } from "@/components/user-chip";
import { formatMoney } from "@/lib/money";
import {
  dailyGoalSaving,
  goalProgress,
  goalRemaining,
  goalTotals,
  type SaveGoalInput,
  type SavingsGoal,
} from "@/lib/planning/goals";

const GoalDialog = dynamic(
  () => import("@/components/planning/goal-dialogs").then((module) => module.GoalDialog),
  { ssr: false },
);
const GoalAllocationDialog = dynamic(
  () =>
    import("@/components/planning/goal-dialogs").then(
      (module) => module.GoalAllocationDialog,
    ),
  { ssr: false },
);

function deadlineLabel(goal: SavingsGoal, today: string) {
  if (!goal.deadline) return "Không đặt thời hạn";
  if (goalProgress(goal) === 100) return "Đã đạt mục tiêu";
  const days = Math.ceil(
    (Date.parse(`${goal.deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86_400_000,
  );
  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days === 0) return "Hạn hôm nay";
  return `Còn ${days} ngày`;
}

export function GoalsPage({
  viewer,
  initialGoals,
  today,
  reserveInputs,
  dataError,
}: {
  viewer: ViewerSummary;
  initialGoals: SavingsGoal[];
  today: string;
  /**
   * Balance and unpaid bills behind the reserve figure. Null when the server
   * could not derive them: a guessed figure would promise money the funding RPC
   * then refuses, and the goal side is recomputed here from live state.
   */
  reserveInputs: { balance: number; protectedForBills: number } | null;
  dataError: string | null;
}) {
  const [goals, setGoals] = useState(initialGoals);
  const reserve = useMemo(
    () =>
      reserveInputs ? reservePictureFromTotals({ ...reserveInputs, goals }) : null,
    [reserveInputs, goals],
  );
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [allocationGoal, setAllocationGoal] = useState<SavingsGoal | null>(null);
  const [allocationMode, setAllocationMode] = useState<"allocate" | "release">("allocate");
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [reviewGoal, setReviewGoal] = useState<SavingsGoal | null>(null);
  const [dialogVersion, setDialogVersion] = useState(0);
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const active = useMemo(() => goals.filter((goal) => !goal.isArchived), [goals]);
  const archived = useMemo(() => goals.filter((goal) => goal.isArchived), [goals]);
  const visible = showArchived ? archived : active;
  const totals = goalTotals(goals, today);

  function openGoal(goal: SavingsGoal | null) {
    setEditing(goal);
    setDialogVersion((value) => value + 1);
    setGoalDialogOpen(true);
  }

  function openAllocation(goal: SavingsGoal, mode: "allocate" | "release") {
    setAllocationGoal(goal);
    setAllocationMode(mode);
    setDialogVersion((value) => value + 1);
    setAllocationOpen(true);
  }

  async function save(input: SaveGoalInput) {
    if (viewer.isDemo) {
      const existing = goals.find((goal) => goal.id === input.id);
      const next: SavingsGoal = {
        ...input,
        id: existing?.id ?? crypto.randomUUID(),
        allocated: existing?.allocated ?? 0,
        isArchived: false,
      };
      setGoals((current) =>
        existing
          ? current.map((goal) => (goal.id === existing.id ? next : goal))
          : [...current, next],
      );
      setGoalDialogOpen(false);
      setNotice(existing ? "Đã cập nhật mục tiêu demo." : "Đã thêm mục tiêu demo.");
      return { ok: true };
    }

    const result = await saveGoalAction(input);
    if (result.ok && result.goal) {
      setGoals((current) =>
        current.some((goal) => goal.id === result.goal!.id)
          ? current.map((goal) => (goal.id === result.goal!.id ? result.goal! : goal))
          : [...current, result.goal!],
      );
      setGoalDialogOpen(false);
      setNotice("Đã lưu mục tiêu.");
    }
    return result;
  }

  async function adjust(amount: number) {
    if (!allocationGoal) return { ok: false, message: "Không tìm thấy mục tiêu." };
    const signedAmount = allocationMode === "allocate" ? amount : -amount;
    const successMessage =
      allocationMode === "allocate"
        ? `Đã đánh dấu ${formatMoney(amount)} cho mục tiêu.`
        : `Đã giảm ${formatMoney(amount)} khỏi số đánh dấu cho mục tiêu.`;

    if (viewer.isDemo) {
      setGoals((current) =>
        current.map((goal) =>
          goal.id === allocationGoal.id
            ? { ...goal, allocated: goal.allocated + signedAmount }
            : goal,
        ),
      );
      setAllocationOpen(false);
      setNotice(successMessage);
      return { ok: true };
    }

    const result = await adjustGoalAction(allocationGoal.id, signedAmount);
    if (result.ok && result.allocated !== undefined) {
      setGoals((current) =>
        current.map((goal) =>
          goal.id === allocationGoal.id ? { ...goal, allocated: result.allocated! } : goal,
        ),
      );
      setAllocationOpen(false);
      setNotice(successMessage);
    }
    return result;
  }

  function requestArchive(goal: SavingsGoal) {
    if (!goal.isArchived && goal.allocated > 0) {
      setNotice("Hãy giảm số đã đánh dấu về 0 trước khi lưu trữ mục tiêu.");
      return;
    }
    setReviewGoal(goal);
  }

  async function confirmArchive() {
    if (!reviewGoal) return;
    setBusyId(reviewGoal.id);
    const result = viewer.isDemo
      ? { ok: true as const }
      : await archiveGoalAction(reviewGoal.id, !reviewGoal.isArchived);
    setBusyId(null);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setGoals((current) =>
      current.map((goal) =>
        goal.id === reviewGoal.id ? { ...goal, isArchived: !goal.isArchived } : goal,
      ),
    );
    setNotice(reviewGoal.isArchived ? "Đã khôi phục mục tiêu." : "Đã lưu trữ mục tiêu.");
    setReviewGoal(null);
  }

  return (
    <AppShell
      viewer={viewer}
      primaryAction={{
        label: "Thêm mục tiêu",
        onClick: () => openGoal(null),
        disabled: Boolean(dataError),
      }}
      showPrimaryActionOnMobile
      notice={notice}
    >
      <PlanningWorkspace>
        <PlanningHeader
          section="Tiền cho tương lai"
          title="Mục tiêu tiết kiệm"
          description="Theo dõi một đích tiền và nhịp kế hoạch mà không làm thay đổi số dư tài khoản."
          truthNote="Số được đánh dấu cho mục tiêu chỉ là một earmark trong kế hoạch. MoneyFlow không tạo giao dịch, không chuyển tiền và không loại số đó khỏi số dư tài khoản."
        />

        <PlanningSummary label="Tổng quan mục tiêu">
          <PlanningSummaryItem
            label="Đã đánh dấu"
            meta="Vẫn nằm trong số dư tài khoản và tổng tài sản."
          >
            <MoneyValue amount={totals.allocated} emphasis="strong" align="start" />
          </PlanningSummaryItem>
          <PlanningSummaryItem label="Tổng đích">
            <MoneyValue amount={totals.target} emphasis="strong" align="start" />
          </PlanningSummaryItem>
          <PlanningSummaryItem
            label="Nhịp kế hoạch mỗi ngày"
            meta="Chỉ tính từ các mục tiêu đang hoạt động có thời hạn."
          >
            <MoneyValue amount={totals.plannedDaily} emphasis="strong" align="start" />
          </PlanningSummaryItem>
          {reserve ? (
            <PlanningSummaryItem
              label={
                reserve.unreserved < 0 ? "Đã dành quá số dư" : "Còn có thể dành"
              }
              meta={reserveExplanation(reserve)}
            >
              <MoneyValue
                amount={Math.abs(reserve.unreserved)}
                emphasis="strong"
                align="start"
              />
            </PlanningSummaryItem>
          ) : null}
        </PlanningSummary>

        <PlanningSection
          title={showArchived ? "Mục tiêu đã lưu trữ" : "Mục tiêu đang theo đuổi"}
          description="Tiến độ dựa trên số bạn chủ động đánh dấu trong MoneyFlow."
          slot="goal-list"
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
              {visible.map((goal) => {
                const progress = goalProgress(goal);
                const remaining = goalRemaining(goal);
                const daily = dailyGoalSaving(goal, today);
                const achieved = progress === 100;
                const tone = achieved ? "achieved" : "ok";

                return (
                  <PlanningCard key={goal.id} tone={tone}>
                    <div className={planningStyles.cardTop}>
                      <span className={planningStyles.icon}>
                        <Icon name={achieved ? "check" : "flag"} />
                      </span>
                      <div className={planningStyles.cardTitle}>
                        <h3>{goal.name}</h3>
                        <p>{deadlineLabel(goal, today)}</p>
                      </div>
                      <span className={planningStyles.status} data-slot="planning-card-status">
                        {progress}% hoàn thành
                      </span>
                    </div>

                    <div className={planningStyles.metrics}>
                      <div className={planningStyles.metric}>
                        <span className={planningStyles.metricLabel}>Đã đánh dấu</span>
                        <MoneyValue amount={goal.allocated} emphasis="strong" align="start" />
                      </div>
                      <div className={planningStyles.metric}>
                        <span className={planningStyles.metricLabel}>Mục tiêu</span>
                        <MoneyValue amount={goal.target} emphasis="strong" align="start" />
                      </div>
                      <div className={planningStyles.metric}>
                        <span className={planningStyles.metricLabel}>Còn thiếu</span>
                        <MoneyValue amount={remaining} emphasis="strong" align="start" />
                      </div>
                    </div>

                    <div
                      className={planningStyles.progress}
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${goal.name}: đã hoàn thành ${progress} phần trăm`}
                    >
                      <span
                        className={planningStyles.progressFill}
                        data-tone={tone}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <p className={planningStyles.context}>
                      {daily > 0
                        ? `Nhịp kế hoạch hiện tại: ${formatMoney(daily)} mỗi ngày.`
                        : achieved
                          ? "Mục tiêu đã đủ số được đánh dấu."
                          : "Không có nhịp bắt buộc khi chưa đặt thời hạn."}
                    </p>

                    <div className={planningStyles.actions} data-slot="planning-card-actions">
                      {!goal.isArchived ? (
                        <>
                          <Button
                            type="button"
                            intent="primary"
                            targetSize="important"
                            disabled={achieved || busyId === goal.id}
                            onClick={() => openAllocation(goal, "allocate")}
                          >
                            <Icon name="flag" /> Đánh dấu thêm
                          </Button>
                          <Button
                            type="button"
                            intent="secondary"
                            targetSize="important"
                            disabled={goal.allocated === 0 || busyId === goal.id}
                            onClick={() => openAllocation(goal, "release")}
                          >
                            <Icon name="restore" /> Giảm số đánh dấu
                          </Button>
                          <Button
                            type="button"
                            intent="quiet"
                            targetSize="important"
                            disabled={busyId === goal.id}
                            onClick={() => openGoal(goal)}
                          >
                            <Icon name="edit" /> Sửa
                          </Button>
                        </>
                      ) : null}
                      <Button
                        type="button"
                        intent="quiet"
                        targetSize="important"
                        disabled={busyId === goal.id}
                        onClick={() => requestArchive(goal)}
                      >
                        <Icon name={goal.isArchived ? "restore" : "archive"} />
                        {goal.isArchived ? "Khôi phục" : "Lưu trữ"}
                      </Button>
                    </div>
                  </PlanningCard>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Icon name="flag" />}
              title={showArchived ? "Không có mục tiêu đã lưu trữ" : "Chưa có mục tiêu tiết kiệm"}
              description={
                showArchived
                  ? "Mục tiêu được lưu trữ sẽ xuất hiện tại đây."
                  : "Tạo một đích tiền và theo dõi số bạn chủ động đánh dấu cho kế hoạch."
              }
              primaryAction={
                !showArchived && !dataError ? (
                  <Button
                    type="button"
                    intent="primary"
                    targetSize="important"
                    onClick={() => openGoal(null)}
                  >
                    <Icon name="plus" /> Tạo mục tiêu đầu tiên
                  </Button>
                ) : undefined
              }
            />
          )}
        </PlanningSection>
      </PlanningWorkspace>

      <GoalDialog
        key={`goal-${editing?.id ?? "new"}-${dialogVersion}`}
        open={goalDialogOpen}
        goal={editing}
        today={today}
        onClose={() => setGoalDialogOpen(false)}
        onSave={save}
      />
      <GoalAllocationDialog
        key={`allocation-${allocationGoal?.id ?? "none"}-${allocationMode}-${dialogVersion}`}
        open={allocationOpen}
        goal={allocationGoal}
        mode={allocationMode}
        onClose={() => setAllocationOpen(false)}
        onSubmit={adjust}
      />
      <PlanningReviewDialog
        open={Boolean(reviewGoal)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !busyId) setReviewGoal(null);
        }}
        title={reviewGoal?.isArchived ? "Khôi phục mục tiêu?" : "Lưu trữ mục tiêu?"}
        description="Kiểm tra đúng mục tiêu trước khi tiếp tục."
        details={[
          { label: "Mục tiêu", value: reviewGoal?.name ?? "" },
          {
            label: "Đã đánh dấu",
            value: reviewGoal ? formatMoney(reviewGoal.allocated) : "",
          },
        ]}
        consequence={
          reviewGoal?.isArchived
            ? "Mục tiêu sẽ quay lại danh sách đang hoạt động. Không có giao dịch hoặc thay đổi số dư nào được tạo."
            : "Mục tiêu sẽ chuyển sang danh sách lưu trữ. Số dư tài khoản và tổng tài sản không đổi."
        }
        confirmLabel={reviewGoal?.isArchived ? "Khôi phục" : "Lưu trữ"}
        pending={Boolean(reviewGoal && busyId === reviewGoal.id)}
        onConfirm={confirmArchive}
      />
    </AppShell>
  );
}
