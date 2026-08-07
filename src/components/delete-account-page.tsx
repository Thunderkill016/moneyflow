"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { finalizeAccountDeletion } from "@/app/(auth)/actions";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import {
  SecondaryHeader,
  SecondaryReviewDialog,
  SecondarySection,
  SecondaryWorkspace,
} from "@/components/secondary/secondary-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { ViewerSummary } from "@/components/user-chip";
import {
  clearLocalMoneyFlowStores,
  DELETE_CONFIRM_TEXT,
  isDeleteConfirmValid,
  SERVER_DELETE_READY_VI,
} from "@/lib/delete-account";
import {
  countPending,
  readStoredCandidates,
} from "@/lib/inbox/candidate-store";
import styles from "./settings/settings-surfaces.module.css";

export function DeleteAccountPage({ viewer }: { viewer: ViewerSummary }) {
  const confirmRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inboxCount, setInboxCount] = useState(0);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const confirmOk = isDeleteConfirmValid(confirmText);

  function reload() {
    try {
      setError(null);
      setInboxCount(countPending(readStoredCandidates()));
    } catch {
      setError("Không đọc được dữ liệu trên thiết bị. Thử tải lại trang.");
    }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      reload();
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function requestReview(event?: FormEvent) {
    event?.preventDefault();
    if (deleting || !confirmOk) {
      confirmRef.current?.focus();
      return;
    }
    setError(null);
    setReviewOpen(true);
  }

  async function performDeletion() {
    if (deleting || !confirmOk) return;
    setDeleting(true);
    setError(null);

    try {
      if (viewer.isDemo) {
        const { failedKeys } = clearLocalMoneyFlowStores();
        if (failedKeys.length > 0) {
          setError(
            `Không xóa hết dữ liệu cục bộ (${failedKeys.length} khóa còn lại). Kiểm tra quyền trình duyệt rồi thử lại.`,
          );
          setReviewOpen(false);
          setDeleting(false);
          return;
        }
        setNotice("Đã xóa dữ liệu demo trên thiết bị này.");
        setReviewOpen(false);
        window.setTimeout(() => {
          router.replace("/?deleted=1&scope=demo-local");
          router.refresh();
        }, 400);
        return;
      }

      const result = await finalizeAccountDeletion(confirmText);
      if (!result.ok) {
        setError(result.message);
        setReviewOpen(false);
        setDeleting(false);
        return;
      }

      const { failedKeys } = clearLocalMoneyFlowStores();
      const params = new URLSearchParams({ deleted: "1" });
      params.set("serverCleanup", result.cleanupVerified ? "verified" : "unverified");
      params.set("localCleanup", failedKeys.length === 0 ? "complete" : "partial");
      if (failedKeys.length > 0) params.set("localFailed", String(failedKeys.length));
      router.replace(`/login?${params.toString()}`);
      router.refresh();
    } catch {
      setError(
        "Không hoàn tất xóa tài khoản. Dữ liệu trên thiết bị chưa bị xóa; hãy thử lại.",
      );
      setReviewOpen(false);
      setDeleting(false);
    }
  }

  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
      notice={notice}
      primaryAction={{
        label: deleting ? "Đang xóa…" : "Xem lại xóa",
        onClick: () => requestReview(),
        disabled: !ready || deleting || !confirmOk,
        icon: "trash",
      }}
    >
      <SecondaryWorkspace slot="settings-delete-account-workspace">
        <SecondaryHeader
          section="Cài đặt · Vùng nguy hiểm"
          title="Xóa tài khoản"
          description={
            <>
              <p>
                Xóa tài khoản là thao tác vĩnh viễn. Hãy xuất dữ liệu cần giữ trước
                khi tiếp tục; export hiện tại chỉ gồm giao dịch và Inbox.
              </p>
              <ul className={styles.trustBar} aria-label="Trước khi xóa">
                <li>
                  <Icon name="arrowDown" />
                  Xuất trước khi xóa
                </li>
                <li>
                  <Icon name="lock" />
                  Máy chủ xóa trước
                </li>
                <li>
                  <Icon name="trash" />
                  Dọn thiết bị sau
                </li>
              </ul>
            </>
          }
          actions={
            <>
              <LinkButton href="/settings" intent="secondary" targetSize="important">
                Cài đặt
              </LinkButton>
              <LinkButton
                href="/settings/export"
                intent="secondary"
                targetSize="important"
              >
                Xuất dữ liệu
              </LinkButton>
            </>
          }
        />

        {!ready ? (
          <section className={styles.loading} aria-busy="true" aria-label="Đang tải trang xóa">
            <span />
            <span />
            <span />
          </section>
        ) : null}

        {ready && error ? (
          <Alert tone="error" live="assertive">
            <AlertDescription className={styles.alertAction}>
              <span>{error}</span>
              <Button
                type="button"
                intent="secondary"
                targetSize="important"
                onClick={() => {
                  setError(null);
                  reload();
                }}
              >
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {ready ? (
          <form className={styles.form} onSubmit={requestReview} noValidate>
            <SecondarySection
              title="Sẽ bị xóa vĩnh viễn"
              description={<p>Phạm vi phụ thuộc chế độ demo hoặc tài khoản đăng nhập.</p>}
              contained
              slot="settings-section"
            >
              <div className={`${styles.panel} ${styles.dangerPanel}`}>
                <ul className={styles.dangerList}>
                  <li>Tùy chọn local, onboarding, Inbox/import/rules và draft trên thiết bị</li>
                  <li>Sổ giao dịch demo trên browser nếu đang ở chế độ demo</li>
                  {!viewer.isDemo ? (
                    <>
                      <li>Tài khoản đăng nhập Supabase</li>
                      <li>Ví, danh mục, giao dịch, ngân sách, mục tiêu và mẫu định kỳ trên máy chủ</li>
                    </>
                  ) : null}
                </ul>
              </div>
            </SecondarySection>

            <SecondarySection
              title="Thứ tự an toàn"
              description={<p>MoneyFlow không xóa local trước khi máy chủ xác nhận.</p>}
              contained
              slot="settings-section"
            >
              <p className={styles.panelLead}>
                {viewer.isDemo
                  ? "Demo không có Auth máy chủ; chỉ dữ liệu MoneyFlow trên browser hiện tại được dọn."
                  : SERVER_DELETE_READY_VI}
              </p>
              {!viewer.isDemo ? (
                <Alert tone="warning" live="polite">
                  <AlertDescription>
                    Luồng hiện tại yêu cầu phiên đăng nhập hợp lệ nhưng chưa yêu cầu
                    xác thực lại mật khẩu/OAuth ngay trước thao tác. Recent re-auth là
                    hardening provider riêng, không được giả lập bằng checkbox client.
                  </AlertDescription>
                </Alert>
              ) : null}
            </SecondarySection>

            <SecondarySection
              title="Xác nhận bằng văn bản"
              description={
                <p>
                  Gõ chính xác <strong>{DELETE_CONFIRM_TEXT}</strong> để mở bước xem
                  lại cuối cùng.
                </p>
              }
              contained
              slot="settings-section"
            >
              <TextField
                ref={confirmRef}
                label={`Gõ ${DELETE_CONFIRM_TEXT} để xác nhận`}
                value={confirmText}
                onChange={(event) => {
                  setConfirmText(event.target.value);
                  setError(null);
                }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={DELETE_CONFIRM_TEXT}
                disabled={deleting}
                error={
                  confirmText.length > 0 && !confirmOk
                    ? "Chưa khớp. Cần chữ hoa và dấu chính xác."
                    : undefined
                }
                targetSize="important"
              />
              <p
                className={
                  confirmOk
                    ? `${styles.confirmStatus} ${styles.confirmValid}`
                    : styles.confirmStatus
                }
                aria-live="polite"
              >
                {confirmOk
                  ? "Xác nhận hợp lệ. Bước tiếp theo vẫn chỉ là xem lại hậu quả."
                  : `Nút xem lại chỉ bật khi bạn gõ đúng “${DELETE_CONFIRM_TEXT}”.`}
              </p>
            </SecondarySection>

            <div className={styles.formActions}>
              <Button
                type="submit"
                intent="destructive"
                targetSize="important"
                disabled={!confirmOk || deleting}
              >
                Xem lại xóa
              </Button>
              <LinkButton
                href="/settings/privacy"
                intent="secondary"
                targetSize="important"
                aria-disabled={deleting || undefined}
              >
                Hủy
              </LinkButton>
            </div>
          </form>
        ) : null}
      </SecondaryWorkspace>

      <SecondaryReviewDialog
        open={reviewOpen}
        onOpenChange={(open) => {
          if (!open && !deleting) setReviewOpen(false);
        }}
        title="Xóa vĩnh viễn tài khoản và dữ liệu?"
        description="Đây là bước xác nhận cuối. Không thể hoàn tác sau khi máy chủ hoàn tất."
        details={[
          { label: "Chế độ", value: viewer.isDemo ? "Demo trên thiết bị" : "Tài khoản đăng nhập" },
          { label: "Máy chủ", value: viewer.isDemo ? "Không có tài khoản máy chủ" : "Xóa tài khoản và tenant data trước" },
          { label: "Thiết bị", value: "Dọn local stores sau kết quả máy chủ" },
          { label: "Export", value: "Không tự tạo; cần tải trước khi xác nhận" },
        ]}
        consequence={
          viewer.isDemo
            ? "Dữ liệu demo trên browser hiện tại sẽ bị xóa. Giao diện theme được giữ theo contract hiện tại."
            : "Nếu máy chủ thất bại, dữ liệu local chưa bị xóa. Nếu máy chủ thành công nhưng cleanup không xác minh đầy đủ, trang đăng nhập nhận trạng thái verified/unverified và complete/partial để hiển thị hoặc hỗ trợ tiếp theo."
        }
        confirmLabel="Xóa vĩnh viễn"
        confirmIntent="destructive"
        pending={deleting}
        onConfirm={performDeletion}
        slot="delete-account-review"
      />
    </AppShell>
  );
}
