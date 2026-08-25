"use client";

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
import { commitDirectCsvImportAction } from "@/app/actions/direct-csv-import";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import {
  SecondaryHeader,
  SecondaryReviewDialog,
  SecondarySection,
  SecondaryWorkspace,
} from "@/components/secondary/secondary-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import type { ViewerSummary } from "@/components/user-chip";
import { useTransactions } from "@/hooks/use-transactions";
import {
  directImportRowStatusLabel,
  formatDirectImportSummary,
  planDirectCsvImport,
  retainedDirectImportRecovery,
  toDirectImportAcquisitionRows,
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
import { trackProductEvent } from "@/lib/safe-analytics";
import type {
  AccountOption,
  CategoryOption,
  Transaction,
} from "@/lib/sample-data";
import styles from "./direct-csv-import-page.module.css";

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

type Phase = "idle" | "reading" | "mapped" | "importing" | "done" | "error";

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function toLedgerLike(transactions: Transaction[]): LedgerLike[] {
  return transactions.map((transaction) => ({
    id: transaction.id,
    kind: transaction.kind,
    amount: transaction.amount,
    occurredOn: transaction.occurredOn,
    note: transaction.note,
    accountId: transaction.accountId,
    account: transaction.account,
  }));
}

function headerOptions(headers: string[]) {
  return [
    { value: "", label: "— Không dùng —" },
    ...headers.map((header, index) => ({
      value: String(index),
      label: header || `Cột ${index + 1}`,
    })),
  ];
}

function indexFromSelect(value: string): number | null {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const { transactions, addTransaction, isMutating } = useTransactions({
    initialTransactions: workspace.transactions,
    accounts: workspace.accounts,
    categories: workspace.categories,
    isDemo: viewer.isDemo,
  });

  const accounts = workspace.accounts;
  const categories = workspace.categories;
  const expenseCategories = useMemo(
    () => categories.filter((category) => category.kind === "expense"),
    [categories],
  );
  const incomeCategories = useMemo(
    () => categories.filter((category) => category.kind === "income"),
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
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [committedLedgerRows, setCommittedLedgerRows] = useState<LedgerLike[]>([]);
  const [resultSummary, setResultSummary] = useState<{
    created: number;
    failed: number;
    skipped: number;
  } | null>(null);
  const [recovery, setRecovery] = useState<ReturnType<
    typeof retainedDirectImportRecovery
  >>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const plan: DirectImportPlan | null = useMemo(() => {
    if (!parseResult?.ok || parseResult.rows.length === 0) return null;
    if (!accountId || !expenseCategoryId || !incomeCategoryId) return null;
    return planDirectCsvImport(
      parseResult.rows,
      [...toLedgerLike(transactions), ...committedLedgerRows],
      {
        accountId,
        expenseCategoryId,
        incomeCategoryId,
        skipDuplicates,
        skipTransfers: true,
      },
      accounts,
      categories,
    );
  }, [
    parseResult,
    transactions,
    committedLedgerRows,
    accountId,
    expenseCategoryId,
    incomeCategoryId,
    skipDuplicates,
    accounts,
    categories,
  ]);

  const reparseWithMap = useCallback(
    (text: string, name: string, map: CsvColumnMap) => {
      const result = parseCsvStatement(text, { fileName: name, columnMap: map });
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
      setRecovery(null);
      setFileName(file.name);
      setFileSize(file.size);

      if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
        setPhase("error");
        setError("Chỉ hỗ trợ CSV. Dùng Capture → Tải lên cho Excel hoặc PDF.");
        return;
      }
      if (file.size <= 0) {
        setPhase("error");
        setError("File trống.");
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setPhase("error");
        setError("File quá lớn; giới hạn hiện tại là 10 MB.");
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
        const looksHeader = first.some((cell) => /[a-zA-ZÀ-ỹ]/.test(cell));
        const nextHeaders = looksHeader
          ? first.map((header, index) => header.trim() || `Cột ${index + 1}`)
          : first.map((_, index) => `Cột ${index + 1}`);
        const auto = mapCsvColumns(looksHeader ? first : nextHeaders);
        setHeaders(nextHeaders);
        setColumnMap(auto.map);
        reparseWithMap(text, file.name, auto.map);
      } catch {
        setPhase("error");
        setError("Không đọc được file. Thử CSV UTF-8 không quá 10 MB.");
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
    const next: CsvColumnMap = { ...columnMap, [role]: indexFromSelect(value) };
    setColumnMap(next);
    if (csvText && fileName) reparseWithMap(csvText, fileName, next);
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
    setRecovery(null);
    setImportProgress({ done: 0, total: 0 });
    setReviewOpen(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function runImport() {
    if (!plan || !parseResult || plan.readyCount === 0 || phase === "importing") return;
    if (workspace.dataError) {
      setError(workspace.dataError);
      setReviewOpen(false);
      return;
    }
    if (!accountId || !expenseCategoryId || !incomeCategoryId) {
      setError("Chọn tài khoản và danh mục thu/chi trước khi ghi sổ.");
      setReviewOpen(false);
      return;
    }

    setPhase("importing");
    setError("");
    setResultSummary(null);
    setRecovery(null);
    setImportProgress({ done: 0, total: plan.readyCount });

    const skipped = plan.duplicateCount + plan.transferSkipped + plan.invalidSkipped;

    if (viewer.isDemo) {
      const posts = toDirectImportPosts(plan.ready, () => crypto.randomUUID());
      let created = 0;
      let failed = 0;
      for (let index = 0; index < posts.length; index += 1) {
        const result = await addTransaction(posts[index]!.input);
        if (result.ok) created += 1;
        else failed += 1;
        setImportProgress({ done: index + 1, total: posts.length });
      }

      setResultSummary({ created, failed, skipped });
      setReviewOpen(false);
      trackProductEvent("import_direct_committed", {
        created_count: created,
        failed_count: failed,
        duplicate_count: plan.duplicateCount,
        transfer_skipped: plan.transferSkipped,
        source_type: "csv",
        runtime_mode: "demo",
      });

      if (created > 0) {
        setNotice(
          failed === 0
            ? `Đã ghi ${created} giao dịch vào bộ nhớ demo.`
            : `Đã ghi ${created} giao dịch demo; ${failed} dòng lỗi.`,
        );
        setPhase("done");
      } else {
        setPhase("error");
        setError(
          failed > 0
            ? "Không ghi được giao dịch demo. Kiểm tra dữ liệu và thử lại."
            : "Không có dòng nào để ghi.",
        );
      }
      return;
    }

    const acquisitionRows = toDirectImportAcquisitionRows(plan.ready);
    const result = await commitDirectCsvImportAction({
      fileName: fileName || parseResult.fileName || "statement.csv",
      warningCount: parseResult.warningCount,
      skippedRows: parseResult.skippedRows + skipped,
      mapConfidence: parseResult.mapConfidence,
      headers: parseResult.headers,
      columnMap: parseResult.columnMap,
      allowHeuristicDuplicates: !skipDuplicates,
      rows: acquisitionRows,
    });

    setReviewOpen(false);
    if (!result.ok) {
      setImportProgress({ done: 0, total: plan.readyCount });
      setPhase("error");
      setError(result.message);
      setRecovery(retainedDirectImportRecovery(result.batchId));
      trackProductEvent("import_direct_committed", {
        created_count: 0,
        failed_count: plan.readyCount,
        duplicate_count: plan.duplicateCount,
        transfer_skipped: plan.transferSkipped,
        source_type: "csv",
        runtime_mode: "authenticated",
      });
      router.refresh();
      return;
    }

    const selectedAccountName =
      accounts.find((account) => account.id === accountId)?.name ?? "Tài khoản";
    const newlyCommitted: LedgerLike[] = result.transactionIds.map((id, index) => {
      const row = plan.ready[index]!;
      return {
        id,
        kind: row.kind,
        amount: row.amount,
        occurredOn: row.occurredOn,
        note: row.note,
        accountId: row.accountId,
        account: selectedAccountName,
      };
    });
    setCommittedLedgerRows((current) => [...newlyCommitted, ...current]);
    setImportProgress({ done: result.transactionIds.length, total: plan.readyCount });
    setResultSummary({
      created: result.transactionIds.length,
      failed: 0,
      skipped,
    });
    setNotice(`Đã ghi trọn lượt ${result.transactionIds.length} giao dịch vào sổ.`);
    setPhase("done");
    trackProductEvent("import_direct_committed", {
      created_count: result.transactionIds.length,
      failed_count: 0,
      duplicate_count: plan.duplicateCount,
      transfer_skipped: plan.transferSkipped,
      source_type: "csv",
      runtime_mode: "authenticated",
    });
    router.refresh();
  }

  const mapOptions = headerOptions(headers);
  const previewRows = plan?.rows.slice(0, PREVIEW_LIMIT) ?? [];
  const noAccounts = accounts.length === 0;
  const noCategories = expenseCategories.length === 0 || incomeCategories.length === 0;
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const selectedExpense = expenseCategories.find(
    (category) => category.id === expenseCategoryId,
  );
  const selectedIncome = incomeCategories.find(
    (category) => category.id === incomeCategoryId,
  );
  const busy = phase === "importing" || (viewer.isDemo && isMutating);

  return (
    <AppShell viewer={viewer} notice={notice}>
      <SecondaryWorkspace slot="direct-import-workspace">
        <SecondaryHeader
          section="Imports · Công cụ nâng cao"
          title="Import CSV thẳng vào sổ"
          description={
            <p>
              Review và dry-run ngay tại đây, không cần qua màn hình Inbox. Khi đã
              đăng nhập, các dòng được ghi qua cùng contract provenance và theo một
              lượt all-or-nothing; chuyển khoản vẫn cần Inbox để ghép hai tài khoản.
            </p>
          }
          actions={
            <>
              <LinkButton
                href="/capture/upload"
                intent="primary"
                targetSize="important"
              >
                <Icon name="upload" />
                Dùng Inbox mặc định
              </LinkButton>
              <LinkButton
                href="/imports"
                intent="secondary"
                targetSize="important"
              >
                Lịch sử import
              </LinkButton>
            </>
          }
        />

        <Alert tone="warning" live="polite">
          <AlertDescription>
            Đây là đường nâng cao. Hãy kiểm tra map cột, dry-run và số dòng bỏ qua.
            Tài khoản đăng nhập ghi cả lượt hoặc không ghi dòng nào nếu một dòng lỗi;
            thao tác undo sau khi đã commit vẫn theo lifecycle của từng giao dịch.
          </AlertDescription>
        </Alert>

        {workspace.dataError ? (
          <Alert tone="error" live="assertive">
            <AlertDescription className={styles.alertAction}>
              <span>{workspace.dataError}</span>
              <Button
                type="button"
                intent="secondary"
                targetSize="important"
                onClick={() => router.refresh()}
              >
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {!workspace.dataError && noAccounts ? (
          <Alert tone="warning" live="polite">
            <AlertDescription className={styles.alertAction}>
              <span>Chưa có tài khoản để nhận giao dịch import.</span>
              <LinkButton href="/accounts" intent="primary" targetSize="important">
                Mở Tài khoản
              </LinkButton>
            </AlertDescription>
          </Alert>
        ) : null}

        {!workspace.dataError && !noAccounts && noCategories ? (
          <Alert tone="warning" live="polite">
            <AlertDescription className={styles.alertAction}>
              <span>Cần ít nhất một danh mục chi và một danh mục thu.</span>
              <LinkButton href="/categories" intent="primary" targetSize="important">
                Mở Danh mục
              </LinkButton>
            </AlertDescription>
          </Alert>
        ) : null}

        {!workspace.dataError && !noAccounts && !noCategories ? (
          <>
            {phase === "idle" ||
            phase === "reading" ||
            (phase === "error" && !parseResult?.ok) ? (
              <SecondarySection
                title="1. Chọn CSV"
                description={
                  <p>
                    File được đọc trên thiết bị. Giới hạn {formatBytes(MAX_UPLOAD_BYTES)};
                    Excel/PDF dùng Capture → Tải lên.
                  </p>
                }
                contained
                slot="direct-import-upload"
              >
                <div
                  className={[
                    styles.dropzone,
                    dragOver && styles.dragOver,
                    phase === "error" && styles.dropError,
                    phase === "reading" && styles.dropLoading,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onDrop={onDrop}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  aria-busy={phase === "reading"}
                >
                  <Icon name="upload" />
                  <strong>
                    {phase === "reading" ? "Đang phân tích…" : "Kéo thả CSV hoặc chọn file"}
                  </strong>
                  <span>CSV UTF-8 · tối đa {formatBytes(MAX_UPLOAD_BYTES)}</span>
                  <label className={styles.fileButton} htmlFor={inputId}>
                    Chọn CSV
                  </label>
                  <input
                    id={inputId}
                    ref={inputRef}
                    type="file"
                    className={styles.fileInput}
                    accept={CSV_ACCEPT}
                    disabled={phase === "reading"}
                    onChange={onInputChange}
                  />
                </div>
                {error ? (
                  <Alert tone="error" live="assertive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
                {phase === "error" ? (
                  <Button
                    type="button"
                    intent="secondary"
                    targetSize="important"
                    onClick={reset}
                  >
                    Chọn file khác
                  </Button>
                ) : null}
              </SecondarySection>
            ) : null}

            {(phase === "mapped" ||
              phase === "importing" ||
              phase === "done" ||
              (phase === "error" && parseResult?.ok)) &&
            parseResult?.ok ? (
              <>
                <SecondarySection
                  title="2. Map cột và đích ghi"
                  description={
                    <p>
                      {fileName} {fileSize ? `· ${formatBytes(fileSize)}` : ""} ·{" "}
                      {parseResult.rows.length} dòng parse hợp lệ
                      {parseResult.skippedRows
                        ? ` · ${parseResult.skippedRows} dòng bỏ qua khi parse`
                        : ""}
                    </p>
                  }
                  contained
                  slot="direct-import-mapping"
                >
                  <div className={styles.mapGrid}>
                    {(
                      [
                        ["date", "Ngày"],
                        ["desc", "Mô tả"],
                        ["amount", "Số tiền"],
                        ["debit", "Ghi nợ (chi)"],
                        ["credit", "Ghi có (thu)"],
                      ] as const
                    ).map(([role, label]) => (
                      <SelectField
                        key={role}
                        label={label}
                        value={columnMap[role] === null ? "" : String(columnMap[role])}
                        onChange={(event) => updateMapField(role, event.target.value)}
                        disabled={busy || phase === "done"}
                        targetSize="important"
                      >
                        {mapOptions.map((option) => (
                          <option key={`${role}-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </SelectField>
                    ))}
                  </div>
                  <div className={styles.mapGrid}>
                    <SelectField
                      label="Tài khoản"
                      value={accountId}
                      onChange={(event) => setAccountId(event.target.value)}
                      disabled={busy || phase === "done"}
                      targetSize="important"
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                          {account.currencyCode && account.currencyCode !== "VND"
                            ? ` (${account.currencyCode})`
                            : ""}
                        </option>
                      ))}
                    </SelectField>
                    <SelectField
                      label="Danh mục chi"
                      value={expenseCategoryId}
                      onChange={(event) => setExpenseCategoryId(event.target.value)}
                      disabled={busy || phase === "done"}
                      targetSize="important"
                    >
                      {expenseCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </SelectField>
                    <SelectField
                      label="Danh mục thu"
                      value={incomeCategoryId}
                      onChange={(event) => setIncomeCategoryId(event.target.value)}
                      disabled={busy || phase === "done"}
                      targetSize="important"
                    >
                      {incomeCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                  <label className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(event) => setSkipDuplicates(event.target.checked)}
                      disabled={busy || phase === "done"}
                    />
                    <span>
                      <strong>Bỏ qua dòng trùng</strong>
                      <small>
                        So cùng tài khoản, ngày, số tiền và mô tả với sổ hiện tại hoặc
                        trong file. Tắt tùy chọn làm tăng nguy cơ tạo bản sao.
                      </small>
                    </span>
                  </label>
                </SecondarySection>

                {plan ? (
                  <SecondarySection
                    title="3. Dry-run"
                    description={<p>{formatDirectImportSummary(plan)}</p>}
                    contained
                    slot="direct-import-preview"
                  >
                    <div className={styles.tableScroll}>
                      <table className={styles.table}>
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
                              <td>{row.rowIndex}</td>
                              <td>{row.occurredOn}</td>
                              <td>{row.merchant || row.note || "—"}</td>
                              <td>
                                <MoneyValue
                                  amount={row.amount}
                                  mode="kind"
                                  kind={row.kind}
                                  label={`Dòng ${row.rowIndex}`}
                                />
                              </td>
                              <td>
                                <span
                                  className={
                                    row.status === "ready"
                                      ? styles.readyStatus
                                      : styles.skippedStatus
                                  }
                                >
                                  {directImportRowStatusLabel(row.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {plan.rows.length > PREVIEW_LIMIT ? (
                      <p className={styles.hint}>
                        Hiển thị {PREVIEW_LIMIT}/{plan.rows.length} dòng.
                      </p>
                    ) : null}

                    {phase === "importing" ? (
                      <p className={styles.progress} role="status" aria-live="polite">
                        {viewer.isDemo
                          ? `Đang ghi ${importProgress.done}/${importProgress.total}…`
                          : `Đang ghi trọn lượt ${importProgress.total} giao dịch…`}
                      </p>
                    ) : null}

                    {resultSummary && phase === "done" ? (
                      <Alert tone={resultSummary.failed ? "warning" : "success"} live="polite">
                        <AlertDescription>
                          Đã ghi {resultSummary.created} giao dịch
                          {resultSummary.failed ? ` · ${resultSummary.failed} lỗi` : ""}
                          {resultSummary.skipped ? ` · ${resultSummary.skipped} bỏ qua` : ""}.
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {error ? (
                      <Alert tone="error" live="assertive">
                        <AlertDescription
                          className={recovery ? styles.alertAction : undefined}
                        >
                          <span>
                            {error}
                            {recovery
                              ? " Lượt import đã được giữ để kiểm tra; đừng thử lại trước khi xem Inbox."
                              : ""}
                          </span>
                          {recovery ? (
                            <span className={styles.recoveryActions}>
                              <LinkButton
                                href={recovery.inboxHref}
                                intent="primary"
                                targetSize="important"
                              >
                                Mở Inbox
                              </LinkButton>
                              <LinkButton
                                href={recovery.importsHref}
                                intent="secondary"
                                targetSize="important"
                              >
                                Lịch sử import
                              </LinkButton>
                            </span>
                          ) : null}
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    <div className={styles.actions}>
                      {phase !== "done" ? (
                        <Button
                          type="button"
                          intent="destructive"
                          targetSize="important"
                          disabled={!plan || plan.readyCount === 0 || busy}
                          onClick={() => setReviewOpen(true)}
                        >
                          Xem lại ghi {plan?.readyCount ?? 0} giao dịch
                        </Button>
                      ) : (
                        <LinkButton
                          href="/transactions"
                          intent="primary"
                          targetSize="important"
                        >
                          Xem giao dịch
                        </LinkButton>
                      )}
                      <Button
                        type="button"
                        intent="secondary"
                        targetSize="important"
                        onClick={reset}
                        disabled={busy}
                      >
                        {phase === "done" ? "Import file khác" : "Hủy"}
                      </Button>
                    </div>
                  </SecondarySection>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </SecondaryWorkspace>

      <SecondaryReviewDialog
        open={reviewOpen}
        onOpenChange={(open) => {
          if (!open && !busy) setReviewOpen(false);
        }}
        title="Ghi trực tiếp giao dịch vào sổ?"
        description="Xác nhận dry-run trước khi ghi các dòng đã duyệt."
        details={[
          { label: "File", value: fileName || "CSV" },
          { label: "Sẽ tạo", value: `${plan?.readyCount ?? 0} giao dịch` },
          {
            label: "Sẽ bỏ qua",
            value: `${(plan?.duplicateCount ?? 0) + (plan?.transferSkipped ?? 0) + (plan?.invalidSkipped ?? 0)} dòng`,
          },
          { label: "Tài khoản", value: selectedAccount?.name ?? "Chưa chọn" },
          {
            label: "Danh mục mặc định",
            value: `Chi: ${selectedExpense?.name ?? "—"} · Thu: ${selectedIncome?.name ?? "—"}`,
          },
        ]}
        consequence={
          viewer.isDemo
            ? "Demo ghi từng dòng vào bộ nhớ trình duyệt. Chuyển khoản, dòng trùng và dòng không hợp lệ vẫn bị bỏ qua theo dry-run."
            : "Tài khoản đăng nhập ghi toàn bộ các dòng đủ điều kiện trong một lượt: nếu một dòng bị máy chủ từ chối thì không dòng nào của lượt ghi trở thành giao dịch. Sau khi commit thành công, không có undo toàn batch; hoàn tác vẫn theo lifecycle của từng giao dịch."
        }
        confirmLabel={`Ghi ${plan?.readyCount ?? 0} giao dịch`}
        confirmIntent="destructive"
        pending={busy}
        onConfirm={runImport}
        slot="direct-import-review"
      />
    </AppShell>
  );
}
