"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import {
  SecondaryHeader,
  SecondarySection,
  SecondaryWorkspace,
} from "@/components/secondary/secondary-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import type { ViewerSummary } from "@/components/user-chip";
import {
  buildExportContent,
  downloadTextFile,
  EXPORT_KIND_OPTIONS,
  exportFilename,
  resolveExportCandidates,
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
import styles from "./settings/settings-surfaces.module.css";

type ExportWorkspace = {
  transactions: Transaction[];
  today: string;
  dataError: string | null;
};

/** Canonical Inbox for an authenticated viewer; `null` in demo mode. */
type ServerInbox = {
  candidates: InboxCandidate[];
  error: string | null;
};

export function ExportSettingsPage({
  viewer,
  workspace,
  serverInbox = null,
}: {
  viewer: ViewerSummary;
  workspace: ExportWorkspace;
  serverInbox?: ServerInbox | null;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ledgerWarning, setLedgerWarning] = useState<string | null>(workspace.dataError);
  const [inboxCount, setInboxCount] = useState(
    viewer.isDemo ? 0 : countPending(serverInbox?.candidates ?? []),
  );
  const [candidates, setCandidates] = useState<InboxCandidate[]>(
    resolveExportCandidates({
      isDemo: viewer.isDemo,
      localCandidates: [],
      serverCandidates: serverInbox?.candidates ?? null,
    }),
  );
  const [transactions, setTransactions] = useState<Transaction[]>(workspace.transactions);
  const [kind, setKind] = useState<ExportDataKind>("transactions");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");

  /**
   * Build the whole warning sentence here rather than appending a fixed tail in
   * the markup. Only demo can fall back to device candidates; telling an
   * authenticated user their Inbox is still exportable from this device would
   * repeat the promise this page was fixed to stop making.
   */
  function exportWarning(): string | null {
    const parts: string[] = [];
    if (workspace.dataError) {
      parts.push(
        viewer.isDemo
          ? `${workspace.dataError} Bạn vẫn có thể xuất ứng viên Inbox lưu trên thiết bị này.`
          : workspace.dataError,
      );
    }
    if (!viewer.isDemo && serverInbox?.error) {
      parts.push(
        `${serverInbox.error} Bản tải xuống này chưa gồm Inbox — đừng dùng nó làm bản sao lưu trước khi xóa tài khoản.`,
      );
    }
    return parts.length > 0 ? parts.join(" ") : null;
  }

  function reload() {
    try {
      setError(null);
      setLedgerWarning(exportWarning());
      /* Demo keeps its ledger and Inbox on the device; an authenticated
         workspace owns both on the server. Reading local candidates while
         signed in exports an empty Inbox — see the delete-account copy that
         tells people this download covers transactions and Inbox. */
      const exportCandidates = resolveExportCandidates({
        isDemo: viewer.isDemo,
        localCandidates: viewer.isDemo ? readStoredCandidates() : [],
        serverCandidates: serverInbox?.candidates ?? null,
      });
      setCandidates(exportCandidates);
      setInboxCount(countPending(exportCandidates));
      setTransactions(viewer.isDemo ? readStoredTransactions() : workspace.transactions);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per route load
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
  const canDownload =
    ready && !error && !exporting && preview !== null && preview.count > 0;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canDownload || !preview) return;
    setExporting(true);
    try {
      const filename = exportFilename(kind, preview.extension, { from, to });
      downloadTextFile(filename, preview.body, preview.mime);
      recordPrivacyExport();
      setNotice(`Đã tải ${preview.count} mục (${preview.extension.toUpperCase()}).`);
    } catch {
      setError("Không tạo được file tải xuống. Thử lại.");
    } finally {
      setExporting(false);
    }
  }

  function resetForm() {
    setFrom("");
    setTo("");
    setKind("transactions");
    setFormat("csv");
  }

  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
      notice={notice}
      primaryAction={{
        label: exporting ? "Đang xuất…" : "Tải xuống",
        onClick: () =>
          (document.getElementById("export-data-form") as HTMLFormElement | null)?.requestSubmit(),
        disabled: !canDownload,
        icon: "arrowDown",
      }}
    >
      <SecondaryWorkspace slot="settings-export-workspace">
        <SecondaryHeader
          section="Cài đặt · Quyền dữ liệu"
          title="Xuất giao dịch và Inbox"
          description={
            <>
              <p>
                File được tạo trên thiết bị từ giao dịch và ứng viên Inbox mà
                MoneyFlow hiện hỗ trợ xuất. Không có file nào được gửi lên máy chủ
                chỉ để tạo bản tải xuống.
              </p>
              <ul className={styles.trustBar} aria-label="Phạm vi xuất">
                <li>
                  <Icon name="arrowDown" />
                  CSV hoặc JSON
                </li>
                <li>
                  <Icon name="lock" />
                  Tạo file trên thiết bị
                </li>
              </ul>
            </>
          }
          actions={
            <>
              <LinkButton href="/settings" intent="secondary" targetSize="important">
                Cài đặt
              </LinkButton>
              <LinkButton
                href="/settings/privacy"
                intent="secondary"
                targetSize="important"
              >
                Quyền riêng tư
              </LinkButton>
            </>
          }
        />

        <Alert tone="warning" live="polite">
          <AlertDescription>
            Đây là <strong>export giao dịch/Inbox</strong>, chưa phải bản sao lưu
            đầy đủ có thể khôi phục tài khoản. Accounts, categories, budgets, goals,
            templates, rules và settings chưa được đóng gói thành archive restore.
          </AlertDescription>
        </Alert>

        {!ready ? (
          <section className={styles.loading} aria-busy="true" aria-label="Đang tải trang xuất">
            <span />
            <span />
            <span />
          </section>
        ) : null}

        {ready && error ? (
          <Alert tone="error" live="assertive">
            <AlertDescription className={styles.alertAction}>
              <span>{error}</span>
              <Button type="button" intent="secondary" targetSize="important" onClick={reload}>
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {ready && !error && ledgerWarning ? (
          <Alert tone="warning" live="polite">
            <AlertDescription>
              {ledgerWarning}
            </AlertDescription>
          </Alert>
        ) : null}

        {ready && !error ? (
          <form id="export-data-form" className={styles.form} onSubmit={onSubmit} noValidate>
            <SecondarySection
              title="Loại dữ liệu"
              description={<p>Chọn đúng tập bản ghi cần tải.</p>}
              contained
              slot="settings-section"
            >
              <fieldset>
                <legend className="sr-only">Loại dữ liệu xuất</legend>
                <div className={styles.radioList}>
                  {EXPORT_KIND_OPTIONS.map((option) => {
                    const selected = kind === option.value;
                    return (
                      <label
                        key={option.value}
                        className={
                          selected
                            ? `${styles.radioCard} ${styles.radioSelected}`
                            : styles.radioCard
                        }
                      >
                        <input
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
                        <span className={styles.radioBody}>
                          <span className={styles.radioLabel}>{option.label}</span>
                          <span className={styles.radioDescription}>{option.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </SecondarySection>

            <SecondarySection
              title="Khoảng ngày"
              description={<p>Để trống để xuất toàn bộ bản ghi thuộc loại đã chọn.</p>}
              contained
              slot="settings-section"
            >
              <div className={styles.dateRow}>
                <label className={styles.dateField}>
                  <span>Từ ngày</span>
                  <input
                    type="date"
                    value={from}
                    max={to || workspace.today || undefined}
                    onChange={(event) => setFrom(event.target.value)}
                    disabled={exporting}
                  />
                </label>
                <label className={styles.dateField}>
                  <span>Đến ngày</span>
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    max={workspace.today || undefined}
                    onChange={(event) => setTo(event.target.value)}
                    disabled={exporting}
                  />
                </label>
              </div>
            </SecondarySection>

            <SecondarySection
              title="Định dạng"
              description={
                <p>
                  {kind === "all"
                    ? "Gói giao dịch + Inbox luôn dùng JSON để giữ cấu trúc."
                    : "CSV thuận tiện cho bảng tính; JSON giữ cấu trúc trường."}
                </p>
              }
              contained
              slot="settings-section"
            >
              {kind === "all" ? (
                <span className={styles.capabilityStatus}>JSON bắt buộc</span>
              ) : (
                <div className={styles.formatRow} role="radiogroup" aria-label="Định dạng file">
                  {(["csv", "json"] as const).map((value) => (
                    <label
                      key={value}
                      className={
                        format === value
                          ? `${styles.formatChip} ${styles.formatSelected}`
                          : styles.formatChip
                      }
                    >
                      <input
                        type="radio"
                        name="exportFormat"
                        value={value}
                        checked={format === value}
                        onChange={() => setFormat(value)}
                        disabled={exporting}
                      />
                      {value.toUpperCase()}
                    </label>
                  ))}
                </div>
              )}
            </SecondarySection>

            <section className={styles.summary} aria-live="polite" data-slot="export-summary">
              {isEmpty ? (
                <p>
                  Không có bản ghi khớp bộ lọc hiện tại. Nới khoảng ngày hoặc đổi loại
                  dữ liệu trước khi tải.
                </p>
              ) : (
                <p>
                  Sẵn sàng xuất <strong>{preview?.count ?? 0}</strong> mục ·{" "}
                  <strong>{effectiveFormat.toUpperCase()}</strong>
                  {from || to ? ` · ${from || "…"} → ${to || "…"}` : " · toàn bộ thời gian"}
                </p>
              )}
            </section>

            <div className={styles.formActions}>
              <Button
                type="submit"
                intent="primary"
                targetSize="important"
                pending={exporting}
                pendingLabel="Đang xuất…"
                disabled={!canDownload}
              >
                Tải xuống
              </Button>
              <Button
                type="button"
                intent="secondary"
                targetSize="important"
                disabled={exporting}
                onClick={resetForm}
              >
                Đặt lại
              </Button>
            </div>
          </form>
        ) : null}
      </SecondaryWorkspace>
    </AppShell>
  );
}
