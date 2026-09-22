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
import type { BalanceSeriesPoint } from "@/lib/balance-series";
import { formatMoney, formatSignedMoney } from "@/lib/money";
import type { ReportPeriod } from "@/lib/reports";
import { trackProductEvent } from "@/lib/safe-analytics";
import {
  formatReportPeriodTitle,
  REPORT_PERIOD_OPTIONS,
  reportPeriodHref,
  reportTrendGranularity,
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

/*
 * Fixed viewBox; the SVG scales uniformly to the section width via CSS, so
 * strokes and point dots keep their shape at every viewport.
 */
const BALANCE_CHART = { width: 720, height: 220, padX: 12, padTop: 20, padBottom: 14 };

/**
 * Net worth is a level, not a flow — a line chart is the honest shape (bars
 * anchored at zero would make every bucket look identical at đồng scale). The
 * domain is padded min..max rather than zero-anchored, and the exact scale is
 * disclosed in text below the chart so the truncated axis cannot lie.
 */
function balanceChartGeometry(points: BalanceSeriesPoint[]) {
  const values = points.map((point) => point.value);
  const rawLo = Math.min(...values);
  const rawHi = Math.max(...values);
  const pad = Math.max(Math.round((rawHi - rawLo) * 0.12), 1);
  const lo = rawLo - pad;
  const hi = rawHi + pad;
  const innerW = BALANCE_CHART.width - BALANCE_CHART.padX * 2;
  const innerH = BALANCE_CHART.height - BALANCE_CHART.padTop - BALANCE_CHART.padBottom;
  const x = (index: number) =>
    points.length === 1
      ? BALANCE_CHART.padX + innerW / 2
      : BALANCE_CHART.padX + (index / (points.length - 1)) * innerW;
  const y = (value: number) =>
    BALANCE_CHART.padTop + (1 - (value - lo) / (hi - lo)) * innerH;
  const coords = points.map((point, index) => `${x(index)},${y(point.value)}`);
  return {
    linePoints: coords.join(" "),
    areaPoints: `${BALANCE_CHART.padX},${BALANCE_CHART.padTop + innerH} ${coords.join(" ")} ${
      BALANCE_CHART.padX + innerW
    },${BALANCE_CHART.padTop + innerH}`,
    // Draw the zero baseline only when the series actually crosses it.
    zeroY: rawLo < 0 && rawHi > 0 ? y(0) : null,
    cx: x,
    cy: y,
    lo: rawLo,
    hi: rawHi,
  };
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
  /*
   * The trend buckets are days or months depending on the window's span, so the
   * unit label is derived from the same rule — never keyed on the period name,
   * which would call a 63-day custom window's monthly bars "ngày".
   */
  const trendUnit = reportTrendGranularity(report.range) === "month" ? "tháng" : "ngày";
  const expenseBuckets = report.trend.filter((item) => item.expense > 0);
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
  const averageExpense = expenseBuckets.length
    ? Math.round(report.totals.expense / expenseBuckets.length)
    : 0;
  const { currentStart, currentEnd } = report.range;
  const csvDownloadHref = reportCsvDownloadHref(period, currentStart, currentEnd);
  const exportDisabled = Boolean(workspace.dataError);
  const periodTitle = formatReportPeriodTitle(period, currentStart, currentEnd);
  const rangeCaption = `${dateLabel(currentStart)} – ${dateLabel(currentEnd)} · So với kỳ liền trước cùng số ngày.`;
  const rangeNotice = RANGE_NOTICES[workspace.rangeNotice ?? "none"];

  const balanceSeries = workspace.balanceSeries;
  const netWorth = balanceSeries?.netWorthVnd ?? null;
  const netWorthPoints = netWorth?.points ?? [];
  const netWorthLast = netWorthPoints[netWorthPoints.length - 1]?.value ?? 0;
  const netWorthDelta = netWorthLast - (netWorth?.opening ?? 0);
  const balanceGeometry = netWorthPoints.length
    ? balanceChartGeometry(netWorthPoints)
    : null;

  return (
    <AppShell
      viewer={viewer}
      primaryAction={{
        label: EXPORT_CSV_LABEL,
        href: csvDownloadHref,
        icon: "arrowDown",
        disabled: exportDisabled,
        onClick: () =>
          trackProductEvent("export_downloaded", {
            surface: "reports",
            kind: "transactions",
            format: "csv",
          }),
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

        {workspace.dataError ? null : (
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
        )}

        {workspace.dataError ? null : (
        <SecondarySection
          title="Tài sản ròng"
          description={
            <p>
              Số dư cuối mỗi{" "}
              {balanceSeries?.granularity === "month" ? "tháng" : "ngày"}, suy ra
              từ số dư hiện tại trừ các giao dịch đã ghi sau đó · {periodTitle}.
              Chuyển tiền giữa các tài khoản không làm đổi tổng.
              {balanceSeries?.foreignCurrencyCodes.length
                ? ` Tài khoản ${balanceSeries.foreignCurrencyCodes.join(", ")} giữ nguyên loại tiền, không gộp vào tổng này.`
                : ""}
            </p>
          }
          action={
            netWorth && netWorthPoints.length ? (
              <div className={styles.chartStat}>
                <span>Thay đổi trong kỳ</span>
                <MoneyValue
                  amount={netWorthDelta}
                  mode="signed"
                  label="Thay đổi tài sản ròng trong kỳ"
                  emphasis="strong"
                />
              </div>
            ) : undefined
          }
          contained
          slot="report-balance"
        >
          {balanceSeries === null ? (
            <div className={styles.subEmpty}>
              <Icon name="chart" />
              <p>Chưa tải được dữ liệu số dư.</p>
            </div>
          ) : balanceSeries.accounts.length === 0 ? (
            <div className={styles.subEmpty}>
              <Icon name="wallet" />
              <p>Chưa có tài khoản nào để tính tài sản ròng.</p>
            </div>
          ) : (
            <>
              {netWorth && balanceGeometry ? (
                <>
                  {/*
                    * One series, named in text as well as drawn — money must not
                    * rely on colour alone.
                    */}
                  <p className={styles.trendLegend}>
                    <span className={styles.legendBalance}>Tài sản ròng (VND)</span>
                  </p>
                  <div className={styles.trendScroll} tabIndex={0}>
                    <svg
                      className={styles.balanceChart}
                      viewBox={`0 0 ${BALANCE_CHART.width} ${BALANCE_CHART.height}`}
                      role="img"
                      aria-label={`Biểu đồ tài sản ròng ${periodTitle}`}
                      aria-describedby="report-balance-data"
                    >
                      {balanceGeometry.zeroY !== null ? (
                        <line
                          className={styles.balanceZero}
                          x1={BALANCE_CHART.padX}
                          x2={BALANCE_CHART.width - BALANCE_CHART.padX}
                          y1={balanceGeometry.zeroY}
                          y2={balanceGeometry.zeroY}
                        />
                      ) : null}
                      {netWorthPoints.length > 1 ? (
                        <polygon
                          className={styles.balanceArea}
                          points={balanceGeometry.areaPoints}
                        />
                      ) : null}
                      <polyline
                        className={styles.balanceLine}
                        points={balanceGeometry.linePoints}
                        vectorEffect="non-scaling-stroke"
                      />
                      {netWorthPoints.map((point, index) => (
                        <circle
                          key={point.key}
                          className={styles.balanceDot}
                          cx={balanceGeometry.cx(index)}
                          cy={balanceGeometry.cy(point.value)}
                          r={4}
                        >
                          <title>{`${point.label}: ${formatMoney(point.value)}`}</title>
                        </circle>
                      ))}
                    </svg>
                    <div className={styles.balanceAxis} aria-hidden="true">
                      {netWorthPoints.map((point, index) => {
                        const show =
                          netWorthPoints.length <= 14 ||
                          index === 0 ||
                          index === netWorthPoints.length - 1 ||
                          (index + 1) % 5 === 0;
                        if (!show) return null;
                        const left =
                          (balanceGeometry.cx(index) / BALANCE_CHART.width) * 100;
                        return (
                          <span
                            key={point.key}
                            style={{
                              left: `${left}%`,
                              transform:
                                index === 0
                                  ? "none"
                                  : index === netWorthPoints.length - 1
                                    ? "translateX(-100%)"
                                    : "translateX(-50%)",
                            }}
                          >
                            {point.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <ul className={styles.srTrendData} id="report-balance-data">
                    {netWorthPoints.map((point) => (
                      <li key={point.key}>
                        {point.label}: {formatMoney(point.value)}
                      </li>
                    ))}
                  </ul>
                  <p className={styles.balanceScale}>
                    Đầu kỳ {formatMoney(netWorth.opening)} · Cuối kỳ{" "}
                    {formatMoney(netWorthLast)} · Thấp nhất{" "}
                    {formatMoney(balanceGeometry.lo)} · Cao nhất{" "}
                    {formatMoney(balanceGeometry.hi)}
                  </p>
                </>
              ) : (
                <div className={styles.subEmpty}>
                  <Icon name="chart" />
                  <p>
                    Chưa có tài khoản VND — tài sản ròng chỉ cộng các tài khoản
                    đồng Việt Nam.
                  </p>
                </div>
              )}

              <h3 className={styles.balanceAccountsTitle}>
                Số dư theo tài khoản · cuối kỳ
              </h3>
              <ul className={styles.balanceAccounts}>
                {balanceSeries.accounts.map((seriesAccount) => {
                  const endValue =
                    seriesAccount.points[seriesAccount.points.length - 1]?.value ??
                    seriesAccount.opening;
                  const delta = endValue - seriesAccount.opening;
                  const meta = [
                    seriesAccount.currencyCode !== "VND"
                      ? `${seriesAccount.currencyCode} · ngoài tài sản ròng`
                      : null,
                    seriesAccount.isArchived ? "Đã lưu trữ" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li className={styles.category} key={seriesAccount.accountId}>
                      <span
                        className={`${styles.categoryIcon} ${styles.balanceIcon}`}
                        aria-hidden="true"
                      >
                        <Icon name="wallet" />
                      </span>
                      <span className={styles.balanceAccountName}>
                        <strong>{seriesAccount.name}</strong>
                        {meta ? <small>{meta}</small> : null}
                      </span>
                      <span className={styles.categoryAmount}>
                        <MoneyValue
                          amount={endValue}
                          currencyCode={seriesAccount.currencyCode}
                          label={`Số dư cuối kỳ của ${seriesAccount.name}`}
                          emphasis="strong"
                        />
                        <small
                          aria-label={`Thay đổi trong kỳ của ${seriesAccount.name}`}
                        >
                          {delta === 0
                            ? "Không đổi"
                            : formatSignedMoney(delta, false, seriesAccount.currencyCode)}
                        </small>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </SecondarySection>
        )}

        {report.totals.transactions ? (
          <div className={styles.grid}>
            <SecondarySection
              title="Nhịp chi tiêu"
              description={
                <p>
                  Mức chi theo từng {trendUnit}; chuyển
                  tiền giữa các tài khoản được loại trừ.
                </p>
              }
              action={
                <div className={styles.chartStat}>
                  <span>TB/{trendUnit} có chi</span>
                  <MoneyValue
                    amount={averageExpense}
                    label={`Trung bình ${trendUnit} có chi`}
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
                  <p>Chưa có khoản thu hoặc chi trong kỳ này.</p>
                </div>
              )}
            </SecondarySection>

            <SecondarySection
              title="Chi theo danh mục"
              description={
                <p>
                  Những nơi tiền của bạn đi nhiều nhất · {periodTitle}. Vệt nhỏ
                  dưới mỗi danh mục là chi theo tháng, 6 tháng gần nhất.
                </p>
              }
              contained
              slot="report-categories"
            >
              {report.categories.length ? (
                <div className={styles.categories}>
                  {report.categories.map((item) => {
                    const meta =
                      categoryMeta[item.name] ?? categoryMeta["Thu nhập khác"];
                    const href = reportCategoryDrilldownHref(report.range, item.name);
                    const categoryTrendMax = Math.max(
                      1,
                      ...item.trend.map((month) => month.amount),
                    );
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
                          <span
                            className={styles.categoryTrend}
                            role="img"
                            aria-label={`${item.name} 6 tháng gần nhất: ${item.trend
                              .map((month) => `${month.label} ${formatMoney(month.amount)}`)
                              .join(", ")}`}
                          >
                            {item.trend.map((month) => (
                              <i
                                key={month.key}
                                className={month.amount ? undefined : styles.trendEmpty}
                                title={`${month.label}: ${formatMoney(month.amount)}`}
                                style={{
                                  height: month.amount
                                    ? `${Math.max(15, (month.amount / categoryTrendMax) * 100)}%`
                                    : undefined,
                                }}
                              />
                            ))}
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
            title={
              workspace.dataError
                ? "Không tải được báo cáo"
                : "Chưa có dữ liệu trong kỳ"
            }
            description={
              workspace.dataError
                ? "Dữ liệu của bạn vẫn được bảo vệ. Thử tải lại trang hoặc quay lại Tổng quan."
                : "Thêm giao dịch hoặc chọn kỳ dài hơn để MoneyFlow tạo báo cáo."
            }
            primaryAction={
              workspace.dataError ? (
                <LinkButton href="/dashboard" intent="secondary" targetSize="important">
                  Về Tổng quan
                </LinkButton>
              ) : (
                <LinkButton href="/transactions" intent="primary" targetSize="important">
                  <Icon name="plus" />
                  Thêm giao dịch
                </LinkButton>
              )
            }
            secondaryAction={
              !workspace.dataError && period !== "year" ? (
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
