"use client";

import Link from "next/link";
import {
  reportAccountDrilldownHref,
  reportCategoryDrilldownHref,
} from "@/lib/report-drilldown";
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import {
  SecondaryHeader,
  SecondarySection,
  SecondarySummary,
  SecondarySummaryItem,
  SecondaryWorkspace,
} from "@/components/secondary/secondary-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { type ViewerSummary } from "@/components/user-chip";
import {
  EXPORT_CSV_LABEL,
  EXPORT_SETTINGS_HREF,
  reportCsvDownloadHref,
} from "@/lib/export-data";
import { formatMoney } from "@/lib/money";
import type { ReportPeriod } from "@/lib/reports";
import {
  formatReportPeriodTitle,
  REPORT_PERIOD_OPTIONS,
  reportPeriodHref,
} from "@/lib/reports";
import { categoryMeta } from "@/lib/sample-data";
import type { ReportsWorkspace } from "@/server/reports";
import styles from "./reports-page.module.css";

const RANGE_NOTICES: Record<string, string | null> = {
  none: null,
  invalid: "Khoảng ngày không hợp lệ nên báo cáo đang hiển thị tháng này.",
  swapped: "Đã đổi thứ tự hai ngày cho đúng chiều.",
  future: "Khoảng ngày có mốc trong tương lai nên báo cáo đã giới hạn đến hôm nay.",
  clamped: "Khoảng ngày quá dài nên đã rút lại còn 3 năm gần nhất.",
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(`${value}T00:00:00+07:00`));
}

function expenseChangeLabel(value: number | null) {
  if (value === null) return "Chưa có dữ liệu kỳ trước";
  if (value > 0) return `Tăng ${Math.abs(value)}%`;
  if (value < 0) return `Giảm ${Math.abs(value)}%`;
  return "Không đổi";
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
  /*
   * Both series share one scale, or the two bars in a column would not be
   * comparable and the chart would lie about which way money moved.
   */
  const trendMax = Math.max(
    1,
    ...report.trend.map((item) => Math.max(item.income, item.expense)),
  );
  /*
   * A period can hold income and no expense — a month where salary arrived and
   * nothing was spent yet. Keying the empty state on expense alone would hide
   * real recorded data behind "chưa có khoản chi".
   */
  const trendHasActivity = report.trend.some(
    (item) => item.income > 0 || item.expense > 0,
  );
  const averageExpense = expenseDays.length
    ? Math.round(report.totals.expense / expenseDays.length)
    : 0;
  const { currentStart, currentEnd } = report.range;
  const csvDownloadHref = reportCsvDownloadHref(period, currentStart, currentEnd);
  const exportDisabled = Boolean(workspace.dataError);
  const periodTitle = formatReportPeriodTitle(period, currentStart, currentEnd);
  const rangeCaption = `${dateLabel(currentStart)} – ${dateLabel(currentEnd)} · So với kỳ liền trước cùng số ngày.`;
  const rangeNotice = RANGE_NOTICES[workspace.rangeNotice ?? "none"];

  return (
    <AppShell
      viewer={viewer}
      primaryAction={{
        label: EXPORT_CSV_LABEL,
        href: csvDownloadHref,
        icon: "arrowDown",
        disabled: exportDisabled,
      }}
    >
      <SecondaryWorkspace slot="reports-workspace">
        {workspace.dataError ? (
          <Alert tone="error" live="assertive">
            <AlertDescription className={styles.alertContent}>
              <Icon name="bell" />
              <span>{workspace.dataError}</span>
            </AlertDescription>
          </Alert>
        ) : null}

        <SecondaryHeader
          section="Bức tranh tài chính"
          title="Báo cáo"
          description={
            <p>
              Đọc tiền vào, tiền ra và xu hướng theo khoảng ngày đã được MoneyFlow
              kiểm tra. Chuyển tiền giữa các tài khoản không được tính là thu hoặc chi.
            </p>
          }
          actions={
            <LinkButton
              href={EXPORT_SETTINGS_HREF}
              intent="secondary"
              targetSize="important"
            >
              <Icon name="arrowDown" />
              Tùy chọn xuất
            </LinkButton>
          }
        />

        <section className={styles.periodBlock} aria-labelledby="report-period-title">
          <div className={styles.periodTitle} id="report-period-title" data-period={period}>
            <span className={styles.periodPill}>{periodTitle}</span>
            <span className={styles.rangeCaption}>{rangeCaption}</span>
          </div>
          <nav
            className={styles.periods}
            aria-label="Chọn kỳ báo cáo"
            data-slot="report-periods"
          >
            {REPORT_PERIOD_OPTIONS.map((item) => (
              <Link
                key={item.value}
                href={reportPeriodHref(item.value)}
                className={period === item.value ? styles.periodActive : styles.periodLink}
                aria-current={period === item.value ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={reportPeriodHref("custom", currentStart, currentEnd)}
              className={period === "custom" ? styles.periodActive : styles.periodLink}
              aria-current={period === "custom" ? "page" : undefined}
            >
              Tự chọn
            </Link>
          </nav>
        </section>

        {period === "custom" ? (
          <form
            method="get"
            action="/reports"
            className={styles.customRange}
            aria-label="Chọn khoảng ngày"
          >
            <input type="hidden" name="period" value="custom" />
            <label>
              <span>Từ ngày</span>
              <input
                type="date"
                name="from"
                defaultValue={currentStart}
                max={currentEnd}
                required
              />
            </label>
            <label>
              <span>Đến ngày</span>
              <input type="date" name="to" defaultValue={currentEnd} required />
            </label>
            <Button type="submit" intent="secondary" targetSize="important">
              Áp dụng
            </Button>
          </form>
        ) : null}

        {rangeNotice ? (
          <Alert tone="info" live="polite">
            <AlertDescription className={styles.alertContent}>
              <Icon name="bell" />
              <span>{rangeNotice}</span>
            </AlertDescription>
          </Alert>
        ) : null}

        <SecondarySummary label="Tổng quan kỳ báo cáo" slot="report-metrics">
          <SecondarySummaryItem
            label="Tiền vào"
            value={
              <MoneyValue
                amount={report.totals.income}
                mode="kind"
                kind="income"
                label="Tiền vào"
                emphasis="strong"
                align="start"
              />
            }
            meta={`${report.totals.transactions} giao dịch trong kỳ`}
          />
          <SecondarySummaryItem
            label="Tiền ra"
            value={
              <MoneyValue
                amount={report.totals.expense}
                mode="kind"
                kind="expense"
                label="Tiền ra"
                emphasis="strong"
                align="start"
              />
            }
            meta={
              <span
                className={
                  expenseChange !== null && expenseChange > 0
                    ? styles.changeWarning
                    : styles.changeCalm
                }
              >
                {expenseChangeLabel(expenseChange)}
              </span>
            }
          />
          <SecondarySummaryItem
            label="Còn lại"
            value={
              <MoneyValue
                amount={report.totals.net}
                mode="signed"
                label="Còn lại"
                emphasis="strong"
                align="start"
              />
            }
            meta="Tiền vào trừ tiền ra"
          />
          <SecondarySummaryItem
            label="Kỳ trước"
            value={
              <MoneyValue
                amount={report.previous.expense}
                label="Chi tiêu kỳ trước"
                emphasis="strong"
                align="start"
              />
            }
            meta="Chi tiêu cùng số ngày"
          />
        </SecondarySummary>

        {report.totals.transactions ? (
          <div className={styles.grid}>
            <SecondarySection
              title="Nhịp chi tiêu"
              description={
                <p>
                  Mức chi theo từng {period === "year" ? "tháng" : "ngày"}; chuyển
                  tiền giữa các tài khoản được loại trừ.
                </p>
              }
              action={
                <div className={styles.chartStat}>
                  <span>TB/ngày có chi</span>
                  <MoneyValue
                    amount={averageExpense}
                    label="Trung bình ngày có chi"
                    emphasis="strong"
                  />
                </div>
              }
              contained
              slot="report-trend"
            >
              {trendHasActivity ? (
                <>
                  {/*
                    * Money must not rely on colour alone, so the two series are
                    * named in text here as well as being drawn in different
                    * colours.
                    */}
                  <p className={styles.trendLegend}>
                    <span className={styles.legendIncome}>Thu</span>
                    <span className={styles.legendExpense}>Chi</span>
                  </p>
                  <div className={styles.trendScroll} tabIndex={0}>
                    <div
                      className={styles.trendChart}
                      role="img"
                      aria-label={`Biểu đồ thu và chi ${periodTitle}`}
                      aria-describedby="report-trend-data"
                      style={{
                        gridTemplateColumns: `repeat(${report.trend.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {report.trend.map((item, index) => (
                        <div
                          className={
                            item.expense || item.income
                              ? `${styles.trendColumn} ${styles.hasValue}`
                              : styles.trendColumn
                          }
                          key={item.key}
                          title={`${item.label}: thu ${formatMoney(item.income)} · chi ${formatMoney(item.expense)}`}
                        >
                          <div className={styles.trendBars}>
                            <span
                              className={styles.incomeBar}
                              style={{
                                height: `${
                                  item.income
                                    ? Math.max(7, (item.income / trendMax) * 100)
                                    : 0
                                }%`,
                              }}
                            />
                            <span
                              className={styles.expenseBar}
                              style={{
                                height: `${
                                  item.expense
                                    ? Math.max(7, (item.expense / trendMax) * 100)
                                    : 0
                                }%`,
                              }}
                            >
                              {item.expense === trendMax ? (
                                <b>{formatMoney(item.expense)}</b>
                              ) : null}
                            </span>
                          </div>
                          <small>
                            {report.trend.length <= 14 ||
                            index === 0 ||
                            index === report.trend.length - 1 ||
                            (index + 1) % 5 === 0
                              ? item.label
                              : ""}
                          </small>
                        </div>
                      ))}
                    </div>
                  </div>
                  <ul className={styles.srTrendData} id="report-trend-data">
                    {report.trend.map((item) => (
                      <li key={item.key}>
                        {item.label}: thu {formatMoney(item.income)} · chi{" "}
                        {formatMoney(item.expense)}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className={styles.subEmpty}>
                  <Icon name="chart" />
                  <p>Chưa có giao dịch nào trong kỳ này.</p>
                </div>
              )}
            </SecondarySection>

            <SecondarySection
              title="Chi theo danh mục"
              description={<p>Những nơi tiền của bạn đi nhiều nhất · {periodTitle}.</p>}
              contained
              slot="report-categories"
            >
              {report.categories.length ? (
                <div className={styles.categories}>
                  {report.categories.map((item) => {
                    const meta =
                      categoryMeta[item.name] ?? categoryMeta["Thu nhập khác"];
                    const href = reportCategoryDrilldownHref(report.range, item.name);
                    return (
                      <article className={styles.category} key={item.name}>
                        <span className={styles.categoryIcon} aria-hidden="true">
                          <Icon name={meta.icon as IconName} />
                        </span>
                        <div className={styles.categoryBody}>
                          {/*
                            * Plain text when the name cannot be carried: an
                            * unresolvable category falls back to `all` at
                            * /transactions and would open the whole ledger while
                            * looking like one slice.
                            */}
                          {href ? (
                            <Link className={styles.categoryLink} href={href}>
                              {item.name}
                            </Link>
                          ) : (
                            <strong>{item.name}</strong>
                          )}
                          <span
                            className={styles.categoryTrack}
                            aria-hidden="true"
                          >
                            <i style={{ width: `${item.share}%` }} />
                          </span>
                        </div>
                        <div className={styles.categoryAmount}>
                          <MoneyValue
                            amount={item.amount}
                            mode="kind"
                            kind="expense"
                            label={`Chi cho ${item.name}`}
                            emphasis="strong"
                          />
                          <small>{item.share}%</small>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.subEmpty}>
                  <Icon name="chart" />
                  <p>Chưa có khoản chi trong kỳ này.</p>
                </div>
              )}
            </SecondarySection>

            <SecondarySection
              title="Chi theo tài khoản"
              description={
                <p>
                  Tiền rời khỏi ví nào · {periodTitle}. Chuyển khoản giữa ví của bạn
                  không tính là chi.
                </p>
              }
              contained
              slot="report-accounts"
            >
              {report.accounts.length ? (
                <div className={styles.categories}>
                  {report.accounts.map((item) => {
                    const href = reportAccountDrilldownHref(report.range, item.name);
                    return (
                    <article className={styles.category} key={item.name}>
                      <span className={styles.categoryIcon} aria-hidden="true">
                        <Icon name="wallet" />
                      </span>
                      <div className={styles.categoryBody}>
                        {href ? (
                          <Link className={styles.categoryLink} href={href}>
                            {item.name}
                          </Link>
                        ) : (
                          <strong>{item.name}</strong>
                        )}
                        <span
                          className={styles.categoryTrack}
                          aria-hidden="true"
                        >
                          <i style={{ width: `${item.share}%` }} />
                        </span>
                      </div>
                      <div className={styles.categoryAmount}>
                        <MoneyValue
                          amount={item.amount}
                          mode="kind"
                          kind="expense"
                          label={`Chi từ ${item.name}`}
                          emphasis="strong"
                        />
                        <small>{item.share}%</small>
                      </div>
                    </article>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.subEmpty}>
                  <Icon name="chart" />
                  <p>Chưa có khoản chi trong kỳ này.</p>
                </div>
              )}
            </SecondarySection>
          </div>
        ) : (
          <EmptyState
            icon={<Icon name="chart" />}
            title="Chưa có dữ liệu trong kỳ"
            description="Thêm giao dịch hoặc chọn kỳ dài hơn để MoneyFlow tạo báo cáo."
            primaryAction={
              <LinkButton href="/transactions" intent="primary" targetSize="important">
                <Icon name="plus" />
                Thêm giao dịch
              </LinkButton>
            }
            secondaryAction={
              period !== "year" ? (
                <LinkButton
                  href={reportPeriodHref("year")}
                  intent="secondary"
                  targetSize="important"
                >
                  Xem cả năm
                </LinkButton>
              ) : undefined
            }
          />
        )}

        {!exportDisabled ? (
          <p className={styles.exportNote}>
            Nút xuất nhanh tải CSV của đúng kỳ đang xem. Dữ liệu Inbox và JSON nằm
            trong <Link href={EXPORT_SETTINGS_HREF}>Tùy chọn xuất</Link>; đây không
            phải bản sao lưu có thể khôi phục toàn bộ tài khoản.
          </p>
        ) : null}
      </SecondaryWorkspace>
    </AppShell>
  );
}
