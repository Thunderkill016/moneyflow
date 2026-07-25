"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { finalizeAccountDeletion } from "@/app/(auth)/actions";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
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

/**
 * Delete account (wireframes-inbox §20).
 * Type XÓA → delete authenticated server account → clear local stores.
 */
export function DeleteAccountPage({ viewer }: { viewer: ViewerSummary }) {
  const formId = useId();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inboxCount, setInboxCount] = useState(0);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");

  const confirmOk = isDeleteConfirmValid(confirmText);

  function reload() {
    try {
      setError(null);
      setInboxCount(countPending(readStoredCandidates()));
    } catch {
      setError("Không đọc được dữ liệu thiết bị. Thử tải lại trang.");
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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (deleting || !confirmOk) return;
    setDeleting(true);
    setError(null);
    try {
      if (viewer.isDemo) {
        const { failedKeys } = clearLocalMoneyFlowStores();
        if (failedKeys.length > 0) {
          setError(
            "Không xóa hết dữ liệu cục bộ. Kiểm tra quyền trình duyệt rồi thử lại.",
          );
          setDeleting(false);
          return;
        }
        setNotice("Đã xóa dữ liệu trên thiết bị này (chế độ demo).");
        window.setTimeout(() => {
          router.replace("/?deleted=1");
          router.refresh();
        }, 400);
        return;
      }

      // Delete server data first so a transient backend failure never destroys the
      // user's only local copy while leaving the real account untouched.
      const result = await finalizeAccountDeletion(confirmText);
      if (!result.ok) {
        setError(result.message);
        setDeleting(false);
        return;
      }

      const { failedKeys } = clearLocalMoneyFlowStores();
      const params = new URLSearchParams({ deleted: "1" });
      if (failedKeys.length > 0) params.set("localCleanup", "partial");
      if (!result.cleanupVerified) params.set("serverCleanup", "unverified");
      router.replace(`/login?${params.toString()}`);
      router.refresh();
    } catch {
      setError(
        "Không hoàn tất xóa tài khoản. Dữ liệu cục bộ chưa bị xóa; hãy thử lại.",
      );
      setDeleting(false);
    }
  }

  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
      notice={notice}
      primaryAction={{
        label: deleting ? "Đang xóa…" : "Xóa vĩnh viễn",
        onClick: () => {
          const form = document.getElementById(formId) as HTMLFormElement | null;
          form?.requestSubmit();
        },
        disabled: !ready || deleting || !confirmOk,
        icon: "trash",
      }}
    >
      <main className="dashboard privacy-workspace delete-account-workspace">
        <section className="transactions-title-row">
          <div>
            <p className="eyebrow">Cài đặt · Vùng nguy hiểm</p>
            <h1>Xóa tài khoản</h1>
            <p>
              Bạn có thể xóa tài khoản và toàn bộ sổ khi muốn. Thao tác{" "}
              <strong>không hoàn tác</strong> sau khi hoàn tất.
              Nên <Link href="/settings/export">xuất dữ liệu (CSV)</Link> trước
              nếu bạn còn cần bản sao.
            </p>
            <ul className="settings-trust-bar" aria-label="Trước khi xóa">
              <li>
                <Icon name="arrowDown" size={14} />
                <span>Xuất trước khi xóa</span>
              </li>
              <li>
                <Icon name="lock" size={14} />
                <span>Xóa cả máy chủ</span>
              </li>
            </ul>
          </div>
          <div className="page-heading-actions">
            <Link className="secondary-button" href="/settings">
              <Icon name="settings" />
              Cài đặt
            </Link>
            <Link className="secondary-button" href="/settings/export">
              <Icon name="arrowDown" />
              Xuất dữ liệu
            </Link>
          </div>
        </section>

        {!ready && (
          <section
            className="panel privacy-loading"
            aria-busy="true"
            aria-label="Đang tải trang xóa tài khoản"
          >
            <div className="loading-line wide" />
            <div className="loading-line" />
            <div className="loading-line" />
          </section>
        )}

        {ready && error && (
          <section className="panel privacy-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setError(null);
                reload();
              }}
            >
              Thử lại
            </button>
          </section>
        )}

        {ready && (
          <form
            id={formId}
            className="privacy-form delete-account-form"
            onSubmit={onSubmit}
            noValidate
          >
            <section
              className="panel delete-account-danger-panel"
              aria-labelledby={`${formId}-will-heading`}
            >
              <h2 id={`${formId}-will-heading`}>Sẽ xóa vĩnh viễn</h2>
              <ul className="delete-account-list">
                <li>Tùy chọn local (quyền riêng tư, nhập nhanh, onboarding)</li>
                <li>Sổ giao dịch demo trên trình duyệt (nếu có)</li>
                <li>Ứng viên / import / rules local (Nâng cao, nếu có)</li>
                <li>File raw và bản nháp map cột (nếu có)</li>
                {!viewer.isDemo && (
                  <>
                    <li>Tài khoản đăng nhập Supabase</li>
                    <li>Ví, danh mục, giao dịch, ngân sách, mục tiêu và mẫu định kỳ trên máy chủ</li>
                  </>
                )}
              </ul>
              <p className="delete-account-irreversible">
                Không hoàn tác sau khi tài khoản máy chủ đã bị xóa.
              </p>
            </section>

            <section
              className="panel privacy-panel"
              aria-labelledby={`${formId}-server-heading`}
            >
              <h2 id={`${formId}-server-heading`}>Máy chủ (Supabase)</h2>
              <p className="privacy-panel-lead delete-account-server-note">
                {viewer.isDemo
                  ? "Bạn đang ở chế độ demo — không có phiên Auth thật. Chỉ xóa dữ liệu localStorage trên trình duyệt này."
                  : SERVER_DELETE_READY_VI}
              </p>
            </section>

            <section
              className="panel privacy-panel"
              aria-labelledby={`${formId}-confirm-heading`}
            >
              <h2 id={`${formId}-confirm-heading`}>Xác nhận</h2>
              <p className="privacy-panel-lead">
                Gõ <strong className="font-mono">{DELETE_CONFIRM_TEXT}</strong> để
                xác nhận (chính xác, có dấu).
              </p>
              <label className="delete-account-confirm-label" htmlFor={`${formId}-confirm`}>
                <span className="sr-only">Gõ {DELETE_CONFIRM_TEXT} để xác nhận</span>
                <input
                  id={`${formId}-confirm`}
                  className="delete-account-confirm-input"
                  type="text"
                  name="deleteConfirm"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={DELETE_CONFIRM_TEXT}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={deleting}
                  aria-invalid={confirmText.length > 0 && !confirmOk}
                  aria-describedby={`${formId}-confirm-hint`}
                />
              </label>
              <p id={`${formId}-confirm-hint`} className="delete-account-confirm-hint">
                {confirmText.length === 0
                  ? `Nút xóa chỉ bật khi bạn gõ đúng «${DELETE_CONFIRM_TEXT}».`
                  : confirmOk
                    ? "Xác nhận hợp lệ — bạn có thể xóa vĩnh viễn."
                    : "Chưa khớp. Gõ chính xác XÓA (chữ hoa, có dấu Ó)."}
              </p>
            </section>

            <div className="privacy-form-actions delete-account-actions">
              <button
                type="submit"
                className="delete-account-submit"
                disabled={deleting || !confirmOk}
              >
                {deleting ? "Đang xóa…" : "Xóa vĩnh viễn"}
              </button>
              <Link
                className="secondary-button"
                href="/settings/privacy"
                aria-disabled={deleting}
              >
                Hủy
              </Link>
            </div>
          </form>
        )}
      </main>
    </AppShell>
  );
}
