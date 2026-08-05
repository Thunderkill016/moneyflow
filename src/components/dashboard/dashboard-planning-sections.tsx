import Link from "next/link";
import { Icon } from "@/components/icons";
import { MoneyValue } from "@/components/money-value";
import { PlanningCardEmpty } from "@/components/planning-card-empty";
import { LinkButton } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import {
  budgetBarColor,
  budgetProgress,
  budgetRemaining,
  budgetStatusLabel,
  budgetThreshold,
  type BudgetSummary,
} from "@/lib/planning/budgets";
import {
  commitmentTotals,
  unpaidActiveCount,
  type RecurringCommitment,
} from "@/lib/planning/commitments";
import {
  PLANNING_EMPTY_BUDGET,
  PLANNING_EMPTY_COMMITMENT,
  PLANNING_EMPTY_GOAL,
  PLANNING_EMPTY_INCOME,
  PLANNING_EMPTY_WEEKLY_LEDGER,
  PLANNING_EMPTY_WEEKLY_WEEK,
} from "@/lib/dashboard-planning-empty";
import {
  dailyGoalSaving,
  goalProgress,
  goalRemaining,
  pickFeaturedGoal,
  type SavingsGoal,
} from "@/lib/planning/goals";
import {
  incomeTemplateTotals,
  pendingActiveCount,
  type RecurringIncomeTemplate,
} from "@/lib/planning/income-templates";
import type { Transaction } from "@/lib/sample-data";
import {
  buildWeeklySummary,
  formatWeekRangeLabel,
  WEEKLY_SUMMARY_ARIA,
  WEEKLY_SUMMARY_REPORTS_HREF,
  WEEKLY_SUMMARY_REPORTS_LABEL,
  WEEKLY_SUMMARY_TITLE,
  weeklyExpenseCompareLine,
} from "@/lib/weekly-summary";

export function DashboardPlanningColumn({
  transactions,
  budgets,
  commitments,
  incomeTemplates,
  goals,
  today,
  isEmptyLedger,
}: {
  transactions: Transaction[];
  budgets: BudgetSummary[];
  commitments: RecurringCommitment[];
  incomeTemplates: RecurringIncomeTemplate[];
  goals: SavingsGoal[];
  today: string;
  isEmptyLedger: boolean;
}) {
  const weeklySummary = buildWeeklySummary(transactions, today);
  const weeklyCompareLine = weeklyExpenseCompareLine(
    weeklySummary.expenseChangePercent,
  );
  const weeklyHasActivity = weeklySummary.income > 0 || weeklySummary.expense > 0;

  const featuredBudget = [...budgets].sort(
    (a, b) => budgetProgress(b) - budgetProgress(a),
  )[0];
  const featuredProgress = featuredBudget ? budgetProgress(featuredBudget) : 0;
  const featuredLevel = featuredBudget ? budgetThreshold(featuredBudget) : null;
  const featuredStatus = featuredBudget ? budgetStatusLabel(featuredBudget) : "";
  const featuredRemaining = featuredBudget ? budgetRemaining(featuredBudget) : 0;
  const featuredBudgetMeterValue = featuredBudget
    ? Math.min(featuredBudget.spent, featuredBudget.limit)
    : 0;
  const featuredBudgetOverage = featuredBudget
    ? Math.max(0, featuredBudget.spent - featuredBudget.limit)
    : 0;
  const featuredBudgetValueText = featuredBudget
    ? featuredLevel === "over"
      ? `${featuredStatus}. Đã dùng ${featuredProgress} phần trăm, vượt ${formatMoney(
          featuredBudgetOverage,
        )}`
      : `${featuredStatus}. Đã dùng ${featuredProgress} phần trăm`
    : "";

  const reservedCommitments = commitmentTotals(commitments).reserved;
  const activeCommitmentCount = commitments.filter((item) => !item.isArchived).length;
  const unpaidCommitments = unpaidActiveCount(commitments);

  const incomeTotals = incomeTemplateTotals(incomeTemplates);
  const activeIncomeCount = incomeTemplates.filter((item) => !item.isArchived).length;
  const pendingIncomeCount = pendingActiveCount(incomeTemplates);

  const featuredGoal = pickFeaturedGoal(goals);
  const featuredGoalProgress = featuredGoal ? goalProgress(featuredGoal) : 0;
  const featuredGoalProgressValue = Math.min(featuredGoalProgress, 100);
  const featuredGoalDaily = featuredGoal ? dailyGoalSaving(featuredGoal, today) : 0;
  const featuredGoalLeft = featuredGoal ? goalRemaining(featuredGoal) : 0;
  const featuredGoalAchieved = featuredGoalProgress >= 100;

  return (
    <div className="right-stack">
      <article
        className="weekly-summary-panel panel"
        aria-label={WEEKLY_SUMMARY_ARIA}
      >
        <div className="section-heading compact">
          <div>
            <h2>{WEEKLY_SUMMARY_TITLE}</h2>
            <p>{formatWeekRangeLabel(weeklySummary.weekStart, weeklySummary.weekEnd)}</p>
          </div>
          <LinkButton
            unstyled
            targetSize="important"
            className="icon-button"
            href={WEEKLY_SUMMARY_REPORTS_HREF}
            aria-label="Mở báo cáo theo tuần"
          >
            <Icon name="arrowRight" aria-hidden="true" />
          </LinkButton>
        </div>
        {weeklyHasActivity ? (
          <>
            <div className="weekly-summary-kpis" role="group" aria-label="Thu chi tuần này">
              <div>
                <span>Thu</span>
                <MoneyValue
                  amount={weeklySummary.income}
                  mode="kind"
                  kind="income"
                  label="Thu tuần"
                  emphasis="strong"
                  className="amount income"
                />
              </div>
              <div>
                <span>Chi</span>
                <MoneyValue
                  amount={weeklySummary.expense}
                  mode="kind"
                  kind="expense"
                  label="Chi tuần"
                  emphasis="strong"
                  className="amount"
                />
              </div>
              <div>
                <span>Ròng</span>
                <MoneyValue
                  amount={weeklySummary.net}
                  mode="signed"
                  label="Ròng tuần"
                  emphasis="strong"
                  className={weeklySummary.net >= 0 ? "amount income" : "amount"}
                />
              </div>
            </div>
            {weeklySummary.topCategory ? (
              <p className="weekly-summary-top">
                Chi nhiều nhất: <strong>{weeklySummary.topCategory}</strong>
                {" · "}
                <MoneyValue
                  amount={weeklySummary.topCategoryAmount}
                  mode="kind"
                  kind="expense"
                />
              </p>
            ) : null}
            {weeklyCompareLine ? (
              <p className="weekly-summary-compare">{weeklyCompareLine}</p>
            ) : null}
            <p className="goal-dashboard-more">
              <Link href={WEEKLY_SUMMARY_REPORTS_HREF}>
                {WEEKLY_SUMMARY_REPORTS_LABEL}
              </Link>
            </p>
          </>
        ) : (
          <PlanningCardEmpty
            {...(isEmptyLedger
              ? PLANNING_EMPTY_WEEKLY_LEDGER
              : PLANNING_EMPTY_WEEKLY_WEEK)}
          />
        )}
      </article>

      <article
        className={`budget-panel panel${
          featuredLevel === "over"
            ? " budget-panel-over"
            : featuredLevel === "near"
              ? " budget-panel-near"
              : ""
        }`}
      >
        <div className="section-heading compact">
          <div>
            <h2>Ngân sách tháng</h2>
            <p>{featuredBudget?.categoryName ?? "Chưa thiết lập"}</p>
          </div>
          <LinkButton
            unstyled
            targetSize="important"
            className="icon-button"
            href="/budgets"
            aria-label="Mở chi tiết ngân sách"
          >
            <Icon name="arrowRight" aria-hidden="true" />
          </LinkButton>
        </div>
        {featuredBudget && featuredLevel ? (
          <>
            <div className="budget-number">
              <MoneyValue
                amount={featuredBudget.spent}
                label="Đã dùng ngân sách"
                emphasis="strong"
              />
              <span aria-hidden="true">/</span>
              <MoneyValue
                amount={featuredBudget.limit}
                label="Giới hạn ngân sách"
              />
            </div>
            <div
              className="budget-track"
              role="meter"
              aria-label={`Mức sử dụng ngân sách ${featuredBudget.categoryName}`}
              aria-valuenow={featuredBudgetMeterValue}
              aria-valuemin={0}
              aria-valuemax={featuredBudget.limit}
              aria-valuetext={featuredBudgetValueText}
            >
              <span
                style={{
                  width: `${Math.min(100, featuredProgress)}%`,
                  backgroundColor: budgetBarColor(featuredLevel),
                }}
              />
            </div>
            <div className="budget-foot">
              <span className={`budget-status-text budget-status-${featuredLevel}`}>
                {featuredStatus}
                {featuredLevel === "near" && featuredRemaining > 0 ? (
                  <>
                    {" · Còn "}
                    <MoneyValue amount={featuredRemaining} />
                  </>
                ) : featuredLevel === "over" && featuredBudgetOverage > 0 ? (
                  <>
                    {" · Vượt "}
                    <MoneyValue amount={featuredBudgetOverage} />
                  </>
                ) : null}
              </span>
              <strong className="font-mono">Đã dùng {featuredProgress}%</strong>
            </div>
          </>
        ) : (
          <PlanningCardEmpty {...PLANNING_EMPTY_BUDGET} />
        )}
      </article>

      <article className="insight-panel" aria-label="Khoản định kỳ đang giữ trước">
        <span className="round-icon purple">
          <Icon name="calendar" aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow">Khoản định kỳ</p>
          {activeCommitmentCount === 0 ? (
            <PlanningCardEmpty
              {...PLANNING_EMPTY_COMMITMENT}
              className="planning-card-empty-inline"
            />
          ) : (
            <>
              <h2>
                {reservedCommitments > 0 ? (
                  <>
                    <MoneyValue amount={reservedCommitments} />
                    {" đang được giữ trước"}
                  </>
                ) : (
                  "Tháng này đã trả hết khoản định kỳ"
                )}
              </h2>
              <p>
                {reservedCommitments > 0 ? (
                  <>
                    <span className="font-mono">{unpaidCommitments} khoản chưa trả</span>
                    {" · "}
                    <Link href="/commitments">
                      Xem lịch thanh toán và đánh dấu đã trả →
                    </Link>
                  </>
                ) : (
                  <Link href="/commitments">Xem lịch khoản định kỳ →</Link>
                )}
              </p>
            </>
          )}
        </div>
      </article>

      <article className="insight-panel" aria-label="Lương định kỳ chờ nhận">
        <span className="round-icon green">
          <Icon name="wallet" aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow">Lương định kỳ</p>
          {activeIncomeCount === 0 ? (
            <PlanningCardEmpty
              {...PLANNING_EMPTY_INCOME}
              className="planning-card-empty-inline"
            />
          ) : (
            <>
              <h2>
                {incomeTotals.expected > 0 ? (
                  <>
                    <MoneyValue amount={incomeTotals.expected} />
                    {" chờ nhận"}
                  </>
                ) : (
                  "Tháng này đã ghi nhận hết lương"
                )}
              </h2>
              <p>
                {incomeTotals.expected > 0 ? (
                  <>
                    <span className="font-mono">{pendingIncomeCount} khoản chưa nhận</span>
                    {" · "}
                    <Link href="/income-templates">Ghi nhận khi tiền về →</Link>
                  </>
                ) : (
                  <Link href="/income-templates">Xem lịch thu →</Link>
                )}
              </p>
            </>
          )}
        </div>
      </article>

      <article
        className={`goal-dashboard-panel panel${featuredGoalAchieved ? " achieved" : ""}`}
        aria-label="Mục tiêu tiết kiệm nổi bật"
      >
        <div className="section-heading compact">
          <div>
            <h2>Mục tiêu tiết kiệm</h2>
            <p>{featuredGoal?.name ?? "Chưa có mục tiêu"}</p>
          </div>
          <LinkButton
            unstyled
            targetSize="important"
            className="icon-button"
            href="/goals"
            aria-label="Mở trang mục tiêu tiết kiệm"
          >
            <Icon name="arrowRight" aria-hidden="true" />
          </LinkButton>
        </div>
        {featuredGoal ? (
          <>
            <div className="budget-number">
              <MoneyValue
                amount={featuredGoal.allocated}
                label="Đã tích lũy cho mục tiêu"
                emphasis="strong"
              />
              <span aria-hidden="true">/</span>
              <MoneyValue amount={featuredGoal.target} label="Mức mục tiêu" />
            </div>
            <div
              className="budget-track"
              role="progressbar"
              aria-valuenow={featuredGoalProgressValue}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={
                featuredGoalAchieved
                  ? `${featuredGoal.name}: đã đạt mục tiêu`
                  : `${featuredGoal.name}: đã đạt ${featuredGoalProgress} phần trăm`
              }
            >
              <span style={{ width: `${featuredGoalProgressValue}%` }} />
            </div>
            <div className="budget-foot">
              <span>
                {featuredGoalAchieved
                  ? "Đã đạt mục tiêu"
                  : `Đã đạt ${featuredGoalProgress}%`}
                {!featuredGoalAchieved && featuredGoalLeft > 0 ? (
                  <>
                    {" · Còn "}
                    <MoneyValue amount={featuredGoalLeft} />
                  </>
                ) : null}
              </span>
              {featuredGoalAchieved ? (
                <strong className="font-mono">Hoàn thành</strong>
              ) : featuredGoalDaily > 0 ? (
                <MoneyValue
                  amount={featuredGoalDaily}
                  suffix="/ngày"
                  emphasis="strong"
                />
              ) : (
                <strong className="font-mono">Tự do tiến độ</strong>
              )}
            </div>
            <p className="goal-dashboard-more">
              <Link href="/goals">Xem tất cả mục tiêu →</Link>
            </p>
          </>
        ) : (
          <PlanningCardEmpty {...PLANNING_EMPTY_GOAL} />
        )}
      </article>
    </div>
  );
}
