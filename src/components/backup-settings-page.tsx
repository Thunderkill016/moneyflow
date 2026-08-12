"use client";

import { useRouter } from "next/navigation";
import {
  createArchiveBackupAction,
  restoreArchiveAction,
} from "@/app/actions/archive";
import { useId, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  ARCHIVE_MAX_RESTORE_BYTES,
  backupFileName,
  describeBackupFailure,
  describeIngressRejection,
  describeRestoreFailure,
  describeTransportLimit,
  serializeArchive,
  summarizeArchive,
  type ArchiveSummary,
} from "@/lib/archive/archive-backup";
import { ingestArchiveBytes } from "@/lib/archive/archive-ingress";
import type { MoneyFlowArchive } from "@/lib/archive/moneyflow-archive";
import styles from "./settings/settings-surfaces.module.css";

/**
 * Complete MoneyFlow backup and restore.
 *
 * Deliberately separate from `/settings/export`, which stays a date-range
 * *report* of transactions and Inbox rows. Merging the two would let someone
 * reach for the CSV they already know and believe they held a recoverable
 * backup.
 *
 * ## Transport
 *
 * Both calls go through server actions, because that is the boundary this
 * repository enforces: `check:architecture` forbids `src/components` from
 * importing Supabase, and no hook here talks to it either. Opening a
 * browser→database channel for one feature would have been convenient — the RPCs
 * are designed to be called that way — but the contract wins.
 *
 * That choice has a measured cost, stated rather than hidden: server action
 * requests cap at 1 MB by default and the hosting platform caps serverless
 * request bodies near 4.5 MB, so `bodySizeLimit` is raised to 4 MB and a larger
 * archive is refused here, up front, instead of failing mid-upload with an
 * opaque platform error. R8 still reads up to 64 MiB; this is transport, not
 * parsing.
 *
 * ## Restore state machine
 *
 * idle → validating → rejected (nothing written)
 * idle → validating → confirming → restoring → restored
 * restoring → failed (the database rolls the whole restore back)
 *
 * Validation and mutation are never the same button press.
 */

type RestoreState =
  | { kind: "idle" }
  | { kind: "validating" }
  | { kind: "rejected"; message: string }
  | { kind: "confirming"; archive: MoneyFlowArchive; summary: ArchiveSummary }
  | { kind: "restoring"; archive: MoneyFlowArchive; summary: ArchiveSummary }
  | { kind: "restored" }
  | { kind: "failed"; message: string };

type BackupState =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "done"; fileName: string }
  | { kind: "failed"; message: string };

function formatProducedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function BackupSettingsPage({
  viewer,
}: {
  viewer: { isDemo: boolean };
}) {
  const router = useRouter();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<BackupState>({ kind: "idle" });
  const [restore, setRestore] = useState<RestoreState>({ kind: "idle" });
  // A ref, not state: a second click must be refused before React re-renders.
  const busy = useRef(false);

  const demo = viewer.isDemo;

  async function handleBackup() {
    if (demo || busy.current) return;
    busy.current = true;
    setBackup({ kind: "working" });
    try {
      // The action validates the RPC result against the archive contract before
      // returning it, so a 200 from the database can never become a broken file
      // in someone's downloads folder.
      const result = await createArchiveBackupAction();
      if (!result.ok) {
        setBackup({ kind: "failed", message: describeBackupFailure(result.kind) });
        return;
      }
      const fileName = backupFileName(result.archive.produced_at);
      const blob = new Blob([serializeArchive(result.archive)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      setBackup({ kind: "done", fileName });
    } catch {
      setBackup({ kind: "failed", message: describeBackupFailure("unexpected") });
    } finally {
      busy.current = false;
    }
  }

  async function handleFile(file: File | undefined) {
    if (demo || !file || busy.current) return;
    busy.current = true;
    setRestore({ kind: "validating" });
    try {
      // Bytes, never file.text(): the filename, extension and browser-reported
      // MIME type are hints, never evidence, so the file crosses exactly one
      // untrusted-input boundary.
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.byteLength > ARCHIVE_MAX_RESTORE_BYTES) {
        // Refused before upload: the platform would otherwise reject the request
        // mid-flight with an error no user could act on.
        setRestore({ kind: "rejected", message: describeTransportLimit() });
        return;
      }
      const result = ingestArchiveBytes(bytes);
      if (!result.ok) {
        setRestore({ kind: "rejected", message: describeIngressRejection(result.code) });
        return;
      }
      setRestore({
        kind: "confirming",
        archive: result.archive,
        summary: summarizeArchive(result.archive),
      });
    } catch {
      setRestore({
        kind: "rejected",
        message: "Không đọc được tệp. Không có dữ liệu nào bị thay đổi.",
      });
    } finally {
      busy.current = false;
    }
  }

  async function handleConfirmRestore() {
    if (restore.kind !== "confirming" || busy.current) return;
    busy.current = true;
    const { archive, summary } = restore;
    setRestore({ kind: "restoring", archive, summary });
    try {
      // The validated archive goes through untouched: no field is stripped,
      // added, renumbered or coerced between validation and the database.
      const result = await restoreArchiveAction(archive);
      if (!result.ok) {
        setRestore({
          kind: "failed",
          message:
            result.kind === "too_large_to_transport"
              ? describeTransportLimit()
              : describeRestoreFailure(result.kind),
        });
        return;
      }
      setRestore({ kind: "restored" });
      // A successful call is not a correct screen. The action revalidates the
      // whole tree; navigating away completes the job before the user can look
      // at pre-restore numbers.
      router.refresh();
      router.push("/dashboard");
    } catch {
      setRestore({ kind: "failed", message: describeRestoreFailure("unexpected") });
    } finally {
      busy.current = false;
    }
  }

  function resetRestore() {
    setRestore({ kind: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div>
      <header>
        <h1>Bản sao lưu MoneyFlow</h1>
        <p className={styles.panelLead}>
          Bản sao lưu chứa toàn bộ dữ liệu tài khoản của bạn và có thể khôi phục lại được. Khác
          với mục <strong>Xuất giao dịch và Inbox</strong>, vốn chỉ là bản xuất báo cáo theo
          khoảng ngày.
        </p>
      </header>

      {demo ? (
        <Alert tone="info">
          <AlertTitle>Chế độ dùng thử chưa có sao lưu đầy đủ</AlertTitle>
          <AlertDescription>
            Sao lưu và khôi phục toàn bộ dữ liệu chỉ hoạt động với tài khoản đã đăng nhập. Bạn
            vẫn có thể dùng mục Xuất giao dịch và Inbox.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className={styles.panel} aria-labelledby="backup-heading">
        <h2 id="backup-heading">Tạo bản sao lưu</h2>
        <p>
          Tải về một tệp JSON chứa toàn bộ tài khoản, danh mục, giao dịch, ngân sách, mục tiêu và
          dữ liệu Inbox của bạn. Tệp không chứa mật khẩu hay khóa đăng nhập.
        </p>
        <Button
          type="button"
          intent="primary"
          targetSize="important"
          onClick={handleBackup}
          disabled={demo || backup.kind === "working"}
          data-testid="create-backup"
        >
          {backup.kind === "working" ? "Đang tạo bản sao lưu…" : "Tải bản sao lưu"}
        </Button>

        <div role="status" aria-live="polite" className={styles.summary}>
          {backup.kind === "working" ? <p>Đang tạo bản sao lưu…</p> : null}
          {backup.kind === "done" ? (
            <Alert tone="success">
              <AlertTitle>Đã tải bản sao lưu</AlertTitle>
              <AlertDescription>Tệp: {backup.fileName}</AlertDescription>
            </Alert>
          ) : null}
          {backup.kind === "failed" ? (
            <Alert tone="error">
              <AlertTitle>Chưa tạo được bản sao lưu</AlertTitle>
              <AlertDescription>{backup.message}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="restore-heading">
        <h2 id="restore-heading">Khôi phục từ bản sao lưu</h2>
        <Alert tone="warning">
          <AlertTitle>Khôi phục không gộp dữ liệu</AlertTitle>
          <AlertDescription>
            Khôi phục chỉ dành cho tài khoản mới, chưa có dữ liệu. Dữ liệu khởi tạo mặc định sẽ
            được thay bằng nội dung trong bản sao lưu. Dữ liệu sẽ thuộc về tài khoản bạn đang
            đăng nhập; danh tính của tài khoản cũ không được khôi phục.
          </AlertDescription>
        </Alert>

        <label htmlFor={fileInputId} className={styles.dateField}>
          <span>Chọn tệp bản sao lưu MoneyFlow (.json)</span>
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="application/json,.json"
            disabled={demo || restore.kind === "restoring" || restore.kind === "validating"}
            data-testid="restore-file"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </label>

        <div role="status" aria-live="polite" className={styles.summary}>
          {restore.kind === "validating" ? <p>Đang kiểm tra tệp…</p> : null}
          {restore.kind === "restoring" ? <p>Đang khôi phục dữ liệu…</p> : null}
          {restore.kind === "restored" ? (
            <Alert tone="success">
              <AlertTitle>Đã khôi phục xong</AlertTitle>
              <AlertDescription>Đang mở lại dữ liệu đã khôi phục…</AlertDescription>
            </Alert>
          ) : null}
          {restore.kind === "rejected" ? (
            <Alert tone="error">
              <AlertTitle>Tệp không được chấp nhận</AlertTitle>
              <AlertDescription>
                {restore.message} Không có dữ liệu nào bị thay đổi.
              </AlertDescription>
            </Alert>
          ) : null}
          {restore.kind === "failed" ? (
            <Alert tone="error">
              <AlertTitle>Khôi phục không thành công</AlertTitle>
              <AlertDescription>{restore.message}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </section>

      <Dialog
        open={restore.kind === "confirming" || restore.kind === "restoring"}
        onOpenChange={(open) => {
          // Closing mid-restore must not cancel a database transaction that is
          // already running, so the dialog only closes from the confirming step.
          if (!open && restore.kind === "confirming") resetRestore();
        }}
        title="Xác nhận khôi phục"
        description="Kiểm tra thông tin bản sao lưu trước khi khôi phục."
      >
        {restore.kind === "confirming" || restore.kind === "restoring" ? (
          <div className={styles.summary}>
            <dl className={styles.resultGrid}>
              <div className={styles.resultRow}>
                <dt>Tạo lúc</dt>
                <dd>{formatProducedAt(restore.summary.producedAt)}</dd>
              </div>
              <div className={styles.resultRow}>
                <dt>Tài khoản tiền</dt>
                <dd>{restore.summary.accounts}</dd>
              </div>
              <div className={styles.resultRow}>
                <dt>Danh mục</dt>
                <dd>{restore.summary.categories}</dd>
              </div>
              <div className={styles.resultRow}>
                <dt>Giao dịch</dt>
                <dd>{restore.summary.transactions}</dd>
              </div>
              <div className={styles.resultRow}>
                <dt>Ngân sách</dt>
                <dd>{restore.summary.budgets}</dd>
              </div>
              <div className={styles.resultRow}>
                <dt>Mục tiêu</dt>
                <dd>{restore.summary.goals}</dd>
              </div>
            </dl>
            <p>
              Thao tác này <strong>không gộp</strong> với dữ liệu hiện có và chỉ thành công trên
              tài khoản mới, chưa dùng. Nếu có lỗi, toàn bộ thao tác được hoàn tác và dữ liệu hiện
              tại giữ nguyên.
            </p>
            <div className={styles.formActions}>
              <Button
                type="button"
                intent="secondary"
                targetSize="important"
                onClick={resetRestore}
                disabled={restore.kind === "restoring"}
                data-testid="cancel-restore"
              >
                Hủy
              </Button>
              <Button
                type="button"
                intent="primary"
                targetSize="important"
                onClick={handleConfirmRestore}
                disabled={restore.kind === "restoring"}
                data-testid="confirm-restore"
              >
                {restore.kind === "restoring" ? "Đang khôi phục…" : "Khôi phục dữ liệu"}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
