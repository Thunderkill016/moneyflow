import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import styles from "./planning-workspace.module.css";

export function PlanningWorkspace({ children }: { children: ReactNode }) {
  return (
    <main className={styles.workspace} data-slot="planning-workspace">
      {children}
    </main>
  );
}

export function PlanningHeader({
  section,
  title,
  description,
  truthNote,
}: {
  section: string;
  title: string;
  description: ReactNode;
  truthNote?: ReactNode;
}) {
  return (
    <>
      <header className={styles.header} data-slot="planning-header">
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>
            <Link href="/dashboard" className={styles.breadcrumb}>
              Tổng quan
            </Link>
            <span aria-hidden="true">·</span>
            <span>{section}</span>
          </p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
        </div>
      </header>
      {truthNote ? (
        <Alert tone="info" className={styles.truthNote}>
          <AlertTitle>Cách MoneyFlow ghi nhận kế hoạch</AlertTitle>
          <AlertDescription>{truthNote}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

export function PlanningSummary({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section className={styles.summary} aria-label={label} data-slot="planning-summary">
      {children}
    </section>
  );
}

export function PlanningSummaryItem({
  label,
  children,
  meta,
}: {
  label: string;
  children: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className={styles.summaryItem}>
      <span className={styles.summaryLabel}>{label}</span>
      {children}
      {meta ? <small className={styles.summaryMeta}>{meta}</small> : null}
    </div>
  );
}

export function PlanningSection({
  title,
  description,
  action,
  children,
  slot,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  slot?: string;
}) {
  return (
    <section className={styles.section} data-slot={slot}>
      <div className={styles.sectionHeading}>
        <div className={styles.sectionHeadingCopy}>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export type PlanningReviewDetail = {
  label: string;
  value: ReactNode;
};

export function PlanningReviewDialog({
  open,
  onOpenChange,
  title,
  description,
  details,
  consequence,
  confirmLabel,
  confirmIntent = "primary",
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  details: PlanningReviewDetail[];
  consequence: ReactNode;
  confirmLabel: string;
  confirmIntent?: "primary" | "destructive";
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      dismissible={!pending}
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button
            ref={cancelRef}
            type="button"
            intent="secondary"
            targetSize="important"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            intent={confirmIntent}
            targetSize="important"
            pending={pending}
            pendingLabel="Đang xử lý…"
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className={styles.review} data-slot="planning-review">
        <dl className={styles.reviewSummary}>
          {details.map((detail) => (
            <div className={styles.reviewRow} key={detail.label}>
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
        <Alert tone={confirmIntent === "destructive" ? "warning" : "info"}>
          <AlertDescription>{consequence}</AlertDescription>
        </Alert>
      </div>
    </Dialog>
  );
}

export { styles as planningStyles, Button, LinkButton };
