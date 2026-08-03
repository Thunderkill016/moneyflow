"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  completeAccountReconciliationAction,
  reopenAccountReconciliationAction,
  setAccountEntryReconciliationStateAction,
  startAccountReconciliationAction,
  type ReconciliationActionResult,
} from "@/app/actions/reconciliation";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import type { ViewerSummary } from "@/components/user-chip";
import type { AccountRegisterEntry } from "@/lib/account-register";
import { accountKindLabels, type AccountSummary } from "@/lib/accounts";
import {
  readDemoReconciliationState,
  writeDemoReconciliationState,
} from "@/lib/demo-reconciliation-store";
import {
  canReopenSession,
  completeDemoAccountReconciliation,
  entryStateLabel,
  isEntryEligibleForSession,
  mergeAccountReconciliationWorkspace,
  refreshDemoAccountReconciliationState,
  reopenDemoAccountReconciliation,
  setDemoAccountEntryReconciliationState,
  startDemoAccountReconciliation,
  type AccountReconciliationEntry,
  type AccountReconciliationSession,
  type AccountReconciliationStateData,
  type EntryReconciliationState,
} from "@/lib/reconciliation";
import { formatMoney, formatMoneyInput } from "@/lib/money";
import styles from "./account-reconciliation-page.module.css";

function formatSignedMoneyInput(value: string) {
  const negative = value.trimStart().startsWith("-");
  const formatted = formatMoneyInput(value);
  return negative && formatted ? `-${formatted}` : formatted;
}

function parseSignedMoneyInput(value: string) {
  const negative = value.trimStart().startsWith("-");
  const digits = value.replace(/\D/g, "");
  const amount = digits ? Number(digits) : 0;
  const signed = negative ? -amount : amount;
  return Number.isSafeInteger(signed) ? signed : Number.NaN;
}

function displayDate(date: string) {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

function entryDescription(entry: AccountReconciliationEntry) {
  const { transaction } = entry;
  if (transaction.kind === "transfer") {
    const counterparty = entry.transferCounterparty ?? "tài khoản khác";
    return entry.direction === "in"
      ? `Nhận từ ${counterparty} · chân tiền vào độc lập`
      : `Chuyển đến ${counterparty} · chân tiền ra độc lập`;
  }
  if (entry.entryCount > 1) {
    return `${transaction.category} · ${entry.entryCount} dòng chia danh mục, cập nhật cùng nhau`;
  }
  return transaction.category;
}

function stateClass(state: EntryReconciliationState) {
  if (state === "cleared") return styles.stateCleared;
  if (state === "reconciled") return styles.stateReconciled;
  return styles.statePending;
}

function sessionTitle(session: AccountReconciliationSession) {
  return session.status === "open"
    ? `Kỳ sao kê ${displayDate(session.statementDate)} đang mở`
    : `Kỳ sao kê ${displayDate(session.statementDate)}`;
}

export function AccountReconciliationPage({
  viewer,
  account,
  registerEntries,
  initialState,
  today,
  dataError,
}: {
  viewer: ViewerSummary;
  account: AccountSummary | null;
  registerEntries: AccountRegisterEntry[];
  initialState: AccountReconciliationStateData;
  today: string;
  dataError: string | null;
}) {
  const router = useRouter();
  const [stateData, setStateData] = useState(initialState);
  const [statementDate, setStatementDate] = useState(today);
  const [statementBalanceInput, setStatementBalanceInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!viewer.isDemo || !account) return;
    const frame = window.requestAnimationFrame(() => {
      const stored = readDemoReconciliationState(account.id);
      const hydrated = refreshDemoAccountReconciliationState({
        stateData: stored,
        registerEntries,
        accountId: account.id,
        initialBalance: account.initialBalance,
      });
      setStateData(hydrated);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [account, registerEntries, viewer.isDemo]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const workspace = useMemo(
    () => mergeAccountReconciliationWorkspace(registerEntries, stateData),
    [registerEntries, stateData],
  );
  const openSession = workspace.openSession;
  const eligibleEntries = openSession
    ? workspace.entries.filter((entry) =>
        isEntryEligibleForSession(entry, openSession.statementDate),
      )
    : [];
  const laterEntryCount = openSession
    ? workspace.entries.length - eligibleEntries.length
    : 0;
  const canStart = Boolean(
    account &&
      stateData.featureAvailable &&
      !stateData.dataError &&
      !dataError &&
      !account.isArchived &&
      account.currencyCode === "VND" &&
      !openSession &&
      !busy,
  );
  const canComplete = Boolean(
    openSession && openSession.difference === 0 && !busy,
  );

  function applyResult(result: ReconciliationActionResult, successMessage: string) {
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setStateData(result.stateData);
    setError("");
    setNotice(successMessage);
    router.refresh();
    return true;
  }

  function persistDemo(next: AccountReconciliationStateData) {
    if (!account) return;
    setStateData(next);
    writeDemoReconciliationState(account.id, next);
  }

  async function startSession() {
    if (!account || !canStart) return;
    const amount = parseSignedMoneyInput(statementBalanceInput);
    if (!Number.isSafeInteger(amount)) {
      setError("Số dư sao kê chưa hợp lệ.");
      return;
    }
    if (!statementDate || statementDate > today) {
      setError("Ngày sao kê chưa hợp lệ.");
      return;
    }

    setBusy("start");
    setError("");
    try {
      if (viewer.isDemo) {
        const result = startDemoAccountReconciliation({
          stateData,
          registerEntries,
          accountId: account.id,
          initialBalance: account.initialBalance,
          statementDate,
          statementBalance: amount,
          today,
          now: new Date().toISOString(),
          reconciliationId: crypto.randomUUID(),
        });
        if (!result.ok) setError(result.message);
        else {
          persistDemo(result.stateData);
          setNotice("Đã mở kỳ đối soát demo.");
        }
      } else {
        applyResult(
          await startAccountReconciliationAction({
            accountId: account.id,
            statementDate,
            statementBalance: amount,
          }),
          "Đã mở kỳ đối soát.",
        );
      }
    } catch {
      setError("Mất kết nối khi mở kỳ đối soát.");
    } finally {
      setBusy(null);
    }
  }

  async function changeEntryState(
    entry: AccountReconciliationEntry,
    state: "pending" | "cleared",
  ) {
    if (!account || !openSession || busy || entry.state === "reconciled") return;
    setBusy(entry.entryId);
    setError("");
    try {
      if (viewer.isDemo) {
        const result = setDemoAccountEntryReconciliationState({
          stateData,
          registerEntries,
          accountId: account.id,
          initialBalance: account.initialBalance,
          entryId: entry.entryId,
          state,
          now: new Date().toISOString(),
        });
        if (!result.ok) setError(result.message);
        else {
          persistDemo(result.stateData);
          setNotice(
            state === "cleared"
              ? "Đã đánh dấu giao dịch khớp sao kê."
              : "Đã đưa giao dịch về chờ đối chiếu.",
          );
        }
      } else {
        applyResult(
          await setAccountEntryReconciliationStateAction({
            accountId: account.id,
            entryId: entry.entryId,
            state,
          }),
          state === "cleared"
            ? "Đã đánh dấu giao dịch khớp sao kê."
            : "Đã đưa giao dịch về chờ đối chiếu.",
        );
      }
    } catch {
      setError("Mất kết nối khi cập nhật giao dịch.");
    } finally {
      setBusy(null);
    }
  }

  async function completeSession() {
    if (!account || !openSession || !canComplete) return;
    setBusy("complete");
    setError("");
    try {
      if (viewer.isDemo) {
        const result = completeDemoAccountReconciliation({
          stateData,
          registerEntries,
          accountId: account.id,
          initialBalance: account.initialBalance,
          reconciliationId: openSession.id,
          now: new Date().toISOString(),
        });
        if (!result.ok) setError(result.message);
        else {
          persistDemo(result.stateData);
          setNotice("Đã hoàn tất kỳ đối soát demo.");
        }
      } else {
        applyResult(
          await completeAccountReconciliationAction({
            accountId: account.id,
            reconciliationId: openSession.id,
          }),
          "Đã hoàn tất kỳ đối soát.",
        );
      }
    } catch {
      setError("Mất kết nối khi hoàn tất đối soát.");
    } finally {
      setBusy(null);
    }
  }

  async function reopenSession(session: AccountReconciliationSession) {
    if (!account || busy || !canReopenSession(session, workspace.sessions)) return;
    setBusy(`reopen:${session.id}`);
    setError("");
    try {
      if (viewer.isDemo) {
        const result = reopenDemoAccountReconciliation({
          stateData,
          registerEntries,
          accountId: account.id,
          initialBalance: account.initialBalance,
          reconciliationId: session.id,
          now: new Date().toISOString(),
        });
        if (!result.ok) setError(result.message);
        else {
          persistDemo(result.stateData);
          setNotice("Đã mở lại kỳ đối soát demo gần nhất.");
        }
      } else {
        applyResult(
          await reopenAccountReconciliationAction({
            accountId: account.id,
            reconciliationId: session.id,
          }),
          "Đã mở lại kỳ đối soát gần nhất.",
        );
      }
    } catch {
      setError("Mất kết nối khi mở lại kỳ đối soát.");
    } finally {
      setBusy(null);
    }
  }

  function handleStartSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void startSession();
  }

  const primaryAction = openSession
    ? {
        label: busy === "complete" ? "Đang hoàn tất..." : "Hoàn tất đối soát",
        onClick: () => void completeSession(),
        icon: "check" as const,
        disabled: !canComplete,
      }
    : {
        label: busy === "start" ? "Đang mở kỳ..." : "Bắt đầu đối soát",
        onClick: () => void startSession(),
        icon: "check" as const,
        disabled: !canStart,
      };

  return (
    <AppShell
      viewer={viewer}
      primaryAction={primaryAction}
      fabAction={primaryAction}
      notice={notice}
    >
      <main className={styles.workspace}>
        <nav className={styles.breadcrumb} aria-label="Điều hướng đối soát">
          <Link href={account ? `/accounts/${account.id}` : "/accounts"}>
            <Icon name="arrowRight" className={styles.backIcon} />
            Quay lại sổ tài khoản
          </Link>
        </nav>

        {dataError ? (
          <div className="data-alert" role="alert">
            <Icon name="bell" />
            <span>{dataError}</span>
          </div>
        ) : null}
        {stateData.dataError ? (
          <div className="data-alert" role="alert">
            <Icon name="bell" />
            <span>{stateData.dataError}</span>
          </div>
        ) : null}
        {error ? (
          <div className={styles.errorNotice} role="alert">
            <Icon name="bell" />
            <span>{error}</span>
          </div>
        ) : null}

        {!account ? (
          <section className={styles.emptyPanel}>
            <p className="eyebrow">Đối soát tài khoản</p>
            <h1>Chưa tải được tài khoản</h1>
            <p>Hãy quay lại danh sách tài khoản và thử lại.</p>
          </section>
        ) : (
          <>
            <section className={styles.heading}>
              <div>
                <p className="eyebrow">Độ tin cậy sổ tài chính</p>
                <h1>Đối soát {account.name}</h1>
                <p>
                  So sánh từng biến động MoneyFlow với sao kê thực tế. Đối soát
                  không thay đổi số dư hoặc tự tạo khoản chênh lệch.
                </p>
              </div>
              <div className={styles.accountMeta}>
                <span>{accountKindLabels[account.kind]}</span>
                <strong>{account.currencyCode}</strong>
                {account.isArchived ? <em>Đã lưu trữ</em> : null}
              </div>
            </section>

            {!stateData.featureAvailable ? (
              <section className={styles.emptyPanel} aria-labelledby="reconciliation-unavailable-title">
                <span className={styles.panelIcon}><Icon name="lock" /></span>
                <p className="eyebrow">Chưa khả dụng</p>
                <h2 id="reconciliation-unavailable-title">Đối soát chưa được bật trên máy chủ</h2>
                <p>
                  Sổ tài khoản vẫn hoạt động bình thường. Tính năng này chỉ xuất
                  hiện sau khi hợp đồng cơ sở dữ liệu được triển khai riêng.
                </p>
              </section>
            ) : (
              <>
                {!openSession ? (
                  <section className={styles.startPanel} aria-labelledby="start-reconciliation-title">
                    <div className={styles.panelHeading}>
                      <div>
                        <p className="eyebrow">Kỳ sao kê mới</p>
                        <h2 id="start-reconciliation-title">Nhập hai số liệu từ sao kê</h2>
                        <p>
                          Dùng ngày kết thúc kỳ và số dư cuối kỳ. MoneyFlow sẽ tính
                          phần chênh lệch từ các giao dịch được đánh dấu khớp.
                        </p>
                      </div>
                      <span className={styles.panelIcon}><Icon name="calendar" /></span>
                    </div>

                    {account.currencyCode !== "VND" ? (
                      <p className={styles.boundaryNote} role="status">
                        Tài khoản ngoại tệ hiện chỉ theo dõi. Lát cắt đầu tiên chưa
                        mở đối soát để tránh làm tròn sai đơn vị tiền.
                      </p>
                    ) : account.isArchived ? (
                      <p className={styles.boundaryNote} role="status">
                        Khôi phục tài khoản trước khi bắt đầu một kỳ đối soát mới.
                      </p>
                    ) : (
                      <form className={styles.startForm} onSubmit={handleStartSubmit}>
                        <label>
                          <span>Ngày kết thúc sao kê</span>
                          <input
                            type="date"
                            value={statementDate}
                            max={today}
                            onChange={(event) => {
                              setStatementDate(event.target.value);
                              setError("");
                            }}
                            required
                          />
                        </label>
                        <label>
                          <span>Số dư cuối kỳ</span>
                          <div className={styles.moneyInput}>
                            <input
                              value={statementBalanceInput}
                              inputMode="numeric"
                              placeholder="0"
                              aria-label="Số dư cuối kỳ"
                              onChange={(event) => {
                                setStatementBalanceInput(
                                  formatSignedMoneyInput(event.target.value),
                                );
                                setError("");
                              }}
                            />
                            <strong>₫</strong>
                          </div>
                        </label>
                        <button
                          type="submit"
                          className="secondary-button"
                          disabled={!canStart}
                        >
                          <Icon name="check" />
                          {busy === "start" ? "Đang mở kỳ..." : "Mở kỳ đối soát"}
                        </button>
                      </form>
                    )}
                  </section>
                ) : (
                  <>
                    <section className={styles.activePanel} aria-labelledby="active-reconciliation-title">
                      <div className={styles.panelHeading}>
                        <div>
                          <p className="eyebrow">Đang đối soát</p>
                          <h2 id="active-reconciliation-title">
                            {sessionTitle(openSession)}
                          </h2>
                          <p>
                            Chọn các giao dịch có trên sao kê. Chỉ giao dịch đến
                            ngày kết thúc kỳ mới được tính.
                          </p>
                        </div>
                        <span className={styles.openBadge}>Đang mở</span>
                      </div>

                      <div className={styles.summaryGrid} aria-label="Tóm tắt kỳ đối soát">
                        <article>
                          <span>Số dư sao kê</span>
                          <MoneyValue
                            amount={openSession.statementBalance}
                            mode="plain"
                            currencyCode={account.currencyCode}
                            emphasis="strong"
                            align="start"
                          />
                        </article>
                        <article>
                          <span>Số dư đã khớp</span>
                          <MoneyValue
                            amount={openSession.clearedBalance}
                            mode="plain"
                            currencyCode={account.currencyCode}
                            emphasis="strong"
                            align="start"
                          />
                        </article>
                        <article className={openSession.difference === 0 ? styles.zeroCard : styles.differenceCard}>
                          <span>Chênh lệch</span>
                          <MoneyValue
                            amount={openSession.difference}
                            mode="signed"
                            currencyCode={account.currencyCode}
                            emphasis="strong"
                            align="start"
                            label="Chênh lệch đối soát"
                          />
                          <small>
                            {openSession.difference === 0
                              ? "Đã khớp chính xác. Có thể hoàn tất."
                              : "Tiếp tục đối chiếu giao dịch, không tự bù chênh lệch."}
                          </small>
                        </article>
                        <article>
                          <span>Trạng thái giao dịch</span>
                          <strong className={styles.countLine}>
                            {openSession.clearedAccountLegCount} khớp ·{" "}
                            {openSession.pendingAccountLegCount} chờ ·{" "}
                            {openSession.reconciledAccountLegCount} đã khóa
                          </strong>
                        </article>
                      </div>
                    </section>

                    <section className={styles.entryPanel} aria-labelledby="reconciliation-entry-title">
                      <div className={styles.entryHeading}>
                        <div>
                          <p className="eyebrow">Giao dịch trong kỳ</p>
                          <h2 id="reconciliation-entry-title">Đánh dấu giao dịch đã xuất hiện trên sao kê</h2>
                        </div>
                        <span>{eligibleEntries.length} giao dịch</span>
                      </div>
                      {laterEntryCount > 0 ? (
                        <p className={styles.futureNote} role="status">
                          {laterEntryCount} giao dịch sau ngày sao kê không được tính trong kỳ này.
                        </p>
                      ) : null}
                      {eligibleEntries.length ? (
                        <div className={styles.entryList}>
                          {eligibleEntries.map((entry) => {
                            const locked = entry.state === "reconciled";
                            const nextState = entry.state === "cleared" ? "pending" : "cleared";
                            return (
                              <article className={styles.entryRow} key={entry.entryId}>
                                <span className={styles.entryIcon}>
                                  <Icon name={entry.transaction.kind === "transfer" ? "arrows" : "receipt"} />
                                </span>
                                <div className={styles.entryDetail}>
                                  <strong>{entry.transaction.note}</strong>
                                  <small>{entryDescription(entry)}</small>
                                  <time dateTime={entry.transaction.occurredAt}>
                                    {displayDate(entry.transaction.occurredOn)}
                                  </time>
                                </div>
                                <MoneyValue
                                  amount={entry.impact}
                                  mode="signed"
                                  currencyCode={account.currencyCode}
                                  emphasis="strong"
                                  className={styles.entryAmount}
                                  label={`${entry.transaction.note}, tác động tài khoản`}
                                />
                                <span className={`${styles.stateBadge} ${stateClass(entry.state)}`}>
                                  {entryStateLabel(entry.state)}
                                </span>
                                <button
                                  type="button"
                                  className={styles.stateButton}
                                  disabled={locked || Boolean(busy)}
                                  onClick={() => void changeEntryState(entry, nextState)}
                                  aria-label={
                                    locked
                                      ? `${entry.transaction.note} đã đối soát`
                                      : nextState === "cleared"
                                        ? `Đánh dấu đã khớp ${entry.transaction.note}`
                                        : `Bỏ đánh dấu đã khớp ${entry.transaction.note}`
                                  }
                                >
                                  <Icon name={locked ? "lock" : nextState === "cleared" ? "check" : "restore"} />
                                  {busy === entry.entryId
                                    ? "Đang lưu..."
                                    : locked
                                      ? "Đã khóa"
                                      : nextState === "cleared"
                                        ? "Đánh dấu đã khớp"
                                        : "Bỏ đánh dấu"}
                                </button>
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={styles.inlineEmpty}>
                          <Icon name="receipt" />
                          <p>Chưa có giao dịch nào đến ngày sao kê.</p>
                        </div>
                      )}
                    </section>
                  </>
                )}

                <section className={styles.historyPanel} aria-labelledby="reconciliation-history-title">
                  <div className={styles.entryHeading}>
                    <div>
                      <p className="eyebrow">Lịch sử sao kê</p>
                      <h2 id="reconciliation-history-title">Các kỳ đã hoàn tất</h2>
                    </div>
                    <span>{workspace.completedSessions.length} kỳ</span>
                  </div>
                  {workspace.completedSessions.length ? (
                    <div className={styles.historyList}>
                      {workspace.completedSessions.map((session) => {
                        const canReopen = canReopenSession(session, workspace.sessions);
                        return (
                          <article className={styles.historyRow} key={session.id}>
                            <div>
                              <strong>{sessionTitle(session)}</strong>
                              <small>
                                Hoàn tất {session.completedAt ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(session.completedAt)) : ""}
                              </small>
                            </div>
                            <dl>
                              <div><dt>Sao kê</dt><dd>{formatMoney(session.statementBalance, false, account.currencyCode)}</dd></div>
                              <div><dt>Đã khớp</dt><dd>{formatMoney(session.clearedBalance, false, account.currencyCode)}</dd></div>
                              <div><dt>Chênh lệch</dt><dd>{formatMoney(session.difference, false, account.currencyCode)}</dd></div>
                            </dl>
                            <button
                              type="button"
                              className="secondary-button"
                              disabled={!canReopen || Boolean(busy)}
                              onClick={() => void reopenSession(session)}
                            >
                              <Icon name="restore" />
                              {busy === `reopen:${session.id}` ? "Đang mở lại..." : "Mở lại kỳ gần nhất"}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.inlineEmpty}>
                      <Icon name="calendar" />
                      <p>Chưa có kỳ đối soát nào hoàn tất.</p>
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}
