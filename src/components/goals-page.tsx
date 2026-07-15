"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { adjustGoalAction, archiveGoalAction, saveGoalAction } from "@/app/actions/goals";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { PlanningCard } from "@/components/planning-card";
import { type ViewerSummary } from "@/components/user-chip";
import { dailyGoalSaving, goalProgress, goalTotals, type SaveGoalInput, type SavingsGoal } from "@/lib/goals";
import { formatMoney } from "@/lib/money";
import { PAGE_EMPTY_GOAL, PAGE_EMPTY_GOAL_ARCHIVED } from "@/lib/planning-pages";

const GoalDialog = dynamic(
  () => import("@/components/goal-dialogs").then((m) => m.GoalDialog),
  { ssr: false },
);
const GoalAllocationDialog = dynamic(
  () => import("@/components/goal-dialogs").then((m) => m.GoalAllocationDialog),
  { ssr: false },
);

function deadlineLabel(goal: SavingsGoal, today: string) { if (!goal.deadline) return "Không đặt thời hạn"; if (goalProgress(goal) === 100) return "Đã đạt mục tiêu"; const days = Math.ceil((Date.parse(`${goal.deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000); if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`; if (days === 0) return "Hạn hôm nay"; return `Còn ${days} ngày`; }

export function GoalsPage({ viewer, initialGoals, today, dataError }: { viewer: ViewerSummary; initialGoals: SavingsGoal[]; today: string; dataError: string | null }) {
  const [goals, setGoals] = useState(initialGoals); const [editing, setEditing] = useState<SavingsGoal | null>(null); const [goalDialogOpen, setGoalDialogOpen] = useState(false); const [allocationGoal, setAllocationGoal] = useState<SavingsGoal | null>(null); const [allocationMode, setAllocationMode] = useState<"allocate" | "release">("allocate"); const [allocationOpen, setAllocationOpen] = useState(false); const [dialogVersion, setDialogVersion] = useState(0); const [notice, setNotice] = useState(""); const [busyId, setBusyId] = useState<string | null>(null); const [showArchived, setShowArchived] = useState(false);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 4200); return () => window.clearTimeout(timer); }, [notice]);
  const active = useMemo(() => goals.filter((goal) => !goal.isArchived), [goals]); const visible = showArchived ? goals.filter((goal) => goal.isArchived) : active; const totals = goalTotals(goals, today);
  function openGoal(goal: SavingsGoal | null) { setEditing(goal); setDialogVersion((value) => value + 1); setGoalDialogOpen(true); }
  function openAllocation(goal: SavingsGoal, mode: "allocate" | "release") { setAllocationGoal(goal); setAllocationMode(mode); setDialogVersion((value) => value + 1); setAllocationOpen(true); }
  async function save(input: SaveGoalInput) { if (viewer.isDemo) { const existing = goals.find((goal) => goal.id === input.id); const next: SavingsGoal = { ...input, id: existing?.id ?? crypto.randomUUID(), allocated: existing?.allocated ?? 0, isArchived: false }; setGoals((current) => existing ? current.map((goal) => goal.id === existing.id ? next : goal) : [...current, next]); setGoalDialogOpen(false); setNotice(existing ? "Đã cập nhật mục tiêu demo." : "Đã thêm mục tiêu demo."); return { ok: true }; } const result = await saveGoalAction(input); if (result.ok && result.goal) { setGoals((current) => current.some((goal) => goal.id === result.goal!.id) ? current.map((goal) => goal.id === result.goal!.id ? result.goal! : goal) : [...current, result.goal!]); setGoalDialogOpen(false); setNotice("Đã lưu mục tiêu."); } return result; }
  async function adjust(amount: number) { if (!allocationGoal) return { ok: false, message: "Không tìm thấy mục tiêu." }; const signedAmount = allocationMode === "allocate" ? amount : -amount; if (viewer.isDemo) { const nextAllocated = allocationGoal.allocated + signedAmount; setGoals((current) => current.map((goal) => goal.id === allocationGoal.id ? { ...goal, allocated: nextAllocated } : goal)); setAllocationOpen(false); setNotice(allocationMode === "allocate" ? `Đã dành ${formatMoney(amount)} cho mục tiêu.` : `Đã mở khóa ${formatMoney(amount)}.`); return { ok: true }; } const result = await adjustGoalAction(allocationGoal.id, signedAmount); if (result.ok && result.allocated !== undefined) { setGoals((current) => current.map((goal) => goal.id === allocationGoal.id ? { ...goal, allocated: result.allocated! } : goal)); setAllocationOpen(false); setNotice(allocationMode === "allocate" ? `Đã dành ${formatMoney(amount)} cho mục tiêu.` : `Đã mở khóa ${formatMoney(amount)}.`); } return result; }
  async function archive(goal: SavingsGoal) { if (!goal.isArchived && goal.allocated > 0) { setNotice("Hãy rút hết tiền đã dành trước khi lưu trữ mục tiêu."); return; } if (!window.confirm(`${goal.isArchived ? "Khôi phục" : "Lưu trữ"} “${goal.name}”?`)) return; setBusyId(goal.id); const result = viewer.isDemo ? { ok: true as const } : await archiveGoalAction(goal.id, !goal.isArchived); setBusyId(null); if (!result.ok) { setNotice(result.message); return; } setGoals((current) => current.map((item) => item.id === goal.id ? { ...item, isArchived: !item.isArchived } : item)); setNotice(goal.isArchived ? "Đã khôi phục mục tiêu." : "Đã lưu trữ mục tiêu."); }
  return (
    <AppShell
      viewer={viewer}
      primaryAction={{
        label: "Thêm mục tiêu",
        onClick: () => openGoal(null),
        disabled: Boolean(dataError),
      }}
      fabAction={{
        label: "Thêm mục tiêu",
        onClick: () => openGoal(null),
        disabled: Boolean(dataError),
      }}
      notice={notice}
    >
      <main className="dashboard goals-workspace">
        {dataError && <div className="data-alert" role="alert"><Icon name="bell" /><span>{dataError}</span></div>}
        <section className="budgets-heading">
          <div>
            <p className="eyebrow">
              <Link href="/insights" className="planning-back-link">
                Insights
              </Link>
              {" · "}Tiền cho tương lai
            </p>
            <h1>Mục tiêu tiết kiệm</h1>
            <p>Khóa một phần số dư cho điều quan trọng mà không làm sai tổng tài sản.</p>
          </div>
        </section>
        <section className="goal-hero">
          <div>
            <span className="round-icon purple"><Icon name="lock" /></span>
            <p>Đã dành riêng</p>
            <strong className="font-mono">{formatMoney(totals.allocated)}</strong>
            <small>Không tính vào tiền có thể chi</small>
          </div>
          <div>
            <p>Đích của các mục tiêu</p>
            <strong className="font-mono">{formatMoney(totals.target)}</strong>
          </div>
          <div>
            <p>Nên dành mỗi ngày</p>
            <strong className="font-mono">{formatMoney(totals.plannedDaily)}</strong>
            <small>Dựa trên các mục tiêu có thời hạn</small>
          </div>
        </section>
        <div className="commitment-list-heading">
          <div>
            <h2>{showArchived ? "Mục tiêu đã lưu trữ" : "Mục tiêu đang theo đuổi"}</h2>
            <p>Mỗi khoản được dành vẫn nằm trong tổng tài sản của bạn.</p>
          </div>
          <button onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? "Xem đang hoạt động" : `Đã lưu trữ (${goals.filter((goal) => goal.isArchived).length})`}
          </button>
        </div>
        {visible.length ? (
          <section className="goal-card-grid">
            {visible.map((goal) => {
              const progress = goalProgress(goal);
              const daily = dailyGoalSaving(goal, today);
              const achieved = progress === 100;
              return (
                <PlanningCard
                  key={goal.id}
                  tone={achieved ? "achieved" : "ok"}
                  className="goal-card"
                >
                  <div className="goal-card-top">
                    <span className="round-icon purple"><Icon name={achieved ? "check" : "flag"} /></span>
                    <div>
                      <h3>{goal.name}</h3>
                      <p>{deadlineLabel(goal, today)}</p>
                    </div>
                    <strong>{progress}%</strong>
                  </div>
                  <div className="goal-amount">
                    <strong className="font-mono">{formatMoney(goal.allocated)}</strong>
                    <span className="font-mono">/ {formatMoney(goal.target)}</span>
                  </div>
                  <div
                    className="budget-track"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Đã hoàn thành ${progress} phần trăm`}
                  >
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <div className="goal-card-foot">
                    <span>{daily > 0 ? `Nên dành ${formatMoney(daily)}/ngày` : achieved ? "Đã đủ tiền mục tiêu" : "Tự do theo tiến độ của bạn"}</span>
                    <strong className="font-mono">Còn {formatMoney(Math.max(0, goal.target - goal.allocated))}</strong>
                  </div>
                  <div className="goal-actions">
                    {!goal.isArchived && (
                      <>
                        <button type="button" className="goal-allocate" onClick={() => openAllocation(goal, "allocate")} disabled={achieved || busyId === goal.id}><Icon name="lock" />Dành thêm</button>
                        <button type="button" onClick={() => openAllocation(goal, "release")} disabled={goal.allocated === 0 || busyId === goal.id}><Icon name="restore" />Rút ra</button>
                        <button type="button" onClick={() => openGoal(goal)} disabled={busyId === goal.id}><Icon name="edit" />Sửa</button>
                      </>
                    )}
                    <button type="button" onClick={() => archive(goal)} disabled={busyId === goal.id}>
                      <Icon name={goal.isArchived ? "restore" : "archive"} />
                      {goal.isArchived ? "Khôi phục" : "Lưu trữ"}
                    </button>
                  </div>
                </PlanningCard>
              );
            })}
          </section>
        ) : (
          <EmptyState
            {...(showArchived ? PAGE_EMPTY_GOAL_ARCHIVED : PAGE_EMPTY_GOAL)}
            actionLabel={
              !showArchived && !dataError ? PAGE_EMPTY_GOAL.actionLabel : undefined
            }
            onAction={!showArchived && !dataError ? () => openGoal(null) : undefined}
          />
        )}
      </main>
      <GoalDialog key={`goal-${editing?.id ?? "new"}-${dialogVersion}`} open={goalDialogOpen} goal={editing} today={today} onClose={() => setGoalDialogOpen(false)} onSave={save} />
      <GoalAllocationDialog key={`allocation-${allocationGoal?.id ?? "none"}-${allocationMode}-${dialogVersion}`} open={allocationOpen} goal={allocationGoal} mode={allocationMode} onClose={() => setAllocationOpen(false)} onSubmit={adjust} />
    </AppShell>
  );
}
