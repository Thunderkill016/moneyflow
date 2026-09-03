"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ingestShareTargetAction } from "@/app/actions/share-target-import";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import {
  addCandidatesForClient,
  addImportBatchForClient,
  getPendingCountForClient,
  markBatchCommittedForClient,
} from "@/hooks/client-inbox";
import {
  loadRulesForClient,
  persistCandidateRuleEvidenceForClient,
} from "@/hooks/client-rules";
import { applyRulesToTargets } from "@/lib/inbox/apply-rules";
import type { CreateCandidateInput } from "@/lib/inbox/candidate-store";
import {
  consumeSharePayloadFromSession,
  csvPlanToCandidates,
  hasShareContent,
  planShareRuleEvidence,
  planShareImport,
  sharePayloadFromSearchParams,
  type SharePayload,
} from "@/lib/inbox/share-payload";
import type { InboxRule } from "@/lib/inbox/rules-store";

type Phase = "loading" | "empty" | "error" | "success";

type SuccessInfo = {
  candidateCount: number;
  pasteCount: number;
  csvFileCount: number;
  warnings: string[];
};

type RuleAwareShareCandidate = CreateCandidateInput & {
  matchedRuleId?: string;
  matchedRuleVersion?: number;
};

async function persistRuleEvidence(
  isDemo: boolean,
  created: Array<{ id: string }>,
  previewed: RuleAwareShareCandidate[],
): Promise<number> {
  const results = await Promise.all(
    created.map(async (candidate, index) => {
      const match = previewed[index];
      if (!match?.matchedRuleId || !match.matchedRuleVersion) return { ok: true };
      return persistCandidateRuleEvidenceForClient(isDemo, {
        candidateId: candidate.id,
        ruleId: match.matchedRuleId,
        ruleVersion: match.matchedRuleVersion,
      });
    }),
  );
  return results.filter((result) => !result.ok).length;
}

function applyRulesForDemo(
  candidates: CreateCandidateInput[],
  rules: InboxRule[],
): RuleAwareShareCandidate[] {
  return applyRulesToTargets(
    candidates.map((candidate) => ({ ...candidate, note: candidate.note ?? "" })),
    rules,
  ) as RuleAwareShareCandidate[];
}

export function CaptureSharePage({ viewer }: { viewer: ViewerSummary }) {
  const searchParams = useSearchParams();
  const ranRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("loading");
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [inboxCount, setInboxCount] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (ranRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      // React Strict Mode can run setup -> cleanup -> setup in development.
      // Consume the one-shot only when a frame actually starts. Cleanup cancels
      // abandoned work; the replayed setup can then schedule a fresh frame.
      if (ranRef.current) return;
      ranRef.current = true;
      void (async () => {
        try {
          setInboxCount(await getPendingCountForClient(viewer.isDemo));
        } catch {
          setInboxCount(0);
        }

        let payload: SharePayload | null = null;
        try {
          payload = consumeSharePayloadFromSession();
        } catch {
          payload = null;
        }

        if (!payload || !hasShareContent(payload)) {
          const fromQuery = sharePayloadFromSearchParams(searchParams);
          if (hasShareContent(fromQuery)) payload = fromQuery;
        }

        if (!payload || !hasShareContent(payload)) {
          setPhase("empty");
          return;
        }

        try {
          const plan = planShareImport(payload);
          if (!plan.ok || plan.candidateCount === 0) {
            setErrors(
              plan.errors.length > 0
                ? plan.errors
                : ["Không tạo được ứng viên từ nội dung chia sẻ."],
            );
            setPhase("error");
            return;
          }

          let written = 0;
          let csvFileCount = 0;
          const ruleLoad = await loadRulesForClient(viewer.isDemo);
          const rules = ruleLoad.ok ? ruleLoad.rules : [];
          const ruleWarnings = ruleLoad.ok
            ? []
            : ["Không tải được quy tắc; các mục Share này vẫn chờ duyệt bình thường."];

          if (!viewer.isDemo) {
            // Authenticated Share is one server/RPC operation. A failure cannot
            // leave an earlier text/CSV prefix persisted from this share action.
            const evidence = planShareRuleEvidence(plan, rules);
            const result = await ingestShareTargetAction({
              pasteCandidates: plan.pasteCandidates.map((candidate, index) => ({
                ...candidate,
                ...(evidence.pasteCandidates[index]
                  ? {
                      appliedRuleId: evidence.pasteCandidates[index]!.ruleId,
                      appliedRuleVersion:
                        evidence.pasteCandidates[index]!.ruleVersion,
                    }
                  : {}),
              })),
              csvPlans: plan.csvPlans.map((csvPlan, planIndex) => ({
                fileName: csvPlan.fileName,
                warningCount: csvPlan.parse.warningCount,
                skippedRows: csvPlan.parse.skippedRows,
                mapConfidence: csvPlan.parse.mapConfidence,
                headers: csvPlan.parse.headers,
                columnMap: csvPlan.parse.columnMap,
                rows: csvPlan.parse.rows.map((row, rowIndex) => ({
                  ...row,
                  ...(evidence.csvPlans[planIndex]?.[rowIndex]
                    ? {
                        appliedRuleId:
                          evidence.csvPlans[planIndex]![rowIndex]!.ruleId,
                        appliedRuleVersion:
                          evidence.csvPlans[planIndex]![rowIndex]!.ruleVersion,
                      }
                    : {}),
                })),
              })),
            });
            if (!result.ok) {
              setErrors([result.message]);
              setPhase("error");
              return;
            }
            written = result.candidateCount;
            csvFileCount = plan.csvPlans.length;
          } else {
            // Demo intentionally remains local-first. It does not claim the
            // authenticated server transaction boundary.
            let evidenceFailureCount = 0;
            if (plan.pasteCandidates.length > 0) {
              const candidates = applyRulesForDemo(plan.pasteCandidates, rules);
              const pasteResult = await addCandidatesForClient(
                true,
                candidates,
              );
              if (!pasteResult.ok) {
                setErrors([pasteResult.message]);
                setPhase("error");
                return;
              }
              written += pasteResult.candidates.length;
              evidenceFailureCount += await persistRuleEvidence(
                true,
                pasteResult.candidates,
                candidates,
              );
            }

            for (const csvPlan of plan.csvPlans) {
              const batchResult = await addImportBatchForClient(true, {
                fileName: csvPlan.fileName,
                source: "csv",
                status: "parsed",
                rowCount: csvPlan.parse.rows.length,
                warningCount: csvPlan.parse.warningCount,
                skippedRows: csvPlan.parse.skippedRows,
                mapConfidence: csvPlan.parse.mapConfidence,
                headers: csvPlan.parse.headers,
                columnMap: csvPlan.parse.columnMap,
              });
              if (!batchResult.ok) {
                setErrors([batchResult.message]);
                setPhase("error");
                return;
              }
              const candidates = applyRulesForDemo(
                csvPlanToCandidates(csvPlan, batchResult.batch.id),
                rules,
              );
              const candResult = await addCandidatesForClient(true, candidates);
              if (!candResult.ok) {
                setErrors([candResult.message]);
                setPhase("error");
                return;
              }
              written += candResult.candidates.length;
              evidenceFailureCount += await persistRuleEvidence(
                true,
                candResult.candidates,
                candidates,
              );
              await markBatchCommittedForClient(true, batchResult.batch.id);
              csvFileCount += 1;
            }
            if (evidenceFailureCount > 0) {
              ruleWarnings.push(
                `${evidenceFailureCount} bằng chứng quy tắc chưa lưu được; hãy kiểm tra lại Inbox.`,
              );
            }
          }

          const pending = await getPendingCountForClient(viewer.isDemo);
          setInboxCount(pending);
          setSuccess({
            candidateCount: written,
            pasteCount: plan.pasteCandidates.length,
            csvFileCount,
            warnings: [...plan.warnings, ...plan.errors, ...ruleWarnings],
          });
          setNotice(
            `Đã đưa ${written} mục vào Inbox từ chia sẻ — chưa ghi sổ.`,
          );
          setPhase("success");

          window.setTimeout(() => {
            window.location.replace("/inbox");
          }, 1400);
        } catch {
          setErrors(["Lỗi khi xử lý nội dung chia sẻ. Thử lại từ app nguồn."]);
          setPhase("error");
        }
      })();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [searchParams, viewer.isDemo]);

  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
      primaryAction={{ label: "Inbox", href: "/inbox", icon: "inbox" }}
      notice={notice}
    >
      <main className="dashboard capture-workspace capture-share-workspace">
        <section className="transactions-title-row capture-title-row">
          <div>
            <p className="eyebrow">
              <Link className="capture-paste-back" href="/capture">
                ← Capture
              </Link>
            </p>
            <h1>Nhận chia sẻ</h1>
            <p>
              Nội dung từ Share sheet (PWA) được xếp vào Inbox — bạn vẫn duyệt
              trước khi ghi sổ.
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
          className="panel capture-share-panel"
          aria-labelledby="share-heading"
          aria-busy={phase === "loading"}
        >
          <h2 id="share-heading" className="sr-only">
            Kết quả nhận chia sẻ
          </h2>

          {phase === "loading" && (
            <div className="capture-share-state" role="status">
              <div className="loading-line wide" />
              <div className="loading-line" />
              <p className="capture-share-lead">Đang phân tích nội dung chia sẻ…</p>
            </div>
          )}

          {phase === "empty" && (
            <div className="capture-share-state" role="status">
              <p className="capture-share-lead">
                Chưa có nội dung chia sẻ. Từ app khác, chọn{" "}
                <strong>Chia sẻ → Money Flow</strong> (cần cài PWA), hoặc dán
                text / tải CSV.
              </p>
              <div className="capture-paste-actions">
                <Link className="primary-button" href="/capture/paste">Dán text</Link>
                <Link className="secondary-button" href="/capture/upload">Tải sao kê</Link>
                <Link className="secondary-button" href="/capture">Menu Capture</Link>
              </div>
              <p className="capture-upload-trust-inline">
                <Icon name="lock" />
                <span>
                  Share target chỉ hoạt động khi app được cài (Add to Home
                  Screen). Không ghi thẳng vào sổ.
                </span>
              </p>
            </div>
          )}

          {phase === "error" && (
            <div className="capture-share-state" role="alert">
              <p className="capture-paste-error">
                {errors[0] ?? "Không xử lý được nội dung chia sẻ."}
              </p>
              {errors.length > 1 && (
                <ul className="capture-share-error-list">
                  {errors.slice(1).map((msg) => <li key={msg}>{msg}</li>)}
                </ul>
              )}
              <div className="capture-paste-actions">
                <Link className="primary-button" href="/capture/paste">Dán thủ công</Link>
                <Link className="secondary-button" href="/capture/upload">Tải file</Link>
                <Link className="secondary-button" href="/inbox">Về Inbox</Link>
              </div>
            </div>
          )}

          {phase === "success" && success && (
            <div className="capture-share-state" role="status">
              <p className="capture-paste-summary">
                Đã xếp <strong>{success.candidateCount}</strong> ứng viên vào Inbox
                {success.pasteCount > 0 ? ` · ${success.pasteCount} từ text` : ""}
                {success.csvFileCount > 0 ? ` · ${success.csvFileCount} file CSV` : ""}.
              </p>
              <p className="capture-share-lead">
                Đang mở Inbox để bạn duyệt — không mục nào được ghi sổ tự động.
              </p>
              {success.warnings.length > 0 && (
                <ul className="capture-share-warning-list">
                  {success.warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              )}
              <div className="capture-paste-actions">
                <Link className="primary-button" href="/inbox">Mở Inbox ngay</Link>
                <Link className="secondary-button" href="/capture">Capture khác</Link>
              </div>
              <p className="capture-upload-trust-inline">
                <Icon name="lock" />
                <span>Ứng viên độ tin cậy thấp luôn chờ bạn xác nhận trong Inbox.</span>
              </p>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}