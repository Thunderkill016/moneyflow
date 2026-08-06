import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import styles from "./secondary-layout.module.css";

export function SecondaryWorkspace({
  children,
  slot = "secondary-workspace",
}: {
  children: ReactNode;
  slot?: string;
}) {
  return (
    <main className={styles.workspace} data-slot={slot}>
      {children}
    </main>
  );
}

export function SecondaryHeader({
  section,
  title,
  description,
  actions,
  eyebrowHref = "/dashboard",
  eyebrowLabel = "Tổng quan",
}: {
  section: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  eyebrowHref?: string;
  eyebrowLabel?: string;
}) {
  return (
    <header className={styles.header} data-slot="secondary-header">
      <div className={styles.headerCopy}>
        <p className={styles.eyebrow}>
          <Link href={eyebrowHref} className={styles.breadcrumb}>
            {eyebrowLabel}
          </Link>
          <span aria-hidden="true">·</span>
          <span>{section}</span>
        </p>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.description}>{description}</div>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}

export function SecondarySummary({
  children,
  label,
  slot = "secondary-summary",
}: {
  children: ReactNode;
  label: string;
  slot?: string;
}) {
  return (
    <section className={styles.summary} aria-label={label} data-slot={slot}>
      {children}
    </section>
  );
}

export function SecondarySummaryItem({
  label,
  value,
  meta,
}: {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className={styles.summaryItem}>
      <span className={styles.summaryLabel}>{label}</span>
      <div className={styles.summaryValue}>{value}</div>
      {meta ? <small className={styles.summaryMeta}>{meta}</small> : null}
    </div>
  );
}

export function SecondarySection({
  title,
  description,
  action,
  children,
  slot = "secondary-section",
  contained = false,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  slot?: string;
  contained?: boolean;
}) {
  return (
    <section
      className={contained ? `${styles.section} ${styles.contained}` : styles.section}
      data-slot={slot}
    >
      <div className={styles.sectionHeading}>
        <div className={styles.sectionHeadingCopy}>
          <h2>{title}</h2>
          {description ? <div className={styles.sectionDescription}>{description}</div> : null}
        </div>
        {action ? <div className={styles.sectionAction}>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export type SecondaryReviewDetail = {
  label: string;
  value: ReactNode;
};

export function SecondaryReviewDialog({
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
  slot = "secondary-review",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  details: SecondaryReviewDetail[];
  consequence: ReactNode;
  confirmLabel: string;
  confirmIntent?: "primary" | "destructive";
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
  slot?: string;
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
      <div className={styles.review} data-slot={slot}>
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

export { styles as secondaryStyles };
