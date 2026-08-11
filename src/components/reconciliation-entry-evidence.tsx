import { Icon } from "@/components/icons";
import {
  reconciliationImportEvidenceLabel,
  type ReconciliationImportEvidence,
} from "@/lib/reconciliation-import-evidence";
import styles from "./reconciliation-entry-evidence.module.css";

export function ReconciliationEntryEvidence({
  evidence,
  currentNote,
  exactDifferenceCandidate,
}: {
  evidence: ReconciliationImportEvidence | null;
  currentNote: string;
  exactDifferenceCandidate: boolean;
}) {
  if (!evidence && !exactDifferenceCandidate) return null;

  const originalDescription = evidence?.originalDescription.trim() ?? "";
  const showOriginalDescription =
    Boolean(originalDescription) && originalDescription !== currentNote.trim();

  return (
    <div className={styles.stack}>
      {evidence ? (
        <div className={styles.sourceEvidence} data-import-evidence="true">
          <Icon name="imports" aria-hidden="true" />
          <span className={styles.copy}>
            <strong>Nguồn nhập · {reconciliationImportEvidenceLabel(evidence)}</strong>
            {showOriginalDescription ? (
              <small>Nội dung gốc: {originalDescription}</small>
            ) : null}
          </span>
        </div>
      ) : null}

      {exactDifferenceCandidate ? (
        <div
          className={styles.exactHint}
          data-exact-difference-candidate="true"
          role="note"
        >
          <Icon name="search" aria-hidden="true" />
          <span className={styles.copy}>
            <strong>Kiểm tra giao dịch này</strong>
            <small>
              Chênh lệch hiện tại đúng bằng tác động của giao dịch này. Hãy đối
              chiếu sao kê trước khi đánh dấu đã khớp.
            </small>
          </span>
        </div>
      ) : null}
    </div>
  );
}
