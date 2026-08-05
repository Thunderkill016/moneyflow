import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { MoneyValue } from "@/components/money-value";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EXPORT_CSV_LABEL,
  EXPORT_SETTINGS_HREF,
} from "@/lib/export-data";
import { INSIGHTS_LEDGER_EMPTY } from "@/lib/dashboard-planning-empty";
import { GHI_CHI_TIEU_LABEL, PLANNING_LINKS } from "@/lib/nav-ia";
import {
  REPORTS_MONTH_HREF,
  REPORTS_MONTH_LINK_LABEL,
} from "@/lib/reports";
import { categoryMeta, type Transaction } from "@/lib/sample-data";
import { transferRowSubtitle } from "@/lib/transfers";
import { DashboardStatement } from "./statement";

type AttentionItem = {
  id: string;
  href: string;
  label: string;
  tone: string;
};

type DashboardTotals = {
  balance: number;
  income: number;
  expense: number;
  net: number;
};

type ExpenseCategory = {
  name: string;
  amount: number;
  share: number;
};

export function DashboardHeaderSections({
  displayName,
  attentionItems,
  totals,
  today,
  isEmptyLedger,
  onAddTransaction,
}: {
  displayName: string;
  attentionItems: AttentionItem[];
  totals: DashboardTotals;
  today: string;
  isEmptyLedger: boolean;
  onAddTransaction: () => void;
}) {
  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Tổng quan</p>
          <h1>Chào {displayName}.</h1>
        </div>
        <div className="welcome-actions">
          <LinkButton
            className="secondary-button insights-export-csv"
            href={EXPORT_SETTINGS_HREF}
            variant="outline"
            targetSize="important"
          >
            <Icon name="arrowDown" aria-hidden="true" /> {EXPORT_CSV_LABEL}
          </LinkButton>
        </div>
      </section>

      {attentionItems.length > 0 ? (
        <section className="attention-strip" aria-label="Cần chú ý">
          <p className="attention-strip-label">Cần chú ý</p>
          <ul className="attention-strip-list">
            {attentionItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`attention-chip attention-chip-${item.tone}`}
                >
                  <Icon name="bell" aria-hidden="true" />
                  <span>{item.label}</span>
                  <Icon name="arrowRight" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <DashboardStatement
        totals={totals}
        today={today}
        isEmptyLedger={isEmptyLedger}
      />

      <nav className="insights-planning-nav" aria-label="Kế hoạch từ Tổng quan">
        <p className="insights-planning-label">Kế hoạch</p>
        <ul>
          {PLANNING_LINKS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="insights-planning-link">
                <Icon name={item.icon} aria-hidden="true" />
                <span>
                  <strong>{item.label}</strong>
                  {item.description ? <small>{item.description}</small> : null}
                </span>
                <Icon name="arrowRight" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {isEmptyLedger ? (
        <EmptyState
          icon={<Icon name="wallet" />}
          title={INSIGHTS_LEDGER_EMPTY.title}
          description={INSIGHTS_LEDGER_EMPTY.description}
          primaryAction={
            <Button
              type="button"
              intent="secondary"
              targetSize="important"
              onClick={onAddTransaction}
            >
              <Icon name="plus" aria-hidden="true" />
              {GHI_CHI_TIEU_LABEL}
            </Button>
          }
          className="insights-empty"
        />
      ) : null}
    </>
  );
}

export function DashboardLedgerColumn({
  topCategories,
  transactions,
  isEmptyLedger,
  actionsDisabled,
  onAddTransaction,
}: {
  topCategories: ExpenseCategory[];
  transactions: Transaction[];
  isEmptyLedger: boolean;
  actionsDisabled: boolean;
  onAddTransaction: () => void;
}) {
  return (
    <div className="insights-main-stack">
      {!isEmptyLedger ? (
        <>
          <article className="panel categories-panel">
            <div className="section-heading">
              <div>
                <h2>Chi theo danh mục</h2>
                <p>Top danh mục tháng này — thanh ngang, không biểu đồ tròn.</p>
              </div>
              <LinkButton
                unstyled
                targetSize="important"
                className="section-link shrink-0"
                href={REPORTS_MONTH_HREF}
              >
                {REPORTS_MONTH_LINK_LABEL}{" "}
                <Icon name="arrowRight" aria-hidden="true" />
              </LinkButton>
            </div>
            {topCategories.length ? (
              <ul className="insights-category-list">
                {topCategories.map((item) => {
                  const meta =
                    categoryMeta[item.name] ?? categoryMeta["Thu nhập khác"];
                  return (
                    <li className="insights-category-row" key={item.name}>
                      <span className={`transaction-icon ${meta.color}`}>
                        <Icon name={meta.icon as IconName} aria-hidden="true" />
                      </span>
                      <div className="insights-category-meta">
                        <div className="insights-category-labels">
                          <strong>{item.name}</strong>
                          <MoneyValue
                            amount={item.amount}
                            mode="kind"
                            kind="expense"
                            className="amount"
                          />
                        </div>
                        <div
                          className="insights-category-bar"
                          role="img"
                          aria-label={`${item.name}: ${item.share}% chi tháng`}
                        >
                          <i
                            style={{
                              width: `${Math.max(
                                item.share,
                                item.amount > 0 ? 4 : 0,
                              )}%`,
                            }}
                          />
                        </div>
                        <small>{item.share}%</small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="panel-empty compact">
                <span>
                  <Icon name="chart" aria-hidden="true" />
                </span>
                <h3>Chưa có chi tiêu tháng này</h3>
                <p>
                  Khi bạn ghi chi, danh mục sẽ hiện ở đây dưới dạng thanh ngang.
                </p>
                <Button
                  type="button"
                  intent="secondary"
                  targetSize="important"
                  onClick={onAddTransaction}
                  disabled={actionsDisabled}
                >
                  {GHI_CHI_TIEU_LABEL}
                </Button>
              </div>
            )}
          </article>

          <article className="transactions-panel panel">
            <div className="section-heading">
              <div>
                <h2>Giao dịch gần đây</h2>
                <p>Cập nhật ngay khi bạn ghi khoản mới.</p>
              </div>
              <LinkButton
                unstyled
                targetSize="important"
                className="section-link shrink-0"
                href="/transactions"
              >
                Xem tất cả <Icon name="arrowRight" aria-hidden="true" />
              </LinkButton>
            </div>
            <div className="transaction-list">
              {transactions.slice(0, 5).map((transaction) => {
                const meta =
                  categoryMeta[transaction.category] ??
                  categoryMeta["Thu nhập khác"];
                return (
                  <div className="transaction-row" key={transaction.id}>
                    <span className={`transaction-icon ${meta.color}`}>
                      <Icon name={meta.icon as IconName} aria-hidden="true" />
                    </span>
                    <span className="transaction-detail">
                      <strong>{transaction.note}</strong>
                      <small>
                        {transaction.kind === "transfer"
                          ? transferRowSubtitle(
                              transaction.account,
                              transaction.destinationAccount,
                            )
                          : `${transaction.category} · ${transaction.account}`}
                      </small>
                    </span>
                    <span className="transaction-time">
                      {transaction.relativeDate}
                    </span>
                    <MoneyValue
                      amount={transaction.amount}
                      mode="kind"
                      kind={transaction.kind}
                      direction
                      emphasis="strong"
                      className={
                        transaction.kind === "income"
                          ? "amount income"
                          : transaction.kind === "transfer"
                            ? "amount transfer"
                            : "amount"
                      }
                    />
                  </div>
                );
              })}
            </div>
          </article>
        </>
      ) : null}
    </div>
  );
}
