"use client";

import type { InboxCandidate } from "@/lib/inbox/candidate-store";
import { buildExplainLines, type ExplainLine } from "@/lib/inbox/review";

const KIND_LABEL: Record<ExplainLine["kind"], string> = {
  parser: "Parser",
  rule: "Rule",
  source: "Nguồn",
  raw: "Raw",
  audit: "Audit",
};

/**
 * Explain why the system guessed this candidate (wireframes §10, §12).
 */
export function InboxExplainPanel({ candidate }: { candidate: InboxCandidate }) {
  const lines = buildExplainLines(candidate);
  const raw = lines.find((line) => line.kind === "raw");
  const rest = lines.filter((line) => line.kind !== "raw");

  return (
    <section className="inbox-explain panel-inset" aria-label="Vì sao hệ thống đoán vậy">
      <h3 className="inbox-explain-title">Vì sao hệ thống đoán vậy</h3>
      <ul className="inbox-explain-list">
        {rest.map((line, index) => (
          <li key={`${line.kind}-${index}`}>
            <span className={`inbox-explain-kind kind-${line.kind}`}>{KIND_LABEL[line.kind]}</span>
            <span>{line.text}</span>
          </li>
        ))}
      </ul>
      {raw ? (
        <div className="inbox-explain-raw">
          <span className="inbox-explain-kind kind-raw">Raw</span>
          <pre className="font-mono">{raw.text}</pre>
        </div>
      ) : (
        <p className="inbox-explain-empty-raw">Không còn raw text (đã xóa hoặc không lưu).</p>
      )}
    </section>
  );
}
