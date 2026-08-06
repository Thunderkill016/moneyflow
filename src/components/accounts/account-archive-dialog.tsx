"use client";

import { useRef } from "react";
import { Icon } from "@/components/icons";
import { MoneyValue } from "@/components/money-value";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { AccountSummary } from "@/lib/accounts";
import styles from "./account-dialog.module.css";

export function AccountArchiveDialog({
  account,
  open,
  submitting,
  onClose,
  onConfirm,
}: {
  account: AccountSummary | null;
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  if (!account) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) onClose();
      }}
      title="Lưu trữ tài khoản"
      description="Kiểm tra ảnh hưởng trước khi tiếp tục"
      dismissible={!submitting}
      initialFocusRef={cancelRef}
      className={styles.dialog}
      contentClassName={styles.dialogContent}
      footer={
        <div className={styles.archiveFooter}>
          <Button
            ref={cancelRef}
            type="button"
            intent="secondary"
            targetSize="important"
            onClick={onClose}
            disabled={submitting}
          >
            Giữ tài khoản hoạt động
          </Button>
          <Button
            type="button"
            intent="destructive"
            targetSize="important"
            pending={submitting}
            pendingLabel="Đang lưu trữ..."
            onClick={onConfirm}
          >
            <Icon name="archive" /> Lưu trữ tài khoản
          </Button>
        </div>
      }
    >
      <div data-slot="account-archive-review" className={styles.archiveReview}>
        <div className={styles.archiveAccount}>
          <strong>{account.name}</strong>
          <p>
            Số dư hiện tại:{" "}
            <MoneyValue
              amount={account.balance}
              mode="plain"
              currencyCode={account.currencyCode}
              emphasis="strong"
              align="start"
              label={`Số dư hiện tại ${account.name}`}
            />
          </p>
        </div>

        <Alert tone="warning">
          <AlertTitle>Lịch sử và số dư không bị xóa</AlertTitle>
          <AlertDescription>
            Tài khoản sẽ chuyển sang nhóm đã lưu trữ và bạn có thể khôi phục sau.
          </AlertDescription>
        </Alert>

        <ul className={styles.archiveConsequences}>
          <li>Tài khoản không còn xuất hiện khi ghi giao dịch mới.</li>
          <li>Số dư không còn nằm trong tổng của các tài khoản đang hoạt động.</li>
          <li>Sổ tài khoản, giao dịch cũ và số dư vẫn được giữ nguyên.</li>
        </ul>
      </div>
    </Dialog>
  );
}
