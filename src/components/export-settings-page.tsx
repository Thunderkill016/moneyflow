"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import {
  buildExportContent,
  downloadTextFile,
  EXPORT_KIND_OPTIONS,
  exportFilename,
  type ExportDataKind,
  type ExportFormat,
} from "@/lib/export-data";
import {
  countPending,
  readStoredCandidates,
  type InboxCandidate,
} from "@/lib/inbox/candidate-store";
import { recordPrivacyExport } from "@/lib/privacy-prefs";
import type { Transaction } from "@/lib/sample-data";
import { readStoredTransactions } from "@/lib/transaction-store";

type ExportWorkspace = {
  transactions: Transaction[];
  today: string;
  dataError: string | null;
};

/**
 * Export data (wireframes-inbox §19).
 * Client-side CSV/JSON for approved txns and/or inbox candidates.
 */
export function ExportSettingsPage({
  viewer,
  workspace,
}: {
  viewer: ViewerSummary;
  workspace: ExportWorkspace;
}) {
  const formId = useId();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ledgerWarning, setLedgerWarning] = useState<string | null>(
    workspace.dataError,
  );
  const [inboxCount, setInboxCount] = useState(0);
  const [candidates, setCandidates] = useState<InboxCandidate[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>(
    workspace.transactions,
  );
  const [kind, setKind] = useState<ExportDataKind>("transactions");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");

  function reload() {
    try {
      setError(null);
      setLedgerWarning(workspace.dataError);
      const storedCandidates = readStoredCandidates();
      setCandidates(storedCandidates);
      setInboxCount(countPending(storedCandidates));
      if (viewer.isDemo) {
        setTransactions(readStoredTransactions());
      } else {
        setTransactions(workspace.transactions);
      }
    } catch {
      setError("Không đọc được dữ liệu xuất từ trình duyệt. Thử tải lại trang.");
    }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      reload();
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only hydrate
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const effectiveFormat: ExportFormat = kind === "all" ? "json" : format;

  const preview = useMemo(() => {
    try {
      return buildExportContent({
        kind,
        format: effectiveFormat,
        transactions,
        candidates,
        range: { from, to },
      });
    } catch {
      return null;
    }
  }, [kind, effectiveFormat, transactions, candidates, from, to]);

  const isEmpty = preview !== null && preview.count === 0;
  const canDownload = ready && !error && !exporting && preview !== null && preview.count > 0;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canDownload || !preview) return;
    setExporting(true);
    try {
      const filename = exportFilename(kind, preview.extension, { from, to });
      downloadTextFile(filename, preview.body, preview.mime);
      recordPrivacyExport();
      setNotice(
        `Đã tải ${preview.count} mục (${preview.extension.toUpperCase()}).`,
      );
    } catch {
      setError("Không tạo được file tải xuống. Thử lại.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
      notice={notice}
      primaryAction={{
        label: exporting ? "Đang xuất…" : "Tải xuống",
        onClick: () => {
          const form = document.getElementById(formId) as HTMLFormElement | null;
          form?.requestSubmit();
        },
        disabled: !canDownload,
        icon: "arrowDown",
      }}
    >
      <main className="dashboard privacy-workspace export-workspace">
        <section className="transactions-title-row">
          <div>
            <p className="eyebrow">Cài đặt</p>
            <h1>Xuất dữ liệu</h1>
            <p>
              <strong>Dữ liệu của bạn thuộc về bạn.</strong> Tải sổ thu chi
              (CSV/JSON) bất cứ lúc nào. File được tạo trên thiết bị của bạn —
              không gửi lên máy chủ chỉ để xuất.
            </p>
            <ul className="settings-trust-bar" aria-label="Cam kết tin cậy">
              <li>
                <Icon name="arrowDown" size={14} />
                <span>Xuất CSV bất cứ lúc nào</span>
              </li>
              <li>
                <Icon name="lock" size={14} />
                <span>File trên thiết bị</span>
              </li>
            </ul>
          </div>
          <div className="page-heading-actions">
            <Link className="secondary-button" href="/settings">
              <Icon name="settings" />
              Cài đặt
            </Link>
            <Link className="secondary-button" href="/settings/privacy">
              <Icon name="lock" />
              Quyền riêng tư
            </Link>
          </div>
        </section>

        {!ready && (
          <section
            className="panel privacy-loading"
            aria-busy="true"
            aria-label="Đang tải trang xuất dữ liệu"
          >
            <div className="loading-line wide" />
            <div className="loading-line" />
            <div className="loading-line" />
          </section>
        )}

        {ready && error && (
          <section className="panel privacy-error" role="alert">
            <p>{error}</p>
            <button type="button" className="secondary-button" onClick={reload}>
              Thử lại
            </button>
          </section>
        )}

        {ready && !error && ledgerWarning && (
          <section className="panel export-warning" role="status">
            <p>
              {ledgerWarning} Bạn vẫn có thể xuất ứng viên Inbox trên thiết bị
              này.
            </p>
          </section>
        )}

        {ready && !error && (
          <form
            id={formId}
            className="privacy-form export-form"
            onSubmit={onSubmit}
            noValidate
          >
            <section
              className="panel privacy-panel"
              aria-labelledby={`${formId}-kind-heading`}
            >
              <h2 id={`${formId}-kind-heading`}>Loại dữ liệu</h2>
              <fieldset className="privacy-fieldset">
                <legend className="sr-only">Loại dữ liệu xuất</legend>
                <div
                  className="privacy-radio-list"
                  role="radiogroup"
                  aria-label="Loại dữ liệu"
                >
                  {EXPORT_KIND_OPTIONS.map((option) => {
                    const inputId = `${formId}-kind-${option.value}`;
                    const selected = kind === option.value;
                    return (
                      <label
                        key={option.value}
                        htmlFor={inputId}
                        className={`privacy-radio-card${selected ? " is-selected" : ""}`}
                      >
                        <input
                          id={inputId}
                          type="radio"
                          name="exportKind"
                          value={option.value}
                          checked={selected}
                          onChange={() => {
                            setKind(option.value);
                            if (option.value === "all") setFormat("json");
                          }}
                          disabled={exporting}
                        />
                        <span className="privacy-radio-body">
                          <span className="privacy-radio-label">
                            {option.label}
                          </span>
                          <span className="privacy-radio-desc">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </section>

            <section
              className="panel privacy-panel"
              aria-labelledby={`${formId}-range-heading`}
            >
              <h2 id={`${formId}-range-heading`}>Khoảng ngày</h2>
              <p className="privacy-panel-lead">
                Lọc theo ngày giao dịch / ứng viên (YYYY-MM-DD). Để trống để xuất
                toàn bộ.
              </p>
              <div className="export-date-row">
                <label className="export-date-field" htmlFor={`${formId}-from`}>
                  <span>Từ</span>
                  <input
                    id={`${formId}-from`}
                    type="date"
                    value={from}
                    max={to || workspace.today || undefined}
                    onChange={(e) => setFrom(e.target.value)}
                    disabled={exporting}
                  />
                </label>
                <label className="export-date-field" htmlFor={`${formId}-to`}>
                  <span>Đến</span>
                  <input
                    id={`${formId}-to`}
                    type="date"
                    value={to}
                    min={from || undefined}
                    max={workspace.today || undefined}
                    onChange={(e) => setTo(e.target.value)}
                    disabled={exporting}
                  />
                </label>
              </div>
            </section>

            <section
              className="panel privacy-panel"
              aria-labelledby={`${formId}-format-heading`}
            >
              <h2 id={`${formId}-format-heading`}>Định dạng</h2>
              {kind === "all" ? (
                <p className="privacy-panel-lead">
                  Toàn bộ luôn xuất dạng <strong>JSON</strong> (gộp sổ + inbox).
                </p>
              ) : (
                <fieldset className="privacy-fieldset">
                  <legend className="sr-only">Định dạng file</legend>
                  <div
                    className="export-format-row"
                    role="radiogroup"
                    aria-label="Định dạng file"
                  >
                    {(
                      [
                        { value: "csv" as const, label: "CSV" },
                        { value: "json" as const, label: "JSON" },
                      ] as const
                    ).map((option) => {
                      const inputId = `${formId}-fmt-${option.value}`;
                      const selected = format === option.value;
                      return (
                        <label
                          key={option.value}
                          htmlFor={inputId}
                          className={`export-format-chip${selected ? " is-selected" : ""}`}
                        >
                          <input
                            id={inputId}
                            type="radio"
                            name="exportFormat"
                            value={option.value}
                            checked={selected}
                            onChange={() => setFormat(option.value)}
                            disabled={exporting}
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            </section>

            <section
              className="panel privacy-panel export-summary"
              aria-live="polite"
            >
              <h2 className="sr-only">Tóm tắt xuất</h2>
              {isEmpty ? (
                <div className="export-empty">
                  <p>
                    Không có mục nào khớp bộ lọc hiện tại. Thử nới khoảng ngày
                    hoặc đổi loại dữ liệu — hoặc ghi thêm giao dịch rồi xuất.
                  </p>
                  <div className="export-empty-actions">
                    <Link className="primary-button" href="/transactions">
                      Xem giao dịch
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="export-summary-text">
                  Sẵn sàng xuất{" "}
                  <strong className="font-mono">{preview?.count ?? 0}</strong>{" "}
                  mục ·{" "}
                  <strong>{effectiveFormat.toUpperCase()}</strong>
                  {from || to
                    ? ` · ${from || "…"} → ${to || "…"}`
                    : " · toàn bộ thời gian"}
                </p>
              )}
            </section>

            <div className="privacy-form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={!canDownload}
              >
                {exporting ? "Đang xuất…" : "Tải xuống"}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={exporting}
                onClick={() => {
                  setFrom("");
                  setTo("");
                  setKind("transactions");
                  setFormat("csv");
                }}
              >
                Đặt lại
              </button>
            </div>
          </form>
        )}
      </main>
    </AppShell>
  );
}
