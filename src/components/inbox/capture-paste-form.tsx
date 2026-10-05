"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import type { ToastTone } from "@/components/ui/toast";
import {
  addCandidatesForClient,
  getPendingCountForClient,
} from "@/hooks/client-inbox";
import {
  loadRulesForClient,
  persistCandidateRuleEvidenceForClient,
} from "@/hooks/client-rules";
import { applyRulesToParsed } from "@/lib/inbox/apply-rules";
import {
  SOURCE_HINT_LABELS,
  parsePasteText,
  toCreateCandidateInputs,
  type ParsedCandidate,
  type PasteSourceHint,
} from "@/lib/inbox/parse-text";
import type { InboxRule } from "@/lib/inbox/rules-store";
import { SelectField } from "@/components/ui/select-field";
import { Button, LinkButton } from "@/components/ui/button";
import { maskSnippetForDisplay } from "@/lib/mask-account";
import { formatMoney } from "@/lib/money";
import type { AccountOption } from "@/lib/sample-data";
import { trackProductEvent } from "@/lib/safe-analytics";
import styles from "./capture-paste-page.module.css";

type Phase = "edit" | "preview" | "error";
type RuleAwareParsedCandidate = ParsedCandidate & {
  categoryId?: string;
  matchedRuleVersion?: number;
};

const SOURCE_HINTS: PasteSourceHint[] = ["auto", "sms", "wallet", "other"];

function moneySign(kind: ParsedCandidate["kind"]): string {
  if (kind === "income") return "+";
  if (kind === "transfer") return "↔ ";
  return "−";
}

function confidenceLabel(confidence: ParsedCandidate["confidence"]): string {
  if (confidence === "high") return "Khá chắc";
  if (confidence === "medium") return "Tạm ổn";
  return "Cần xem";
}

/** Shared evidence capture: standalone paste route and the Ghi dialog use one parser/save owner. */
export function CapturePasteForm({
  isDemo,
  accounts,
  active = true,
  embedded = false,
  onBusyChange,
  onPendingCountChange,
}: {
  isDemo: boolean;
  accounts: AccountOption[];
  active?: boolean;
  embedded?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onPendingCountChange?: (count: number) => void;
}) {
  const router = useRouter();
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);

  const [text, setText] = useState("");
  const [sourceHint, setSourceHint] = useState<PasteSourceHint>("auto");
  const [applyRules, setApplyRules] = useState(true);
  const [rules, setRules] = useState<InboxRule[]>([]);
  const [rulesReady, setRulesReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("edit");
  const [candidates, setCandidates] = useState<RuleAwareParsedCandidate[]>([]);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<ToastTone | undefined>(
    undefined,
  );
  const [accountId, setAccountId] = useState("");

  function showNotice(message: string, tone: ToastTone) {
    setNotice(message);
    setNoticeTone(tone);
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getPendingCountForClient(isDemo),
      loadRulesForClient(isDemo),
    ]).then(([count, ruleResult]) => {
      if (cancelled) return;
      onPendingCountChange?.(count);
      if (ruleResult.ok) {
        setRules(ruleResult.rules);
      } else {
        showNotice(
          "Chưa tải được quy tắc; bạn vẫn có thể phân tích và duyệt thủ công.",
          "warning",
        );
      }
      setRulesReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isDemo, onPendingCountChange]);

  useEffect(() => {
    if (!active) return;
    if (phase === "preview") summaryRef.current?.focus();
    else textareaRef.current?.focus();
  }, [active, phase]);

  useEffect(() => {
    onBusyChange?.(analyzing || committing);
  }, [analyzing, committing, onBusyChange]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => {
      setNotice("");
      setNoticeTone(undefined);
    }, 3600);
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
        let next = result.candidates as RuleAwareParsedCandidate[];
        if (applyRules && rulesReady) {
          next = applyRulesToParsed(next, rules) as RuleAwareParsedCandidate[];
        }
        setCandidates(next);
        setNeedsReviewCount(result.needsReviewCount);
        setPhase("preview");
        setError("");
        trackProductEvent("paste_analyzed", {
          candidate_count: next.length,
          needs_review_count: result.needsReviewCount,
          source_hint: sourceHint,
          apply_rules: applyRules && rulesReady,
        });
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
      const selectedAccount = accounts.find((item) => item.id === accountId);
      const inputs = toCreateCandidateInputs(candidates, {
        account: selectedAccount
          ? { id: selectedAccount.id, name: selectedAccount.name }
          : undefined,
      });
      const result = await addCandidatesForClient(isDemo, inputs);
      if (!result.ok) {
        setError(result.message);
        setPhase("error");
        setCommitting(false);
        return;
      }

      const evidenceResults = await Promise.all(
        result.candidates.map(async (created, index) => {
          const previewed = candidates[index];
          if (!previewed?.matchedRuleId || !previewed.matchedRuleVersion) {
            return { ok: true as const };
          }
          return persistCandidateRuleEvidenceForClient(isDemo, {
            candidateId: created.id,
            ruleId: previewed.matchedRuleId,
            ruleVersion: previewed.matchedRuleVersion,
          });
        }),
      );
      const evidenceFailureCount = evidenceResults.filter(
        (item) => !item.ok,
      ).length;

      const pending = await getPendingCountForClient(isDemo);
      onPendingCountChange?.(pending);
      trackProductEvent("paste_committed", {
        candidate_count: inputs.length,
        source: "paste",
        source_hint: sourceHint,
        rule_evidence_failures: evidenceFailureCount,
      });
      // Both Ghi and the standalone route lead to the existing pending-review owner.
      router.push("/inbox");
    } catch {
      setError("Không lưu được vào Inbox. Thử lại.");
      setPhase("error");
      setCommitting(false);
    }
  }

  return (
    <section
      className={embedded ? styles.inlinePanel : styles.panel}
      aria-label="Dán giao dịch"
    >
      {embedded && (
        <p className={styles.lead}>
          Dán tin nhắn, thông báo thanh toán hoặc ghi chú. Xem trước rồi đưa vào
          chờ duyệt.
        </p>
      )}
      {notice && (
        <p className={styles.hint} role="status" data-tone={noticeTone}>
          {notice}
        </p>
      )}
      <h2 id="paste-heading" className="sr-only">
        Dán text để phân tích
      </h2>

      {(phase === "edit" || phase === "error") && (
        <>
          <label className={styles.label} htmlFor={textareaId}>
            Nội dung
          </label>
          <textarea
            id={textareaId}
            ref={textareaRef}
            className={`capture-paste-textarea ${styles.textarea}`}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (phase === "error") {
                setPhase("edit");
                setError("");
              }
            }}
            rows={5}
            placeholder={
              "VD: cafe 45k tiền mặt\nhoặc nguyên tin nhắn biến động số dư"
            }
            disabled={analyzing}
            aria-invalid={phase === "error"}
            aria-describedby={error ? "paste-hint paste-error" : "paste-hint"}
          />
          <p id="paste-hint" className={styles.hint}>
            Mỗi dòng một giao dịch càng tốt. Số tiền: 45k, 45.000, 1.5tr…
          </p>

          <details className={styles.options}>
            <summary>Tùy chọn phân tích</summary>
            <fieldset className={styles.source}>
              <legend>Nguồn gợi ý</legend>
              <div
                className={styles.sourceOptions}
                role="radiogroup"
                aria-label="Nguồn gợi ý"
              >
                {SOURCE_HINTS.map((hint) => (
                  <label
                    key={hint}
                    className={`capture-paste-source-option ${styles.sourceOption}`}
                  >
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

            <div className={styles.rules}>
              <label className={styles.ruleOption}>
                <input
                  type="checkbox"
                  checked={applyRules}
                  onChange={(event) => setApplyRules(event.target.checked)}
                  disabled={analyzing || !rulesReady}
                />
                <span>
                  {rulesReady
                    ? "Áp dụng quy tắc danh mục"
                    : "Đang tải quy tắc…"}
                </span>
              </label>
              <Link className={styles.rulesLink} href="/rules">
                Quản lý quy tắc
              </Link>
            </div>
          </details>

          {error && (
            <p id="paste-error" className={styles.error} role="alert">
              {error}
            </p>
          )}

          <div className={styles.actions}>
            <Button
              type="button"
              intent="primary"
              targetSize="important"
              onClick={analyze}
              disabled={analyzing || !text.trim()}
            >
              {analyzing ? "Đang phân tích…" : "Phân tích"}
            </Button>
            {!embedded && (
              <LinkButton
                intent="secondary"
                targetSize="important"
                href="/capture"
              >
                Hủy
              </LinkButton>
            )}
          </div>
        </>
      )}

      {phase === "preview" && (
        <div className={styles.preview}>
          <p
            ref={summaryRef}
            tabIndex={-1}
            className={styles.summary}
            role="status"
          >
            {summary}
          </p>
          <p className={styles.lead}>
            Đây chỉ là gợi ý. Các trường không chắc được đánh dấu — kiểm tra
            trong Inbox trước khi duyệt vào sổ.
          </p>

          <ul className={styles.previewList}>
            {candidates.map((item, index) => (
              <li
                key={`${item.rawSnippet}-${index}`}
                className={`capture-paste-preview-row ${styles.previewRow}`}
              >
                <div className={styles.previewMain}>
                  <span className={styles.merchant}>
                    {item.merchant}
                    {item.uncertainFields.includes("merchant") && (
                      <span
                        className={styles.uncertain}
                        title="Không chắc merchant"
                      >
                        <span aria-hidden="true">⚠</span>
                        <span className="sr-only">
                          {" "}
                          — Cần kiểm tra nơi giao dịch
                        </span>
                      </span>
                    )}
                  </span>
                  <span
                    className={`capture-paste-preview-amount ${styles.amount}`}
                    data-kind={item.kind}
                  >
                    {item.uncertainFields.includes("amount") && (
                      <span
                        className={styles.uncertain}
                        title="Không chắc số tiền"
                      >
                        <span aria-hidden="true">⚠ </span>
                        <span className="sr-only">Cần kiểm tra số tiền: </span>
                      </span>
                    )}
                    {moneySign(item.kind)}
                    {formatMoney(item.amount)}
                  </span>
                </div>
                <div className={styles.meta}>
                  <span>{item.occurredOn}</span>
                  <span
                    className={styles.confidence}
                    data-confidence={item.confidence}
                  >
                    {confidenceLabel(item.confidence)}
                  </span>
                  <span>Nội dung dán</span>
                  {item.category && (
                    <span
                      className={styles.category}
                      title={item.matchedRuleSummary}
                    >
                      {item.category}
                      {item.matchedRuleVersion
                        ? ` · v${item.matchedRuleVersion}`
                        : ""}
                    </span>
                  )}
                </div>
                {item.explanations.length > 0 && (
                  <ul className={styles.explanations}>
                    {item.explanations.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                )}
                {item.rawSnippet && (
                  <p className={styles.raw}>
                    <span>Gốc: </span>
                    {maskSnippetForDisplay(item.rawSnippet)}
                  </p>
                )}
              </li>
            ))}
          </ul>

          <SelectField
            label="Các mục này thuộc tài khoản"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            disabled={committing}
            targetSize="important"
          >
            <option value="">Chọn sau trong Inbox</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
                {account.currencyCode && account.currencyCode !== "VND"
                  ? ` (${account.currencyCode})`
                  : ""}
              </option>
            ))}
          </SelectField>

          <div className={styles.actions}>
            <Button
              type="button"
              intent="primary"
              targetSize="important"
              onClick={commitToInbox}
              disabled={committing}
            >
              {committing ? "Đang lưu…" : "Vào Inbox"}
            </Button>
            <Button
              type="button"
              intent="secondary"
              targetSize="important"
              onClick={backToEdit}
              disabled={committing}
            >
              Sửa nội dung
            </Button>
          </div>
          <p className={styles.trust}>
            <Icon name="lock" />
            <span>
              Không có nút “ghi thẳng vào sổ” từ đây — mọi mục đều chờ bạn
              duyệt.
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
