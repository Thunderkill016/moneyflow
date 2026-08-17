import Link from "next/link";
import { MoneyValue } from "@/components/money-value";
import { dashboardDrilldownHref } from "@/lib/dashboard-drilldown";
import { dashboardPeriodLabel } from "@/lib/dashboard-period";
import { formatMoney } from "@/lib/money";
import styles from "./statement.module.css";

export type StatementTotals = {
  balance: number;
  income: number;
  expense: number;
  net: number;
};

/**
 * Expense drawn as a share of income.
 *
 * When nothing came in this month there is no ratio to state, so the bar shows
 * expense alone against the empty track rather than inventing a denominator.
 */
export function flowShares(income: number, expense: number) {
  if (income <= 0 && expense <= 0) return { income: 0, expense: 0 };
  if (income <= 0) return { income: 0, expense: 100 };
  const spent = Math.min(expense / income, 1) * 100;
  return { income: 100, expense: spent };
}

export function DashboardStatement({
  totals,
  today,
  isEmptyLedger,
  action,
}: {
  totals: StatementTotals;
  today: string;
  isEmptyLedger: boolean;
  action?: React.ReactNode;
}) {
  const shares = flowShares(totals.income, totals.expense);
  const period = dashboardPeriodLabel(today);

  return (
    <section className={styles.statement} aria-labelledby="mf-standing-label">
      <div className={styles.standing}>
        <div className={styles.standingText}>
          <p className={styles.label} id="mf-standing-label">
            Bạn đang có
          </p>
          <MoneyValue
            amount={totals.balance}
            label="Bạn đang có"
            align="start"
            className={`${styles.figure} ${
              totals.balance < 0 ? styles.figureNegative : ""
            }`}
          />
          <p className={styles.caption}>Cộng số dư mọi ví đang dùng</p>
        </div>
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>

      <div className={styles.flow}>
        <div className={styles.flowHead}>
          <p className={styles.flowPeriod}>{period}</p>
        </div>

        {isEmptyLedger ? (
          <p className={styles.empty}>
            Chưa ghi khoản nào trong tháng này. Ghi khoản đầu tiên để thấy tiền đi
            đâu.
          </p>
        ) : (
          <>
            <div
              className={styles.track}
              role="img"
              aria-label={`${period}: tiền vào ${formatMoney(
                totals.income,
              )}, tiền ra ${formatMoney(totals.expense)}`}
            >
              <i
                className={styles.trackExpense}
                style={{ inlineSize: `${shares.expense}%` }}
              />
            </div>

            <ul className={styles.legend}>
              <li className={`${styles.legendItem} ${styles.legendIncome}`}>
                {/*
                  Kind-level totals drill down to an exact sum: the aggregate and
                  the filtered rows select the same kind over the same calendar
                  month, so the list adds up to the figure shown here.
                */}
                <Link
                  href={dashboardDrilldownHref({ today, kind: "income" }) ?? "/transactions"}
                  className={styles.legendDrill}
                  aria-label="Xem các khoản tiền vào tháng này"
                />
                <span className={styles.legendText}>
                  <i className={styles.dot} aria-hidden="true" />
                  <span className={styles.legendLabel}>Tiền vào</span>
                </span>
                <MoneyValue
                  amount={totals.income}
                  label="Tiền vào tháng này"
                  align="start"
                  className={styles.legendValue}
                />
              </li>
              <li className={`${styles.legendItem} ${styles.legendExpense}`}>
                <Link
                  href={dashboardDrilldownHref({ today, kind: "expense" }) ?? "/transactions"}
                  className={styles.legendDrill}
                  aria-label="Xem các khoản tiền ra tháng này"
                />
                <span className={styles.legendText}>
                  <i className={styles.dot} aria-hidden="true" />
                  <span className={styles.legendLabel}>Tiền ra</span>
                </span>
                <MoneyValue
                  amount={totals.expense}
                  label="Tiền ra tháng này"
                  align="start"
                  className={styles.legendValue}
                />
              </li>
              {/*
                "Còn lại" is intentionally not a drill-down. It is income minus
                expense, and no single set of rows sums to it, so a link here
                would open a list that disagrees with the figure above it.
              */}
              <li className={`${styles.legendItem} ${styles.legendRest}`}>
                <span className={styles.legendText}>
                  <i className={styles.dot} aria-hidden="true" />
                  <span className={styles.legendLabel}>Còn lại</span>
                </span>
                <MoneyValue
                  amount={totals.net}
                  mode="signed"
                  label="Còn lại tháng này"
                  align="start"
                  className={styles.legendValue}
                />
              </li>
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
