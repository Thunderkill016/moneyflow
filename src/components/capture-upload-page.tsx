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
  type DragEvent,
  type ChangeEvent,
} from "react";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import {
  addStoredCandidate,
  countPending,
  readStoredCandidates,
} from "@/lib/inbox/candidate-store";
import {
  addStoredImportBatch,
  markImportBatchCommitted,
} from "@/lib/inbox/import-batch-store";
import {
  MAX_UPLOAD_BYTES,
  parseCsvStatement,
  toCsvCandidateInputs,
  validateUploadFile,
  type ParsedCsvRow,
  type ParseCsvResult,
} from "@/lib/inbox/parse-csv";
import { formatMoney } from "@/lib/money";

type Phase = "idle" | "reading" | "preview" | "error";

const ACCEPT =
  ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function moneySign(kind: ParsedCsvRow["kind"]): string {
  if (kind === "income") return "+";
  if (kind === "transfer") return "↔ ";
  return "−";
}

function moneyClass(kind: ParsedCsvRow["kind"]): string {
  if (kind === "income") return "positive";
  if (kind === "transfer") return "transfer";
  return "negative";
}

function confidenceLabel(confidence: ParsedCsvRow["confidence"]): string {
  if (confidence === "high") return "Khá chắc";
  if (confidence === "medium") return "Tạm ổn";
  return "Cần xem";
}

function confidenceClass(confidence: ParsedCsvRow["confidence"]): string {
  if (confidence === "high") return "ok";
  if (confidence === "medium") return "warning";
  return "danger";
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const PREVIEW_LIMIT = 10;

export function CaptureUploadPage({ viewer }: { viewer: ViewerSummary }) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [parseResult, setParseResult] = useState<ParseCsvResult | null>(null);
  const [committing, setCommitting] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setInboxCount(countPending(readStoredCandidates()));
      } catch {
        setInboxCount(0);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const previewRows = useMemo(() => {
    if (!parseResult?.rows) return [];
    return parseResult.rows.slice(0, PREVIEW_LIMIT);
  }, [parseResult]);

  const summary = useMemo(() => {
    if (!parseResult?.ok) return "";
    const warn =
      parseResult.warningCount > 0
        ? ` · ${parseResult.warningCount} cần xem`
        : "";
    const skip =
      parseResult.skippedRows > 0
        ? ` · bỏ qua ${parseResult.skippedRows} dòng`
        : "";
    return `Tìm thấy ${parseResult.rows.length} giao dịch${warn}${skip}`;
  }, [parseResult]);

  const mapLabel = useMemo(() => {
    if (!parseResult) return "";
    const pct = Math.round(parseResult.mapConfidence * 100);
    return `Map cột tự động ~${pct}%`;
  }, [parseResult]);

  const reset = useCallback(() => {
    setPhase("idle");
    setError("");
    setFileName("");
    setFileSize(0);
    setParseResult(null);
    setCommitting(false);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const processFile = useCallback(async (file: File) => {
    setError("");
    setParseResult(null);
    setFileName(file.name);
    setFileSize(file.size);

    const check = validateUploadFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!check.ok) {
      setPhase("error");
      setError(check.error);
      return;
    }

    if (check.kind === "xlsx") {
      setPhase("error");
      setError(
        "Excel (.xlsx/.xls) chưa đọc trực tiếp — xuất CSV (UTF-8) từ Excel rồi tải lại. Ưu tiên CSV.",
      );
      return;
    }

    setPhase("reading");
    try {
      const text = await file.text();
      const result = parseCsvStatement(text, { fileName: file.name });
      if (!result.ok || result.rows.length === 0) {
        setPhase("error");
        setParseResult(result);
        setError(result.error ?? "Không phân tích được CSV.");
        return;
      }
      setParseResult(result);
      setPhase("preview");
      setError("");
    } catch {
      setPhase("error");
      setError("Không đọc được file. Thử CSV UTF-8 nhỏ hơn 10MB.");
    }
  }, []);

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

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(true);
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
  }

  function commitToInbox() {
    if (!parseResult?.ok || parseResult.rows.length === 0 || committing) return;
    setCommitting(true);
    setError("");
    try {
      const batch = addStoredImportBatch({
        fileName: parseResult.fileName,
        source: "csv",
        status: "parsed",
        rowCount: parseResult.rows.length,
        warningCount: parseResult.warningCount,
        skippedRows: parseResult.skippedRows,
        mapConfidence: parseResult.mapConfidence,
        headers: parseResult.headers,
        columnMap: parseResult.columnMap,
      });

      const inputs = toCsvCandidateInputs(parseResult.rows, batch.id);
      for (const input of inputs) {
        addStoredCandidate(input);
      }
      markImportBatchCommitted(batch.id);

      const pending = countPending(readStoredCandidates());
      setInboxCount(pending);
      setNotice(
        `Đã đưa ${inputs.length} mục từ ${parseResult.fileName} vào Inbox — chưa ghi sổ.`,
      );
      router.push("/inbox");
    } catch {
      setError("Không lưu được vào Inbox. Thử lại.");
      setPhase("error");
      setCommitting(false);
    }
  }

  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
      primaryAction={{
        label: "Inbox",
        href: "/inbox",
        icon: "inbox",
      }}
      notice={notice}
    >
      <main className="dashboard capture-workspace capture-upload-workspace">
        <section className="transactions-title-row capture-title-row">
          <div>
            <p className="eyebrow">
              <Link className="capture-paste-back" href="/capture">
                ← Capture
              </Link>
            </p>
            <h1>Tải sao kê / file giao dịch</h1>
            <p>
              Kéo thả CSV (ưu tiên). Map cột ngày · số tiền · mô tả tự động —
              bạn vẫn duyệt trong Inbox trước khi ghi sổ.
            </p>
          </div>
          <div className="page-heading-actions">
            <Link className="secondary-button" href="/inbox">
              <Icon name="inbox" />
              Về Inbox
            </Link>
          </div>
        </section>

        <section
          className="panel capture-upload-panel"
          aria-labelledby="upload-heading"
        >
          <h2 id="upload-heading" className="sr-only">
            Tải file sao kê
          </h2>

          {(phase === "idle" || phase === "reading" || phase === "error") && (
            <>
              <div
                className={`capture-upload-dropzone${dragOver ? " is-dragover" : ""}${phase === "error" ? " is-error" : ""}${phase === "reading" ? " is-loading" : ""}`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                aria-describedby="upload-trust upload-limits"
                aria-busy={phase === "reading"}
              >
                <span className="capture-upload-drop-icon" aria-hidden>
                  <Icon name="upload" />
                </span>
                <p className="capture-upload-drop-title">
                  {phase === "reading"
                    ? "Đang tải lên…"
                    : "Kéo thả CSV, XLS, XLSX"}
                </p>
                <p id="upload-limits" className="capture-upload-drop-meta">
                  tối đa {formatBytes(MAX_UPLOAD_BYTES)} · không chờ hành · ưu
                  tiên CSV
                </p>
                <span className="capture-upload-or">Hoặc</span>
                <label
                  className="secondary-button capture-upload-pick"
                  htmlFor={inputId}
                >
                  Chọn file
                </label>
                <input
                  id={inputId}
                  ref={inputRef}
                  type="file"
                  className="sr-only"
                  accept={ACCEPT}
                  disabled={phase === "reading"}
                  onChange={onInputChange}
                />
              </div>

              <p id="upload-trust" className="capture-upload-trust-inline">
                <Icon name="lock" />
                <span>
                  File chỉ bạn thấy trên máy này · có thể xóa raw sau khi xử lý
                  (không lưu nội dung file, chỉ meta lô import).
                </span>
              </p>

              {fileName && phase === "error" && (
                <p className="capture-upload-file-meta" role="status">
                  <span className="font-mono">{fileName}</span>
                  {fileSize > 0 ? ` · ${formatBytes(fileSize)}` : ""}
                </p>
              )}

              {error && (
                <p className="capture-paste-error" role="alert">
                  {error}
                </p>
              )}

              {phase === "error" && (
                <div className="capture-paste-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={reset}
                  >
                    Chọn file khác
                  </button>
                  <Link className="secondary-button" href="/capture">
                    Hủy
                  </Link>
                </div>
              )}
            </>
          )}

          {phase === "preview" && parseResult && (
            <div className="capture-paste-preview capture-upload-preview">
              <p className="capture-paste-summary" role="status">
                {summary}
              </p>
              <p className="capture-upload-file-meta">
                <span className="font-mono">{parseResult.fileName}</span>
                {fileSize > 0 ? ` · ${formatBytes(fileSize)}` : ""}
                {" · "}
                {mapLabel}
              </p>
              <p className="capture-paste-preview-lead">
                Xem trước tối đa {PREVIEW_LIMIT} dòng. Đưa vào Inbox để duyệt —
                không ghi thẳng vào sổ.
              </p>

              <ul className="capture-paste-preview-list">
                {previewRows.map((item) => (
                  <li
                    key={`${item.rowIndex}-${item.rawSnippet}`}
                    className="capture-paste-preview-row"
                  >
                    <div className="capture-paste-preview-main">
                      <span className="capture-paste-preview-merchant">
                        {item.merchant}
                        {item.uncertainFields.includes("merchant") && (
                          <span
                            className="capture-paste-uncertain-tag"
                            title="Không chắc mô tả"
                          >
                            {" "}
                            ⚠
                          </span>
                        )}
                      </span>
                      <span
                        className={`font-mono capture-paste-preview-amount ${moneyClass(item.kind)}`}
                      >
                        {item.uncertainFields.includes("amount") && (
                          <span
                            className="capture-paste-uncertain-tag"
                            title="Không chắc số tiền"
                          >
                            ⚠{" "}
                          </span>
                        )}
                        {moneySign(item.kind)}
                        {formatMoney(item.amount)}
                      </span>
                    </div>
                    <div className="capture-paste-preview-meta">
                      <span className="font-mono capture-paste-date">
                        {item.occurredOn}
                      </span>
                      <span
                        className={`preview-chip sm confidence-badge ${confidenceClass(item.confidence)}`}
                      >
                        {confidenceLabel(item.confidence)}
                      </span>
                      <span className="preview-chip sm source-badge">csv</span>
                    </div>
                    {item.explanations.length > 0 && (
                      <ul className="capture-paste-explanations">
                        {item.explanations.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              {parseResult.rows.length > PREVIEW_LIMIT && (
                <p className="capture-upload-more">
                  … và {parseResult.rows.length - PREVIEW_LIMIT} dòng nữa sẽ vào
                  Inbox khi xác nhận.
                </p>
              )}

              {error && (
                <p className="capture-paste-error" role="alert">
                  {error}
                </p>
              )}

              <div className="capture-paste-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={commitToInbox}
                  disabled={committing}
                >
                  {committing ? "Đang lưu…" : "Đưa vào Inbox"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={reset}
                  disabled={committing}
                >
                  Chọn file khác
                </button>
              </div>
              <p className="capture-paste-trust">
                <Icon name="lock" />
                <span>
                  File chỉ bạn thấy · có thể xóa meta lô import sau · không tự
                  duyệt vào sổ.
                </span>
              </p>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
