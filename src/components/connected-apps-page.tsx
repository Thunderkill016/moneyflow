"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
import { EmptyState } from "@/components/ui/empty-state";
import type { ViewerSummary } from "@/components/user-chip";
import { revokeConnectedApp } from "@/app/settings/apps/actions";
import { getPendingCountForClient } from "@/hooks/client-inbox";
import {
  formatGrantedAt,
  oauthScopeLabel,
  type ConnectedApp,
} from "@/lib/connected-apps";
import styles from "./settings/settings-surfaces.module.css";

export function ConnectedAppsPage({
  viewer,
  apps,
  loadError,
}: {
  viewer: ViewerSummary;
  apps: ConnectedApp[];
  loadError: boolean;
}) {
  const router = useRouter();
  const [inboxCount, setInboxCount] = useState(0);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<ConnectedApp | null>(null);
  const [pending, startTransition] = useTransition();

  /* Demo keeps pending candidates on the device; an authenticated workspace
     owns them on the server and its local store is cleared after migration.
     getPendingCountForClient is the one reader that knows both. */
  useEffect(() => {
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
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function confirmRevoke() {
    const target = revoking;
    if (!target || pending) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("client_id", target.clientId);
      const result = await revokeConnectedApp(formData);
      if (result.ok) {
        setRevoking(null);
        setActionError(null);
        setNotice(`Đã thu hồi quyền truy cập của ${target.name}.`);
        router.refresh();
      } else {
        setActionError(result.message);
        setRevoking(null);
      }
    });
  }

  return (
    <AppShell viewer={viewer} inboxCount={inboxCount} notice={notice}>
      <SecondaryWorkspace slot="settings-apps-workspace">
        <SecondaryHeader
          section="Cài đặt · Tài khoản"
          title="Ứng dụng đã kết nối"
          description={
            <p>
              Các ứng dụng bạn đã cho phép truy cập MoneyFlow qua màn hình
              “Cho phép truy cập” (ví dụ trợ lý AI, công cụ MCP). Thu hồi sẽ
              ngắt phiên của ứng dụng ngay lập tức — ứng dụng phải xin quyền
              lại từ đầu.
            </p>
          }
          actions={
            <LinkButton href="/settings" intent="secondary" targetSize="important">
              Cài đặt
            </LinkButton>
          }
        />

        {loadError ? (
          <Alert tone="error" live="assertive">
            <AlertDescription className={styles.alertAction}>
              <span>Không tải được danh sách ứng dụng. Hãy thử lại.</span>
              <Button
                type="button"
                intent="secondary"
                targetSize="important"
                onClick={() => router.refresh()}
              >
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {actionError ? (
          <Alert tone="error" live="assertive">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        {viewer.isDemo ? (
          <SecondarySection
            title="Ứng dụng đã kết nối"
            contained
            slot="settings-section"
          >
            <EmptyState
              icon={<Icon name="lock" />}
              title="Cần tài khoản để quản lý kết nối"
              description="Chế độ demo không có ứng dụng bên ngoài nào. Khi bạn đăng nhập và cho phép một ứng dụng truy cập, nó sẽ xuất hiện ở đây để xem lại hoặc thu hồi."
            />
          </SecondarySection>
        ) : null}

        {!viewer.isDemo && !loadError ? (
          <SecondarySection
            title="Ứng dụng đã được cấp quyền"
            description={
              <p>
                Mỗi ứng dụng chỉ đọc dữ liệu đúng phạm vi tài khoản của bạn.
                Danh sách lấy trực tiếp từ máy chủ xác thực.
              </p>
            }
            contained
            slot="settings-section"
          >
            {apps.length === 0 ? (
              <EmptyState
                icon={<Icon name="lock" />}
                title="Chưa có ứng dụng nào được kết nối"
                description="Khi một ứng dụng bên ngoài (ví dụ Claude Desktop qua MCP) xin quyền và bạn nhấn “Cho phép truy cập”, nó sẽ xuất hiện ở đây."
              />
            ) : (
              <ul className={styles.activityList}>
                {apps.map((app) => (
                  <li key={app.clientId} className={styles.appGrant}>
                    <div className={styles.appGrantHead}>
                      <span className={styles.activityLabel}>{app.name}</span>
                      <Button
                        type="button"
                        intent="secondary"
                        targetSize="important"
                        disabled={pending}
                        onClick={() => setRevoking(app)}
                      >
                        Thu hồi
                      </Button>
                    </div>
                    <dl className={styles.resultGrid}>
                      <div className={styles.resultRow}>
                        <dt>Địa chỉ</dt>
                        <dd>{app.host || "—"}</dd>
                      </div>
                      <div className={styles.resultRow}>
                        <dt>Đã cho phép</dt>
                        <dd>
                          <time dateTime={app.grantedAt}>
                            {formatGrantedAt(app.grantedAt)}
                          </time>
                        </dd>
                      </div>
                      <div className={styles.resultRow}>
                        <dt>Quyền</dt>
                        <dd>
                          {app.scopes.length > 0
                            ? app.scopes.map(oauthScopeLabel).join(" · ")
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </SecondarySection>
        ) : null}
      </SecondaryWorkspace>

      <SecondaryReviewDialog
        open={revoking !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setRevoking(null);
        }}
        title={`Thu hồi quyền của ${revoking?.name ?? "ứng dụng"}?`}
        description="Ứng dụng sẽ mất quyền truy cập ngay lập tức."
        details={
          revoking
            ? [
                { label: "Ứng dụng", value: revoking.name },
                { label: "Địa chỉ", value: revoking.host || "—" },
              ]
            : []
        }
        consequence={
          <p>
            Mọi phiên đăng nhập và token làm mới của ứng dụng này sẽ bị vô hiệu.
            Dữ liệu MoneyFlow của bạn không đổi. Để kết nối lại, ứng dụng phải
            xin quyền từ đầu.
          </p>
        }
        confirmLabel="Thu hồi quyền truy cập"
        confirmIntent="destructive"
        pending={pending}
        onConfirm={confirmRevoke}
      />
    </AppShell>
  );
}
