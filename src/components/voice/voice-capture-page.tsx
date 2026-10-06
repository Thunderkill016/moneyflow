"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ToastTone } from "@/components/ui/toast";
import type { ViewerSummary } from "@/components/user-chip";
import { useDemoFinanceWorkspace } from "@/hooks/use-demo-accounts";
import { useTransactions } from "@/hooks/use-transactions";
import { useVoiceCapture } from "@/hooks/use-voice-capture";
import { addCandidatesForClient } from "@/hooks/client-inbox";
import { todayInVietnam } from "@/lib/vietnam-date";
import type {
  AccountOption,
  CategoryOption,
  CreateTransactionInput,
  GoalOption,
  Transaction,
} from "@/lib/sample-data";
import {
  VoiceConfirmCard,
  type VoiceConfirmInput,
} from "./voice-confirm-card";
import styles from "./voice-capture-page.module.css";

type VoiceWorkspace = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  goals?: GoalOption[];
  dataError: string | null;
};

/**
 * Capture -> Voice. One-tap mic -> on-device Vietnamese recognition ->
 * mandatory confirm card -> ledger (same trusted save path as quick add).
 * Nothing is ever saved without the explicit confirm tap.
 */
export function VoiceCapturePage({
  viewer,
  workspace: initialWorkspace,
}: {
  viewer: ViewerSummary;
  workspace: VoiceWorkspace;
}) {
  const workspace = useDemoFinanceWorkspace(initialWorkspace, viewer.isDemo);
  const router = useRouter();
  const { addTransaction, isMutating } = useTransactions({
    initialTransactions: workspace.transactions,
    accounts: workspace.accounts,
    categories: workspace.categories,
    goals: workspace.goals,
    isDemo: viewer.isDemo,
  });
  const voice = useVoiceCapture();
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<ToastTone | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const hasSetup =
    workspace.accounts.length > 0 && workspace.categories.length > 0;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => {
      setNotice("");
      setNoticeTone(undefined);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function handleConfirm(input: VoiceConfirmInput) {
    setSaving(true);
    try {
      const occurredOn = todayInVietnam();
      const transactionInput: CreateTransactionInput = {
        kind: input.kind,
        amount: input.amount,
        categoryId: input.categoryId,
        accountId: input.accountId,
        note: input.note,
        occurredOn,
        idempotencyKey: crypto.randomUUID(),
      };
      const result = await addTransaction(transactionInput);
      if (!result.ok) {
        setNotice(result.message || "Không lưu được. Thử lại nhé.");
        setNoticeTone("error");
        return;
      }
      const category = workspace.categories.find(
        (item) => item.id === input.categoryId,
      );
      const account = workspace.accounts.find(
        (item) => item.id === input.accountId,
      );
      try {
        await addCandidatesForClient(viewer.isDemo, [
          {
            kind: input.kind,
            amount: input.amount,
            merchant: input.note || category?.name || "Nói để ghi",
            note: input.note,
            occurredOn,
            source: "voice",
            confidence: "high",
            status: "approved",
            categoryId: input.categoryId,
            category: category?.name,
            accountId: input.accountId,
            account: account?.name,
            rawSnippet: voice.parsed?.transcript ?? input.note,
          },
        ]);
      } catch {
        // Candidate mirroring is optional; the ledger save already succeeded.
      }
      setNotice("Đã lưu vào sổ.");
      setNoticeTone("success");
      voice.reset();
    } finally {
      setSaving(false);
    }
  }

  const busy =
    voice.phase === "preparing" ||
    voice.phase === "listening" ||
    saving ||
    isMutating;

  return (
    <AppShell
      viewer={viewer}
      notice={notice}
      noticeTone={noticeTone}
      primaryAction={{ label: "Inbox", href: "/inbox", icon: "inbox" }}
    >
      <main className={styles.workspace} data-slot="voice-capture-workspace">
        <section className={styles.titleRow} aria-labelledby="voice-title">
          <div className={styles.titleCopy}>
            <LinkButton
              className={styles.eyebrow}
              href="/capture"
              intent="quiet"
              targetSize="important"
            >
              ← Capture
            </LinkButton>
            <h1 id="voice-title">Nói để ghi</h1>
            <p>
              Bấm mic, nói ví dụ &ldquo;Ăn sáng hai chục&rdquo; — kiểm tra lại
              rồi mới lưu.
            </p>
          </div>
          <div className={styles.headingActions}>
            <LinkButton href="/inbox" intent="secondary" targetSize="important">
              <Icon name="inbox" /> Về Inbox
            </LinkButton>
          </div>
        </section>

        {workspace.dataError ? (
          <Alert tone="error" live="assertive" className={styles.state}>
            <AlertTitle>Không tải được dữ liệu</AlertTitle>
            <AlertDescription>{workspace.dataError}</AlertDescription>
            <Button
              type="button"
              intent="secondary"
              targetSize="important"
              onClick={() => router.refresh()}
            >
              Thử lại
            </Button>
          </Alert>
        ) : null}

        {!workspace.dataError && !hasSetup ? (
          <EmptyState
            icon={<Icon name="wallet" />}
            title="Chưa sẵn sàng ghi bằng giọng nói"
            description="Bạn cần ít nhất một tài khoản và danh mục trước."
            primaryAction={
              <LinkButton
                href={workspace.accounts.length ? "/categories" : "/accounts"}
                intent="primary"
                targetSize="important"
              >
                {workspace.accounts.length ? "Quản lý danh mục" : "Quản lý tài khoản"}
              </LinkButton>
            }
            className={styles.state}
          />
        ) : null}

        {!workspace.dataError && hasSetup && voice.supported === false ? (
          <Alert tone="warning" className={styles.state}>
            <AlertTitle>Thiết bị không hỗ trợ micro</AlertTitle>
            <AlertDescription>
              Trình duyệt này không cho dùng micro để nhập giọng nói. Bạn vẫn
              ghi nhanh bằng tay được.
            </AlertDescription>
            <LinkButton href="/capture/quick" intent="primary" targetSize="important">
              Ghi nhanh bằng tay
            </LinkButton>
          </Alert>
        ) : null}

        {!workspace.dataError &&
        hasSetup &&
        voice.supported === true &&
        voice.phase === "idle" &&
        !voice.parsed ? (
          <section className={styles.micZone}>
            <Button
              type="button"
              intent="primary"
              targetSize="important"
              onClick={() => void voice.start()}
              className={styles.micButton}
              aria-label="Bấm để nói và ghi giao dịch"
            >
              <Icon name="mic" />
            </Button>
            <p className={styles.micHint}>
              Bấm mic rồi nói. Ví dụ: &ldquo;Cà phê ba lăm&rdquo;, &ldquo;Đổ xăng
              một trăm&rdquo;.
            </p>
            {voice.error ? (
              <Alert tone="error" live="assertive" className={styles.state}>
                <AlertDescription>{voice.error}</AlertDescription>
              </Alert>
            ) : null}
            <p className={styles.privacy}>
              <Icon name="lock" />
              <span>
                Đoạn ghi âm được trình duyệt gửi đi để nhận dạng chữ rồi xóa
                ngay — không lưu trữ.
              </span>
            </p>
          </section>
        ) : null}

        {voice.phase === "preparing" ? (
          <section className={styles.statusZone} aria-live="polite">
            <p className={styles.statusTitle}>Đang chuẩn bị giọng nói…</p>
            <p className={styles.statusDetail}>
              Đang tải model tiếng Việt (khoảng 32MB). Lần đầu hơi lâu, lần
              sau mở là dùng ngay.
            </p>
            <p className={styles.statusHint}>
              Chỉ tải một lần duy nhất — không tốn phí, không gửi dữ liệu đi.
            </p>
            <Button
              type="button"
              intent="secondary"
              targetSize="important"
              onClick={voice.reset}
            >
              Hủy
            </Button>
          </section>
        ) : null}

        {voice.phase === "listening" ? (
          <section className={styles.statusZone} aria-live="polite">
            <p className={styles.listeningDot} aria-hidden>
              <span />
            </p>
            <p className={styles.statusTitle}>Đang nghe…</p>
            <p className={styles.statusDetail}>
              {voice.partial ? `“${voice.partial}”` : "Nói đi, mình đang nghe."}
            </p>
            <Button
              type="button"
              intent="primary"
              targetSize="important"
              onClick={voice.stopListening}
            >
              <Icon name="check" /> Xong, ghi đi
            </Button>
          </section>
        ) : null}

        {voice.phase === "confirming" && voice.parsed ? (
          <VoiceConfirmCard
            key={`${voice.parsed.transcript}|${voice.parsed.amount}|${voice.parsed.kind}`}
            parsed={voice.parsed}
            accounts={workspace.accounts}
            categories={workspace.categories}
            disabled={busy}
            onConfirm={(input) => void handleConfirm(input)}
            onRetry={() => void voice.start()}
            onCancel={voice.reset}
          />
        ) : null}
      </main>
    </AppShell>
  );
}
