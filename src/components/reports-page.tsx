import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { UserChip, type ViewerSummary } from "@/components/user-chip";
import { formatMoney } from "@/lib/money";
import type { ReportPeriod } from "@/lib/reports";
import { categoryMeta } from "@/lib/sample-data";
import type { ReportsWorkspace } from "@/server/reports";

const navItems = [
  { label: "Tổng quan", icon: "home" as const, href: "/" },
  { label: "Giao dịch", icon: "arrows" as const, href: "/transactions" },
  { label: "Ngân sách", icon: "target" as const, href: "/budgets" },
  { label: "Báo cáo", icon: "chart" as const, href: "/reports" },
  { label: "Định kỳ", icon: "calendar" as const, href: "/commitments" },
  { label: "Mục tiêu", icon: "flag" as const, href: "/goals" },
  { label: "Tài khoản", icon: "wallet" as const, href: "/accounts" },
];

const periods: { value: ReportPeriod; label: string }[] = [
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "year", label: "Năm nay" },
];

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(`${value}T00:00:00+07:00`));
}

export function ReportsPage({
  viewer,
  workspace,
  period,
}: {
  viewer: ViewerSummary;
  workspace: ReportsWorkspace;
  period: ReportPeriod;
}) {
  const { report } = workspace;
  const expenseChange = report.expenseChangePercent;
  const expenseDays = report.trend.filter((item) => item.expense > 0);
  const maxExpense = Math.max(1, ...report.trend.map((item) => item.expense));
  const averageExpense = expenseDays.length ? Math.round(report.totals.expense / expenseDays.length) : 0;

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Điều hướng chính">
        <Link className="brand" href="/" aria-label="MoneyFlow, trang tổng quan">
          <span className="brand-mark"><span /></span><span>MoneyFlow</span>
        </Link>
        <nav>
          {navItems.map((item) => (
            <Link href={item.href} className={item.href === "/reports" ? "active" : ""} key={item.label}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="#cai-dat"><Icon name="settings" /><span>Cài đặt</span></a>
          <UserChip viewer={viewer} />
        </div>
      </aside>

      <div className="page-column">
        <header className="topbar">
          <Link className="mobile-brand brand" href="/">
            <span className="brand-mark"><span /></span><span>MoneyFlow</span>
          </Link>
          <div />
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Thông báo"><Icon name="bell" /></button>
            <Link className="secondary-button report-export desktop-add" href={`/reports/export?period=${period}`}>
              <Icon name="arrowDown" />Xuất CSV
            </Link>
            <span className="mobile-avatar avatar">M</span>
          </div>
        </header>

        <main className="dashboard reports-workspace">
          {workspace.dataError && (
            <div className="data-alert" role="alert"><Icon name="bell" /><span>{workspace.dataError}</span></div>
          )}

          <section className="reports-heading">
            <div>
              <p className="eyebrow">Bức tranh tài chính</p>
              <h1>Báo cáo</h1>
              <p>{dateLabel(report.range.currentStart)} – {dateLabel(report.range.currentEnd)} · So với kỳ liền trước cùng số ngày.</p>
            </div>
            <Link className="secondary-button report-export" href={`/reports/export?period=${period}`} aria-disabled={Boolean(workspace.dataError)}>
              <Icon name="arrowDown" />Xuất CSV
            </Link>
          </section>

          <nav className="report-periods" aria-label="Chọn kỳ báo cáo">
            {periods.map((item) => (
              <Link key={item.value} href={`/reports?period=${item.value}`} className={period === item.value ? "active" : ""} aria-current={period === item.value ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>

          <section className="report-metrics" aria-label="Tổng quan kỳ báo cáo">
            <article><span>Thu nhập</span><strong className="positive">+{formatMoney(report.totals.income)}</strong><small>{report.totals.transactions} giao dịch trong kỳ</small></article>
            <article><span>Chi tiêu</span><strong className="negative">−{formatMoney(report.totals.expense)}</strong><small className={expenseChange !== null && expenseChange > 0 ? "negative" : "positive"}>{expenseChange === null ? "Chưa có dữ liệu kỳ trước" : `${expenseChange > 0 ? "Tăng" : expenseChange < 0 ? "Giảm" : "Không đổi"} ${Math.abs(expenseChange)}%`}</small></article>
            <article><span>Dòng tiền ròng</span><strong className={report.totals.net >= 0 ? "positive" : "negative"}>{report.totals.net >= 0 ? "+" : "−"}{formatMoney(Math.abs(report.totals.net))}</strong><small>Thu nhập trừ chi tiêu</small></article>
            <article><span>Kỳ trước</span><strong>{formatMoney(report.previous.expense)}</strong><small>Chi tiêu cùng số ngày</small></article>
          </section>

          {report.totals.transactions ? (
            <div className="reports-grid">
              <section className="report-panel trend-panel">
                <div className="section-heading report-chart-heading">
                  <div><h2>Nhịp chi tiêu</h2><p>Mức chi theo từng {period === "year" ? "tháng" : "ngày"}; chuyển tiền giữa các ví được loại trừ.</p></div>
                  <div className="report-chart-stat"><span>TB/ngày có chi</span><strong>{formatMoney(averageExpense)}</strong></div>
                </div>
                {expenseDays.length ? (
                  <div className="trend-scroll">
                    <div
                      className="trend-chart"
                      role="img"
                      aria-label="Biểu đồ nhịp chi tiêu"
                      style={{
                        gridTemplateColumns: `repeat(${report.trend.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {report.trend.map((item, index) => (
                        <div className={item.expense ? "trend-column has-value" : "trend-column"} key={item.key} title={`${item.label}: chi ${formatMoney(item.expense)}`}>
                          <div className="trend-bars">
                            <span className="expense" style={{ height: `${item.expense ? Math.max(7, item.expense / maxExpense * 100) : 0}%` }}>
                              {item.expense === maxExpense && <b>{formatMoney(item.expense)}</b>}
                            </span>
                          </div>
                          <small>{report.trend.length <= 14 || index === 0 || index === report.trend.length - 1 || (index + 1) % 5 === 0 ? item.label : ""}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="report-subempty compact"><Icon name="chart" /><p>Chưa có khoản chi trong kỳ này.</p></div>
                )}
              </section>

              <section className="report-panel category-panel">
                <div className="section-heading"><div><h2>Chi theo danh mục</h2><p>Những nơi tiền của bạn đi nhiều nhất.</p></div></div>
                {report.categories.length ? (
                  <div className="report-categories">
                    {report.categories.map((item) => {
                      const meta = categoryMeta[item.name] ?? categoryMeta["Thu nhập khác"];
                      return (
                        <div className="report-category" key={item.name}>
                          <span className={`transaction-icon ${meta.color}`}><Icon name={meta.icon as IconName} /></span>
                          <div><strong>{item.name}</strong><span><i style={{ width: `${item.share}%` }} /></span></div>
                          <div><strong>{formatMoney(item.amount)}</strong><small>{item.share}%</small></div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="report-subempty"><Icon name="chart" /><p>Chưa có khoản chi trong kỳ này.</p></div>
                )}
              </section>
            </div>
          ) : (
            <section className="report-empty">
              <span><Icon name="chart" /></span><h2>Chưa có dữ liệu trong kỳ</h2>
              <p>Thêm giao dịch hoặc chọn kỳ dài hơn để MoneyFlow tạo báo cáo.</p>
              <div><Link className="primary-button" href="/transactions"><Icon name="plus" />Thêm giao dịch</Link>{period !== "year" && <Link className="secondary-button" href="/reports?period=year">Xem cả năm</Link>}</div>
            </section>
          )}
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Điều hướng di động">
        {navItems.map((item) => <Link href={item.href} className={item.href === "/reports" ? "active" : ""} key={item.label}><Icon name={item.icon} /><span>{item.label}</span></Link>)}
      </nav>
    </div>
  );
}
