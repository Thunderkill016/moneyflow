"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import {
  addImportBatchForClient,
  getPendingCountForClient,
} from "@/lib/inbox/client-inbox";
import { writeImportDraft } from "@/lib/inbox/import-draft-store";
import {
  MAX_UPLOAD_BYTES,
  parseCsvStatement,
  validateUploadFile,
  type ImportCandidateSource,
} from "@/lib/inbox/parse-csv";
import { parsePdfStatement } from "@/lib/inbox/parse-pdf";
import { parseXlsxStatement } from "@/lib/inbox/parse-xlsx";

type Phase = "idle" | "reading" | "error";

const ACCEPT =
  ".csv,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function CaptureUploadPage({ viewer }: { viewer: ViewerSummary }) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getPendingCountForClient(viewer.isDemo).then((count) => {
      if (!cancelled) setInboxCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [viewer.isDemo]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const reset = useCallback(() => {
    setPhase("idle");
    setError("");
    setFileName("");
    setFileSize(0);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setError("");
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

      setPhase("reading");
      try {
        const kind = check.kind;
        const source: ImportCandidateSource =
          kind === "xlsx" ? "xlsx" : kind === "pdf" ? "pdf" : "csv";

        let result;
        if (kind === "xlsx") {
          result = parseXlsxStatement(await file.arrayBuffer(), {
            fileName: file.name,
          });
        } else if (kind === "pdf") {
          result = parsePdfStatement(await file.arrayBuffer(), {
            fileName: file.name,
          });
        } else {
          result = parseCsvStatement(await file.text(), {
            fileName: file.name,
          });
        }

        if (!result.ok || result.rows.length === 0) {
          setPhase("error");
          setError(
            result.error ??
              (kind === "xlsx"
                ? "Không phân tích được Excel (chỉ sheet đầu)."
                : kind === "pdf"
                  ? "Không phân tích được PDF text-layer."
                  : "Không phân tích được CSV."),
          );
          return;
        }

        // Gate: create batch + draft rows, then Import Preview before Inbox.
        const batchResult = await addImportBatchForClient(viewer.isDemo, {
          fileName: result.fileName,
          source,
          status: "parsed",
          rowCount: result.rows.length,
          warningCount: result.warningCount,
          skippedRows: result.skippedRows,
          mapConfidence: result.mapConfidence,
          headers: result.headers,
          columnMap: result.columnMap,
        });
        if (!batchResult.ok) {
          setPhase("error");
          setError(batchResult.message);
          return;
        }
        writeImportDraft(batchResult.batch.id, result.rows);
        router.push(`/imports/${batchResult.batch.id}/preview`);
      } catch {
        setPhase("error");
        setError(
          "Không đọc được file. Thử CSV UTF-8, .xlsx, hoặc PDF text-layer (≤10MB).",
        );
      }
    },
    [router, viewer.isDemo],
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

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(true);
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
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
              Kéo thả CSV, Excel (.xlsx/.xls — sheet đầu), hoặc PDF text-layer
              (mẫu MF DEMO BANK). Sau khi parse, bạn xem map cột và preview
              trước khi đưa vào Inbox — không ghi thẳng vào sổ. Chưa hỗ trợ OCR
              ảnh quét.
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
                ? "Đang phân tích…"
                : "Kéo thả CSV, XLS, XLSX, PDF"}
            </p>
            <p id="upload-limits" className="capture-upload-drop-meta">
              tối đa {formatBytes(MAX_UPLOAD_BYTES)} · không chờ hành · CSV /
              Excel (sheet đầu) / PDF text-layer · bước tiếp theo: Import
              Preview
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
              File chỉ bạn thấy trên máy này · preview map cột trước khi vào
              Inbox · không lưu nội dung file thô, chỉ meta + draft parse.
            </span>
          </p>

          {fileName && phase === "error" && (
            <p className="capture-upload-file-meta" role="status">
              <span className="font-mono">{fileName}</span>
              {fileSize > 0 ? ` · ${formatBytes(fileSize)}` : ""}
            </p>
          )}

          {phase === "reading" && fileName && (
            <p className="capture-upload-file-meta" role="status">
              Đang mở <span className="font-mono">{fileName}</span>
              {fileSize > 0 ? ` · ${formatBytes(fileSize)}` : ""}…
            </p>
          )}

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
              <Link className="secondary-button" href="/capture">
                Hủy
              </Link>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
