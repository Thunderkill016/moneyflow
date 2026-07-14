"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import {
  addCandidatesForClient,
  getPendingCountForClient,
} from "@/lib/inbox/client-inbox";
import { applyRulesToParsed } from "@/lib/inbox/apply-rules";
import {
  SOURCE_HINT_LABELS,
  parsePasteText,
  toCreateCandidateInputs,
  type ParsedCandidate,
  type PasteSourceHint,
} from "@/lib/inbox/parse-text";
import { readStoredRules } from "@/lib/inbox/rules-store";
import { formatMoney } from "@/lib/money";

type Phase = "edit" | "preview" | "error";

const SOURCE_HINTS: PasteSourceHint[] = ["auto", "sms", "wallet", "other"];

function moneySign(kind: ParsedCandidate["kind"]): string {
  if (kind === "income") return "+";
  if (kind === "transfer") return "↔ ";
  return "−";
}

function moneyClass(kind: ParsedCandidate["kind"]): string {
  if (kind === "income") return "positive";
  if (kind === "transfer") return "transfer";
  return "negative";
}

function confidenceLabel(confidence: ParsedCandidate["confidence"]): string {
  if (confidence === "high") return "Khá chắc";
  if (confidence === "medium") return "Tạm ổn";
  return "Cần xem";
}

function confidenceClass(confidence: ParsedCandidate["confidence"]): string {
  if (confidence === "high") return "ok";
  if (confidence === "medium") return "warning";
  return "danger";
}

export function CapturePastePage({ viewer }: { viewer: ViewerSummary }) {
  const router = useRouter();
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [text, setText] = useState("");
  const [sourceHint, setSourceHint] = useState<PasteSourceHint>("auto");
  /** Apply local contains→category rules after parse (TASK-014). Default on. */
  const [applyRules, setApplyRules] = useState(true);
  const [phase, setPhase] = useState<Phase>("edit");
  const [candidates, setCandidates] = useState<ParsedCandidate[]>([]);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    textareaRef.current?.focus();
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

  const summary = useMemo(() => {
    if (candidates.length === 0) return "";
    const reviewPart =
      needsReviewCount > 0 ? ` · ${needsReviewCount} cần xem` : "";
    return `Tìm thấy ${candidates.length} giao dịch${reviewPart}`;
  }, [candidates.length, needsReviewCount]);

  function analyze() {
    setAnalyzing(true);
    setError("");
    // Keep UI responsive for large pastes
    window.requestAnimationFrame(() => {
      try {
        const result = parsePasteText(text, { sourceHint });
        if (!result.ok || result.candidates.length === 0) {
          setPhase("error");
          setCandidates([]);
          setNeedsReviewCount(0);
          setError(result.error ?? "Không phân tích được nội dung.");
          setAnalyzing(false);
          return;
        }
        let next = result.candidates;
        if (applyRules) {
          try {
            next = applyRulesToParsed(next, readStoredRules());
          } catch {
            /* keep unparsed-category candidates if rules store fails */
          }
        }
        setCandidates(next);
        setNeedsReviewCount(result.needsReviewCount);
        setPhase("preview");
        setError("");
      } catch {
        setPhase("error");
        setCandidates([]);
        setError("Lỗi khi phân tích. Thử lại với đoạn ngắn hơn.");
      } finally {
        setAnalyzing(false);
      }
    });
  }

  function backToEdit() {
    setPhase("edit");
    setError("");
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function commitToInbox() {
    if (candidates.length === 0 || committing) return;
    setCommitting(true);
    setError("");
    try {
      const inputs = toCreateCandidateInputs(candidates);
      const result = await addCandidatesForClient(viewer.isDemo, inputs);
      if (!result.ok) {
        setError(result.message);
        setPhase("error");
        setCommitting(false);
        return;
      }
      const pending = await getPendingCountForClient(viewer.isDemo);
      setInboxCount(pending);
      setNotice(`Đã đưa ${inputs.length} mục vào Inbox — chưa ghi sổ.`);
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
      <main className="dashboard capture-workspace capture-paste-workspace">
        <section className="transactions-title-row capture-title-row">
          <div>
            <p className="eyebrow">
              <Link className="capture-paste-back" href="/capture">
                ← Capture
              </Link>
            </p>
            <h1>Dán bất cứ thứ gì</h1>
            <p>
              Tin nhắn biến động, ghi chú tay, hoặc “cafe 45k”. Phân tích xong bạn
              vẫn duyệt trong Inbox — không ghi thẳng vào sổ.
            </p>
          </div>
          <div className="page-heading-actions">
            <Link className="secondary-button" href="/inbox">
              <Icon name="inbox" />
              Về Inbox
            </Link>
          </div>
        </section>

        <section className="panel capture-paste-panel" aria-labelledby="paste-heading">
          <h2 id="paste-heading" className="sr-only">
            Dán text để phân tích
          </h2>

          {(phase === "edit" || phase === "error") && (
            <>
              <label className="capture-paste-label" htmlFor={textareaId}>
                Nội dung
              </label>
              <textarea
                id={textareaId}
                ref={textareaRef}
                className="capture-paste-textarea"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  if (phase === "error") {
                    setPhase("edit");
                    setError("");
                  }
                }}
                rows={8}
                placeholder={"VD: cafe 45k tiền mặt\nhoặc nguyên tin nhắn biến động số dư"}
                disabled={analyzing}
                aria-invalid={phase === "error"}
                aria-describedby={error ? "paste-error" : "paste-hint"}
              />
              <p id="paste-hint" className="capture-paste-hint">
                Mỗi dòng một giao dịch càng tốt. Số tiền: 45k, 45.000, 1.5tr…
              </p>

              <fieldset className="capture-paste-source">
                <legend>Nguồn gợi ý</legend>
                <div className="capture-paste-source-options" role="radiogroup" aria-label="Nguồn gợi ý">
                  {SOURCE_HINTS.map((hint) => (
                    <label key={hint} className="capture-paste-source-option">
                      <input
                        type="radio"
                        name="source-hint"
                        value={hint}
                        checked={sourceHint === hint}
                        onChange={() => setSourceHint(hint)}
                        disabled={analyzing}
                      />
                      <span>{SOURCE_HINT_LABELS[hint]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="capture-paste-apply-rules">
                <input
                  type="checkbox"
                  checked={applyRules}
                  onChange={(event) => setApplyRules(event.target.checked)}
                  disabled={analyzing}
                />
                <span>
                  Áp dụng quy tắc danh mục{" "}
                  <Link className="capture-paste-rules-link" href="/rules">
                    (Quản lý)
                  </Link>
                </span>
              </label>

              {error && (
                <p id="paste-error" className="capture-paste-error" role="alert">
                  {error}
                </p>
              )}

              <div className="capture-paste-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={analyze}
                  disabled={analyzing || !text.trim()}
                >
                  {analyzing ? "Đang phân tích…" : "Phân tích"}
                </button>
                <Link className="secondary-button" href="/capture">
                  Hủy
                </Link>
              </div>
            </>
          )}

          {phase === "preview" && (
            <div className="capture-paste-preview">
              <p className="capture-paste-summary" role="status">
                {summary}
              </p>
              <p className="capture-paste-preview-lead">
                Đây chỉ là gợi ý. Các trường không chắc được đánh dấu — kiểm tra
                trong Inbox trước khi duyệt vào sổ.
              </p>

              <ul className="capture-paste-preview-list">
                {candidates.map((item, index) => (
                  <li
                    key={`${item.rawSnippet}-${index}`}
                    className="capture-paste-preview-row"
                  >
                    <div className="capture-paste-preview-main">
                      <span className="capture-paste-preview-merchant">
                        {item.merchant}
                        {item.uncertainFields.includes("merchant") && (
                          <span className="capture-paste-uncertain-tag" title="Không chắc merchant">
                            ⚠
                          </span>
                        )}
                      </span>
                      <span
                        className={`font-mono capture-paste-preview-amount ${moneyClass(item.kind)}`}
                      >
                        {item.uncertainFields.includes("amount") && (
                          <span className="capture-paste-uncertain-tag" title="Không chắc số tiền">
                            ⚠{" "}
                          </span>
                        )}
                        {moneySign(item.kind)}
                        {formatMoney(item.amount)}
                      </span>
                    </div>
                    <div className="capture-paste-preview-meta">
                      <span className="font-mono capture-paste-date">{item.occurredOn}</span>
                      <span
                        className={`preview-chip sm confidence-badge ${confidenceClass(item.confidence)}`}
                      >
                        {confidenceLabel(item.confidence)}
                      </span>
                      <span className="preview-chip sm source-badge">paste</span>
                      {item.category && (
                        <span className="preview-chip sm category-badge" title={item.matchedRuleSummary}>
                          {item.category}
                        </span>
                      )}
                    </div>
                    {item.explanations.length > 0 && (
                      <ul className="capture-paste-explanations">
                        {item.explanations.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    )}
                    {item.rawSnippet && (
                      <p className="capture-paste-raw">
                        <span className="sr-only">Gốc: </span>
                        {item.rawSnippet}
                      </p>
                    )}
                  </li>
                ))}
              </ul>

              <div className="capture-paste-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={commitToInbox}
                  disabled={committing}
                >
                  {committing ? "Đang lưu…" : "Vào Inbox"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={backToEdit}
                  disabled={committing}
                >
                  Sửa text
                </button>
              </div>
              <p className="capture-paste-trust">
                <Icon name="lock" />
                <span>
                  Không có nút “ghi thẳng vào sổ” từ đây — mọi mục đều chờ bạn duyệt.
                </span>
              </p>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
