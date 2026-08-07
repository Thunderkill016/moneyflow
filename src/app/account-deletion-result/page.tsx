import type { Metadata } from "next";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Icon } from "@/components/icons";
import { LinkButton } from "@/components/ui/button";
import styles from "./account-deletion-result.module.css";

export const metadata: Metadata = {
  title: "Kết quả xóa tài khoản — MoneyFlow",
  description: "Trạng thái xóa tài khoản và dọn dữ liệu MoneyFlow.",
  robots: { index: false, follow: false },
};

type Params = {
  deleted?: string;
  scope?: string;
  serverCleanup?: string;
  localCleanup?: string;
  localFailed?: string;
};

function statusLabel(value: string | undefined, kind: "server" | "local") {
  if (kind === "server") {
    if (value === "verified") return "Đã xác minh không còn tenant rows";
    if (value === "unverified") return "Tài khoản đã xóa; cleanup chưa xác minh đầy đủ";
    return "Không áp dụng cho chế độ demo";
  }
  if (value === "complete") return "Đã dọn toàn bộ khóa MoneyFlow được phát hiện";
  if (value === "partial") return "Chỉ dọn được một phần trên thiết bị này";
  return "Đã xử lý dữ liệu demo trên thiết bị";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const deleted = params.deleted === "1";
  const demo = params.scope === "demo-local";
  const serverVerified = params.serverCleanup === "verified";
  const localComplete = demo || params.localCleanup === "complete";
  const needsAttention = !demo && (!serverVerified || !localComplete);
  const failedCount = Number.parseInt(params.localFailed ?? "0", 10);

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <BrandLockup href="/" ariaLabel="MoneyFlow, trang chủ" size="standard" />
      </header>
      <section className={styles.card} aria-labelledby="deletion-result-title">
        <span
          className={needsAttention ? `${styles.icon} ${styles.warning}` : styles.icon}
          aria-hidden="true"
        >
          <Icon name={needsAttention ? "bell" : "check"} />
        </span>
        <p className={styles.eyebrow}>Biên nhận thao tác dữ liệu</p>
        <h1 id="deletion-result-title">
          {deleted
            ? needsAttention
              ? "Tài khoản đã xử lý, còn bước cần kiểm tra"
              : "Đã hoàn tất xóa dữ liệu"
            : "Không có kết quả xóa hợp lệ"}
        </h1>
        <p className={styles.description}>
          {deleted
            ? demo
              ? "MoneyFlow đã dọn dữ liệu demo trên trình duyệt vừa thực hiện thao tác."
              : "Phiên đăng nhập cũ đã kết thúc. Bảng dưới đây phân biệt kết quả máy chủ và dọn dữ liệu trên thiết bị."
            : "Liên kết này không chứa trạng thái xóa tài khoản hợp lệ. Không có kết luận nào về dữ liệu được đưa ra."}
        </p>

        {deleted ? (
          <dl className={styles.results} data-slot="account-deletion-receipt">
            <div>
              <dt>Tài khoản máy chủ</dt>
              <dd>{demo ? "Không áp dụng" : "Đã xóa Auth user theo phản hồi Edge Function"}</dd>
            </div>
            <div>
              <dt>Xác minh cleanup máy chủ</dt>
              <dd>{statusLabel(params.serverCleanup, "server")}</dd>
            </div>
            <div>
              <dt>Dữ liệu trên thiết bị</dt>
              <dd>
                {statusLabel(params.localCleanup, "local")}
                {Number.isFinite(failedCount) && failedCount > 0
                  ? ` · ${failedCount} khóa báo lỗi`
                  : ""}
              </dd>
            </div>
            <div>
              <dt>Khả năng hoàn tác</dt>
              <dd>Không có sau khi tài khoản máy chủ đã bị xóa</dd>
            </div>
          </dl>
        ) : null}

        {needsAttention ? (
          <div className={styles.notice} role="alert">
            <strong>Cần kiểm tra thêm</strong>
            <span>
              Không đăng nhập lại để “thử xem” bằng tài khoản cũ. Lưu trạng thái
              này và liên hệ kênh hỗ trợ của MoneyFlow nếu cleanup máy chủ chưa xác
              minh hoặc trình duyệt báo dọn local một phần.
            </span>
          </div>
        ) : null}

        <div className={styles.actions}>
          <LinkButton href="/" intent="secondary" targetSize="important">
            Về trang chủ
          </LinkButton>
          {!deleted || !demo ? (
            <LinkButton href="/login" intent="primary" targetSize="important">
              Đăng nhập tài khoản khác
            </LinkButton>
          ) : null}
        </div>
      </section>
    </main>
  );
}
