"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useDemoMasterData } from "@/hooks/use-demo-master-data";
import { useTransactions } from "@/hooks/use-transactions";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import {
  directImportRowStatusLabel,
  formatDirectImportSummary,
  planDirectCsvImport,
  toDirectImportPosts,
  type DirectImportPlan,
} from "@/lib/inbox/direct-csv-import";
import type { LedgerLike } from "@/lib/inbox/detect";
import {
  emptyColumnMap,
  mapCsvColumns,
  MAX_UPLOAD_BYTES,
  parseCsvMatrix,
  parseCsvStatement,
  type CsvColumnMap,
  type ParseCsvResult,
} from "@/lib/inbox/parse-csv";
import { formatMoney } from "@/lib/money";
import { trackProductEvent } from "@/lib/safe-analytics";
import type {
  AccountOption,
  CategoryOption,
  Transaction,
} from "@/lib/sample-data";

type DirectImportWorkspace = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  totalBalance: number;
  today: string;
  dataError: string | null;
};

const PREVIEW_LIMIT = 12;
const CSV_ACCEPT = ".csv,text/csv,application/csv";

type Phase =
  | "idle"
  | "reading"
  | "mapped"
  | "importing"
  | "done"
  | "error";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function moneySign(kind: "expense" | "income"): string {
  return kind === "income" ? "+" : "−";
}

function moneyClass(kind: "expense" | "income"): string {
  return kind === "income" ? "positive" : "negative";
}

function toLedgerLike(transactions: Transaction[]): LedgerLike[] {
  return transactions.map((t) => ({
    id: t.id,
    kind: t.kind,
    amount: t.amount,
    occurredOn: t.occurredOn,
    note: t.note,
    accountId: t.accountId,
    account: t.account,
  }));
}

function headerOptions(headers: string[]): { value: string; label: string }[] {
  return [
    { value: "", label: "— Không dùng —" },
    ...headers.map((h, i) => ({
      value: String(i),
      label: h || `Cột ${i + 1}`,
    })),
  ];
}

function indexFromSelect(value: string): number | null {
  if (value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export function DirectCsvImportPage({
  viewer,
  workspace,
}: {
  viewer: ViewerSummary;
  workspace: DirectImportWorkspace;
}) {
  const router = useRouter();
  const inputId = useId();
  const accountIdField = useId();
  const expenseCatField = useId();
  const incomeCatField = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { accounts, categories } = useDemoMasterData({
    isDemo: viewer.isDemo,
    accounts: workspace.accounts,
    categories: workspace.categories,
  });

  const { transactions, addTransaction, isMutating } = useTransactions({
    initialTransactions: workspace.transactions,
    accounts,
    categories,
    isDemo: viewer.isDemo,
  });

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.kind === "expense"),
    [categories],
  );
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.kind === "income"),
    [categories],
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<CsvColumnMap>(emptyColumnMap());
  const [parseResult, setParseResult] = useState<ParseCsvResult | null>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [expenseCategoryId, setExpenseCategoryId] = useState(
    expenseCategories[0]?.id ?? "",
  );
  const [incomeCategoryId, setIncomeCategoryId] = useState(
    incomeCategories[0]?.id ?? "",
  );
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const selectedAccountId = accounts.some((item) => item.id === accountId)
    ? accountId
    : accounts[0]?.id ?? "";
  const selectedExpenseCategoryId = expenseCategories.some(
    (item) => item.id === expenseCategoryId,
  )
    ? expenseCategoryId
    : expenseCategories[0]?.id ?? "";
  const selectedIncomeCategoryId = incomeCategories.some(
    (item) => item.id === incomeCategoryId,
  )
    ? incomeCategoryId
    : incomeCategories[0]?.id ?? "";
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [resultSummary, setResultSummary] = useState<{
    created: number;
    failed: number;
    skipped: number;
  } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const plan: DirectImportPlan | null = useMemo(() => {
    if (!parseResult?.ok || parseResult.rows.length === 0) return null;
    if (
      !selectedAccountId ||
      !selectedExpenseCategoryId ||
      !selectedIncomeCategoryId
    ) {
      return null;
    }
    return planDirectCsvImport(
      parseResult.rows,
      toLedgerLike(transactions),
      {
        accountId: selectedAccountId,
        expenseCategoryId: selectedExpenseCategoryId,
        incomeCategoryId: selectedIncomeCategoryId,
        skipDuplicates,
        skipTransfers: true,
      },
      accounts,
      categories,
    );
  }, [
    parseResult,
    transactions,
    selectedAccountId,
    selectedExpenseCategoryId,
    selectedIncomeCategoryId,
    skipDuplicates,
    accounts,
    categories,
  ]);

  const reparseWithMap = useCallback(
    (text: string, name: string, map: CsvColumnMap) => {
      const result = parseCsvStatement(text, {
        fileName: name,
        columnMap: map,
      });
      setParseResult(result);
      if (!result.ok) {
        setPhase("error");
        setError(result.error ?? "Không phân tích được CSV với map cột này.");
        return;
      }
      setHeaders(result.headers);
      setColumnMap(result.columnMap);
      setPhase("mapped");
      setError("");
    },
    [],
  );

  const processFile = useCallback(
    async (file: File) => {
      setError("");
      setResultSummary(null);
      setFileName(file.name);
      setFileSize(file.size);

      if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
        setPhase("error");
        setError("Chỉ hỗ trợ CSV cho import thẳng vào sổ. Dùng Capture → Tải lên cho Excel/PDF.");
        return;
      }
      if (file.size <= 0) {
        setPhase("error");
        setError("File trống.");
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setPhase("error");
        setError("File quá lớn (tối đa 10MB).");
        return;
      }

      setPhase("reading");
      try {
        const text = await file.text();
        setCsvText(text);
        const matrix = parseCsvMatrix(text);
        if (matrix.length === 0) {
          setPhase("error");
          setError("Không tìm thấy dòng dữ liệu trong CSV.");
          return;
        }
        const first = matrix[0]!;
        const looksHeader = first.some((c) => /[a-zA-ZÀ-ỹ]/.test(c));
        const hdrs = looksHeader
          ? first.map((h, i) => h.trim() || `Cột ${i + 1}`)
          : first.map((_, i) => `Cột ${i + 1}`);
        const auto = mapCsvColumns(looksHeader ? first : hdrs);
        setHeaders(hdrs);
        setColumnMap(auto.map);
        reparseWithMap(text, file.name, auto.map);
      } catch {
        setPhase("error");
        setError("Không đọc được file. Thử CSV UTF-8 ≤10MB.");
      }
    },
    [reparseWithMap],
  );

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void processFile(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  function updateMapField(role: keyof CsvColumnMap, value: string) {
    const next: CsvColumnMap = {
      ...columnMap,
      [role]: indexFromSelect(value),
    };
    // Single amount column vs debit/credit mutual preference
    if (role === "amount" && next.amount !== null) {
      // keep debit/credit if user set them; amount takes precedence in parser
    }
    setColumnMap(next);
    if (csvText && fileName) {
      reparseWithMap(csvText, fileName, next);
    }
  }

  function reset() {
    setPhase("idle");
    setError("");
    setFileName("");
    setFileSize(0);
    setCsvText("");
    setHeaders([]);
    setColumnMap(emptyColumnMap());
    setParseResult(null);
    setResultSummary(null);
    setImportProgress({ done: 0, total: 0 });
    if (inputRef.current) inputRef.current.value = "";
  }

  async function runImport() {
    if (!plan || plan.readyCount === 0 || phase === "importing") return;
    if (workspace.dataError) {
      setError(workspace.dataError);
      return;
    }
    if (
      !selectedAccountId ||
      !selectedExpenseCategoryId ||
      !selectedIncomeCategoryId
    ) {
      setError("Chọn tài khoản và danh mục thu/chi trước khi ghi sổ.");
      return;
    }

    setPhase("importing");
    setError("");
    const posts = toDirectImportPosts(plan.ready, () => crypto.randomUUID());
    setImportProgress({ done: 0, total: posts.length });

    let created = 0;
    let failed = 0;
    for (let i = 0; i < posts.length; i += 1) {
      const post = posts[i]!;
      const result = await addTransaction(post.input);
      if (result.ok) created += 1;
      else failed += 1;
      setImportProgress({ done: i + 1, total: posts.length });
    }

    const skipped = plan.duplicateCount + plan.transferSkipped + plan.invalidSkipped;
    setResultSummary({ created, failed, skipped });
    trackProductEvent("import_direct_committed", {
      created_count: created,
      failed_count: failed,
      duplicate_count: plan.duplicateCount,
      transfer_skipped: plan.transferSkipped,
      source_type: "csv",
    });

    if (created > 0 && failed === 0) {
      setNotice(`Đã ghi ${created} giao dịch vào sổ.`);
      setPhase("done");
    } else if (created > 0) {
      setNotice(`Đã ghi ${created} giao dịch; ${failed} lỗi.`);
      setPhase("done");
    } else {
      setPhase("error");
      setError(
        failed > 0
          ? "Không ghi được giao dịch. Kiểm tra tài khoản/danh mục và thử lại."
          : "Không có dòng nào để ghi.",
      );
    }
  }

  const mapOptions = headerOptions(headers);
  const previewRows = plan?.rows.slice(0, PREVIEW_LIMIT) ?? [];
  const dataError = workspace.dataError;
  const noAccounts = accounts.length === 0;
  const noCategories =
    expenseCategories.length === 0 || incomeCategories.length === 0;

  return (
    <AppShell
      viewer={viewer}
      notice={notice}
      primaryAction={{
        label: "Ghi chi tiêu",
        href: "/capture/quick",
        icon: "plus",
      }}
    >
      <main className="dashboard imports-workspace direct-import-workspace">
        <section className="transactions-title-row">
          <div>
            <p className="eyebrow">
              <Link className="capture-paste-back" href="/imports">
                ← Imports
              </Link>
            </p>
            <h1>Import CSV thẳng vào sổ</h1>
            <p>
              Power-user: map cột CSV, chọn ví + danh mục mặc định, ghi thu/chi
              đã duyệt — bỏ qua Inbox. Trùng fingerprint sẽ bị bỏ qua. Chuyển
              khoản (cần hai tài khoản) dùng Capture → Inbox.
            </p>
          </div>
          <div className="page-heading-actions">
            <Link className="secondary-button" href="/capture/upload">
              <Icon name="upload" />
              Vào Inbox
            </Link>
            <Link className="secondary-button" href="/transactions">
              <Icon name="timeline" />
              Giao dịch
            </Link>
          </div>
        </section>

        {dataError && (
          <section className="panel imports-error" role="alert">
            <p>{dataError}</p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => router.refresh()}
            >
              Thử lại
            </button>
          </section>
        )}

        {!dataError && noAccounts && (
          <section className="panel imports-error" role="alert">
            <p>Chưa có tài khoản. Tạo ví trước khi import.</p>
            <Link className="primary-button" href="/accounts">
              Mở Tài khoản
            </Link>
          </section>
        )}

        {!dataError && !noAccounts && noCategories && (
          <section className="panel imports-error" role="alert">
            <p>Cần ít nhất một danh mục chi và một danh mục thu.</p>
            <Link className="primary-button" href="/categories">
              Mở Danh mục
            </Link>
          </section>
        )}

        {!dataError && !noAccounts && !noCategories && (
          <>
            {(phase === "idle" || phase === "reading" || (phase === "error" && !parseResult?.ok)) && (
              <section
                className="panel capture-upload-panel"
                aria-labelledby="direct-upload-heading"
              >
                <h2 id="direct-upload-heading" className="sr-only">
                  Tải CSV
                </h2>
                <div
                  className={`capture-upload-dropzone${dragOver ? " is-dragover" : ""}${phase === "error" ? " is-error" : ""}${phase === "reading" ? " is-loading" : ""}`}
                  onDrop={onDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  aria-busy={phase === "reading"}
                >
                  <span className="capture-upload-drop-icon" aria-hidden>
                    <Icon name="upload" />
                  </span>
                  <p className="capture-upload-drop-title">
                    {phase === "reading"
                      ? "Đang phân tích…"
                      : "Kéo thả CSV (map cột → ghi sổ)"}
                  </p>
                  <p className="capture-upload-drop-meta">
                    tối đa {formatBytes(MAX_UPLOAD_BYTES)} · chỉ CSV · không ghi
                    bank password · dedupe tự động
                  </p>
                  <span className="capture-upload-or">Hoặc</span>
                  <label
                    className="secondary-button capture-upload-pick"
                    htmlFor={inputId}
                  >
                    Chọn CSV
                  </label>
                  <input
                    id={inputId}
                    ref={inputRef}
                    type="file"
                    className="sr-only"
                    accept={CSV_ACCEPT}
                    disabled={phase === "reading"}
                    onChange={onInputChange}
                  />
                </div>
                <p className="capture-upload-trust-inline">
                  <Icon name="lock" />
                  <span>
                    File chỉ xử lý trên máy này. Ghi thẳng vào sổ (đã duyệt) —
                    không qua Inbox. Bật dedupe để tránh trùng.
                  </span>
                </p>
                {error && (
                  <p className="capture-paste-error" role="alert">
                    {error}
                  </p>
                )}
                {phase === "error" && (
                  <div className="capture-paste-actions">
                    <button type="button" className="primary-button" onClick={reset}>
                      Chọn file khác
                    </button>
                  </div>
                )}
              </section>
            )}

            {(phase === "mapped" ||
              phase === "importing" ||
              phase === "done" ||
              (phase === "error" && parseResult?.ok)) &&
              parseResult?.ok && (
                <section className="panel import-preview-panel direct-import-panel">
                  <div className="import-preview-header">
                    <p className="import-preview-filename font-mono">
                      {fileName}
                      {fileSize > 0 ? ` · ${formatBytes(fileSize)}` : ""}
                    </p>
                    <p className="imports-list-meta">
                      {parseResult.rows.length} dòng hợp lệ
                      {parseResult.skippedRows > 0
                        ? ` · ${parseResult.skippedRows} bỏ qua khi parse`
                        : ""}
                    </p>
                  </div>

                  <h2 className="import-preview-section-title">Map cột</h2>
                  <div className="direct-import-map-grid">
                    {(
                      [
                        ["date", "Ngày"],
                        ["desc", "Mô tả"],
                        ["amount", "Số tiền"],
                        ["debit", "Ghi nợ (chi)"],
                        ["credit", "Ghi có (thu)"],
                      ] as const
                    ).map(([role, label]) => (
                      <label key={role} className="direct-import-map-field">
                        <span>{label}</span>
                        <select
                          value={
                            columnMap[role] === null
                              ? ""
                              : String(columnMap[role])
                          }
                          onChange={(e) => updateMapField(role, e.target.value)}
                          disabled={phase === "importing" || phase === "done"}
                          aria-label={label}
                        >
                          {mapOptions.map((opt) => (
                            <option key={`${role}-${opt.value}`} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>

                  <h2 className="import-preview-section-title">Ghi vào ví</h2>
                  <div className="direct-import-map-grid">
                    <label className="direct-import-map-field" htmlFor={accountIdField}>
                      <span>Tài khoản</span>
                      <select
                        id={accountIdField}
                        value={selectedAccountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        disabled={phase === "importing" || phase === "done"}
                      >
                        {accounts.map((a: AccountOption) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                            {a.currencyCode && a.currencyCode !== "VND"
                              ? ` (${a.currencyCode})`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label
                      className="direct-import-map-field"
                      htmlFor={expenseCatField}
                    >
                      <span>Danh mục chi (−)</span>
                      <select
                        id={expenseCatField}
                        value={selectedExpenseCategoryId}
                        onChange={(e) => setExpenseCategoryId(e.target.value)}
                        disabled={phase === "importing" || phase === "done"}
                      >
                        {expenseCategories.map((c: CategoryOption) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label
                      className="direct-import-map-field"
                      htmlFor={incomeCatField}
                    >
                      <span>Danh mục thu (+)</span>
                      <select
                        id={incomeCatField}
                        value={selectedIncomeCategoryId}
                        onChange={(e) => setIncomeCategoryId(e.target.value)}
                        disabled={phase === "importing" || phase === "done"}
                      >
                        {incomeCategories.map((c: CategoryOption) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="direct-import-dedupe">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      disabled={phase === "importing" || phase === "done"}
                    />
                    <span>
                      Bỏ qua dòng trùng (cùng tài khoản, ngày, số tiền, mô tả
                      với sổ hiện tại hoặc trong file)
                    </span>
                  </label>

                  {plan && (
                    <>
                      <h2 className="import-preview-section-title">
                        Xem trước
                      </h2>
                      <p className="imports-list-stats font-mono" role="status">
                        {formatDirectImportSummary(plan)}
                      </p>
                      <div className="import-preview-table-wrap">
                        <div className="import-preview-table-scroll">
                          <table className="import-preview-table">
                            <thead>
                              <tr>
                                <th scope="col">#</th>
                                <th scope="col">Ngày</th>
                                <th scope="col">Mô tả</th>
                                <th scope="col">Số tiền</th>
                                <th scope="col">Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody>
                              {previewRows.map((row) => (
                                <tr key={`${row.rowIndex}-${row.fingerprint}`}>
                                  <td className="font-mono">{row.rowIndex}</td>
                                  <td className="font-mono">{row.occurredOn}</td>
                                  <td title={row.merchant || row.note}>
                                    {row.merchant || row.note || "—"}
                                  </td>
                                  <td
                                    className={`font-mono money ${moneyClass(row.kind)}`}
                                  >
                                    <span aria-hidden>
                                      {moneySign(row.kind)}
                                    </span>
                                    {formatMoney(row.amount)}
                                  </td>
                                  <td>
                                    <span
                                      className={`preview-chip sm imports-status-${row.status === "ready" ? "parsed" : "cancelled"}`}
                                    >
                                      {directImportRowStatusLabel(row.status)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {plan.rows.length > PREVIEW_LIMIT && (
                          <p className="imports-list-hint">
                            Hiển thị {PREVIEW_LIMIT}/{plan.rows.length} dòng.
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {phase === "importing" && (
                    <p className="capture-upload-file-meta" role="status" aria-live="polite">
                      Đang ghi {importProgress.done}/{importProgress.total}
                      {isMutating ? "…" : ""}
                    </p>
                  )}

                  {resultSummary && phase === "done" && (
                    <section className="panel direct-import-result" role="status">
                      <p>
                        Đã ghi <strong className="font-mono">{resultSummary.created}</strong>{" "}
                        giao dịch
                        {resultSummary.failed > 0
                          ? ` · ${resultSummary.failed} lỗi`
                          : ""}
                        {resultSummary.skipped > 0
                          ? ` · ${resultSummary.skipped} bỏ qua (trùng / chuyển / không hợp lệ)`
                          : ""}
                        .
                      </p>
                    </section>
                  )}

                  {error && (
                    <p className="capture-paste-error" role="alert">
                      {error}
                    </p>
                  )}

                  <div className="capture-paste-actions direct-import-actions">
                    {phase !== "done" && (
                      <button
                        type="button"
                        className="primary-button"
                        disabled={
                          !plan ||
                          plan.readyCount === 0 ||
                          phase === "importing"
                        }
                        onClick={() => void runImport()}
                      >
                        {phase === "importing"
                          ? `Đang ghi ${importProgress.done}/${importProgress.total}…`
                          : plan
                            ? `Ghi ${plan.readyCount} giao dịch vào sổ`
                            : "Ghi vào sổ"}
                      </button>
                    )}
                    {phase === "done" && (
                      <Link className="primary-button" href="/transactions">
                        Xem giao dịch
                      </Link>
                    )}
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={reset}
                      disabled={phase === "importing"}
                    >
                      {phase === "done" ? "Import file khác" : "Hủy"}
                    </button>
                    <Link className="secondary-button" href="/imports">
                      Lịch sử import
                    </Link>
                  </div>
                </section>
              )}
          </>
        )}
      </main>
    </AppShell>
  );
}
