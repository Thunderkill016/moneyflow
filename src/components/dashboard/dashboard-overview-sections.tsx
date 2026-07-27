import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Icon, type IconName } from "@/components/icons";
import { MoneyValue } from "@/components/money-value";
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
  isEmptyLedger,
  actionsDisabled,
  onAddTransaction,
}: {
  displayName: string;
  attentionItems: AttentionItem[];
  totals: DashboardTotals;
  isEmptyLedger: boolean;
  actionsDisabled: boolean;
  onAddTransaction: () => void;
}) {
  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Tổng quan</p>
          <h1>Chào {displayName}.</h1>
          <p>Còn bao nhiêu, tháng này thu–chi thế nào, tiền đi đâu — một màn hình.</p>
        </div>
        <div className="welcome-actions">
          <span className="date-pill" aria-hidden="true">
            <span>Tháng này</span>
          </span>
          <Link
            className="secondary-button insights-export-csv"
            href={EXPORT_SETTINGS_HREF}
          >
            <Icon name="arrowDown" /> {EXPORT_CSV_LABEL}
          </Link>
          <button
            type="button"
            className="primary-button insights-ghi-chi"
            onClick={onAddTransaction}
            disabled={actionsDisabled}
          >
            <Icon name="plus" /> {GHI_CHI_TIEU_LABEL}
          </button>
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
                  <Icon name="bell" />
                  <span>{item.label}</span>
                  <Icon name="arrowRight" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="insights-kpi" aria-label="Tóm tắt tháng này">
        <article>
          <span>Số dư tổng</span>
          <MoneyValue amount={totals.balance} label="Số dư tổng" emphasis="strong" />
          <small>Trên mọi ví đang dùng</small>
        </article>
        <article>
          <span>Thu tháng</span>
          <MoneyValue
            amount={totals.income}
            mode="kind"
            kind="income"
            label="Thu tháng"
            emphasis="strong"
            className="amount income"
          />
          <small>Không gồm chuyển ví</small>
        </article>
        <article>
          <span>Chi tháng</span>
          <MoneyValue
            amount={totals.expense}
            mode="kind"
            kind="expense"
            label="Chi tháng"
            emphasis="strong"
            className="amount"
          />
          <small>Không gồm chuyển ví</small>
        </article>
        <article>
          <span>Ròng</span>
          <MoneyValue
            amount={totals.net}
            mode="signed"
            label="Ròng"
            emphasis="strong"
            className={totals.net >= 0 ? "amount income" : "amount"}
          />
          <small>Thu trừ chi tháng này</small>
        </article>
      </section>

      <nav className="insights-planning-nav" aria-label="Kế hoạch từ Tổng quan">
        <p className="insights-planning-label">Kế hoạch</p>
        <ul>
          {PLANNING_LINKS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="insights-planning-link">
                <Icon name={item.icon} />
                <span>
                  <strong>{item.label}</strong>
                  {item.description ? <small>{item.description}</small> : null}
                </span>
                <Icon name="arrowRight" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {isEmptyLedger ? (
        <EmptyState
          icon="wallet"
          title={INSIGHTS_LEDGER_EMPTY.title}
          description={INSIGHTS_LEDGER_EMPTY.description}
          actionLabel={GHI_CHI_TIEU_LABEL}
          onAction={onAddTransaction}
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
              <Link className="section-link" href={REPORTS_MONTH_HREF}>
                {REPORTS_MONTH_LINK_LABEL} <Icon name="arrowRight" />
              </Link>
            </div>
            {topCategories.length ? (
              <ul className="insights-category-list">
                {topCategories.map((item) => {
                  const meta = categoryMeta[item.name] ?? categoryMeta["Thu nhập khác"];
                  return (
                    <li className="insights-category-row" key={item.name}>
                      <span className={`transaction-icon ${meta.color}`}>
                        <Icon name={meta.icon as IconName} />
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
                              width: `${Math.max(item.share, item.amount > 0 ? 4 : 0)}%`,
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
                  <Icon name="chart" />
                </span>
                <h3>Chưa có chi tiêu tháng này</h3>
                <p>Khi bạn ghi chi, danh mục sẽ hiện ở đây dưới dạng thanh ngang.</p>
                <button
                  type="button"
                  onClick={onAddTransaction}
                  disabled={actionsDisabled}
                >
                  {GHI_CHI_TIEU_LABEL}
                </button>
              </div>
            )}
          </article>

          <article className="transactions-panel panel">
            <div className="section-heading">
              <div>
                <h2>Giao dịch gần đây</h2>
                <p>Cập nhật ngay khi bạn ghi khoản mới.</p>
              </div>
              <Link className="section-link" href="/transactions">
                Xem tất cả <Icon name="arrowRight" />
              </Link>
            </div>
            <div className="transaction-list">
              {transactions.slice(0, 5).map((transaction) => {
                const meta =
                  categoryMeta[transaction.category] ?? categoryMeta["Thu nhập khác"];
                return (
                  <div className="transaction-row" key={transaction.id}>
                    <span className={`transaction-icon ${meta.color}`}>
                      <Icon name={meta.icon as IconName} />
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
                    <span className="transaction-time">{transaction.relativeDate}</span>
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
