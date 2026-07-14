"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { saveAccountAction } from "@/app/actions/accounts";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { AccountSummary } from "@/lib/accounts";
import { formatMoneyInput, parseMoneyInput } from "@/lib/money";
import {
  DEFAULT_CASH_WALLET_NAME,
  ONBOARDING_DONE_HREF,
  ONBOARDING_QUICK_EXPENSE_HREF,
  ONBOARDING_SKIP_HREF,
  ONBOARDING_STORAGE_KEY,
  TRUST_PROMISES,
  buildCashWalletInput,
  draftFromCashWallet,
  isOnboardingDone,
  isOnboardingDoneValue,
  isValidCashWalletDraft,
  markOnboardingDone,
} from "@/lib/onboarding";
import { trackProductEvent } from "@/lib/safe-analytics";

const STEP_TITLES = {
  1: "Cam kết của MoneyFlow",
  2: "Ví tiền mặt",
  3: "Ghi chi đầu tiên",
} as const;

function subscribeOnboardingStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (event: StorageEvent) => {
    if (event.key === ONBOARDING_STORAGE_KEY || event.key === null) onStoreChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getOnboardingDoneSnapshot() {
  try {
    return isOnboardingDoneValue(window.localStorage.getItem(ONBOARDING_STORAGE_KEY));
  } catch {
    return false;
  }
}

function getOnboardingDoneServerSnapshot() {
  return false;
}

function finishAndGo(
  router: ReturnType<typeof useRouter>,
  href: string,
  onError: (msg: string) => void,
  how: "skip" | "quick_expense" | "done",
) {
  try {
    markOnboardingDone();
    trackProductEvent("onboarding_completed", { how });
    router.push(href);
  } catch {
    onError("Không lưu được tiến trình trên thiết bị này. Thử lại hoặc dùng trình duyệt khác.");
  }
}

export function OnboardingFlow({
  initialCash = null,
  isDemo = true,
}: {
  /** Active cash wallet from server/demo seed, if any. */
  initialCash?: Pick<AccountSummary, "id" | "name" | "kind" | "initialBalance" | "isArchived"> | null;
  isDemo?: boolean;
}) {
  const router = useRouter();
  const baseId = useId();
  const alreadyDone = useSyncExternalStore(
    subscribeOnboardingStorage,
    getOnboardingDoneSnapshot,
    getOnboardingDoneServerSnapshot,
  );
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const seed = draftFromCashWallet(initialCash);
  const [walletName, setWalletName] = useState(seed.name);
  const [balanceInput, setBalanceInput] = useState(
    seed.initialBalance > 0 ? formatMoneyInput(String(seed.initialBalance)) : "",
  );
  const [cashId, setCashId] = useState<string | undefined>(initialCash?.id);
  const [walletConfirmed, setWalletConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (alreadyDone || isOnboardingDone()) {
      router.replace(ONBOARDING_SKIP_HREF);
    }
  }, [alreadyDone, router]);

  function skipToInsights() {
    setError(null);
    finishAndGo(router, ONBOARDING_SKIP_HREF, setError, "skip");
  }

  function goNextFromTrust() {
    setError(null);
    setStep(2);
  }

  async function confirmWallet() {
    const draft = {
      name: walletName.trim() || DEFAULT_CASH_WALLET_NAME,
      initialBalance: parseMoneyInput(balanceInput),
    };
    if (!isValidCashWalletDraft(draft)) {
      setError("Tên ví 1–80 ký tự; số dư là số nguyên không âm (đồng).");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      if (isDemo) {
        // Demo / no server write: confirm UI only (seed cash already exists in demo).
        setWalletConfirmed(true);
        setStep(3);
        return;
      }

      const input = buildCashWalletInput(draft, cashId);
      const result = await saveAccountAction(input);
      if (!result.ok) {
        // New users usually already have seed "Tiền mặt" — still allow continue.
        setError(result.message || "Chưa lưu được ví. Bạn vẫn có thể tiếp tục.");
        setWalletConfirmed(true);
        setStep(3);
        return;
      }
      if (result.account?.id) setCashId(result.account.id);
      setWalletConfirmed(true);
      setStep(3);
    } catch {
      setError("Mất kết nối khi lưu ví. Bạn vẫn có thể tiếp tục.");
      setWalletConfirmed(true);
      setStep(3);
    } finally {
      setSaving(false);
    }
  }

  function goQuickExpense() {
    setError(null);
    finishAndGo(router, ONBOARDING_QUICK_EXPENSE_HREF, setError, "quick_expense");
  }

  function finishToInsights() {
    setError(null);
    finishAndGo(router, ONBOARDING_DONE_HREF, setError, "done");
  }

  if (alreadyDone) {
    return (
      <main className="onboarding-page" aria-busy="true" aria-label="Đang chuyển hướng">
        <div className="onboarding-card">
          <div className="loading-line wide" />
          <div className="loading-line" />
          <div className="loading-card" />
        </div>
      </main>
    );
  }

  return (
    <main className="onboarding-page">
      <div className="onboarding-card">
        <Link className="brand onboarding-brand" href="/">
          <span className="brand-mark">
            <span />
          </span>
          <span>MoneyFlow</span>
        </Link>

        <p className="eyebrow">
          Bước {step}/3 — {STEP_TITLES[step]}
        </p>
        <div
          className="onboarding-progress"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={3}
          aria-label={`Bước ${step} trên 3`}
        >
          <span className={step >= 1 ? "is-active" : undefined} />
          <span className={step >= 2 ? "is-active" : undefined} />
          <span className={step >= 3 ? "is-active" : undefined} />
        </div>

        {step === 1 && (
          <section className="onboarding-step" aria-labelledby={`${baseId}-step1-title`}>
            <h1 id={`${baseId}-step1-title`}>Bạn kiểm soát dữ liệu</h1>
            <p className="onboarding-lead">
              MoneyFlow là sổ thu chi cá nhân — không kết nối ngân hàng, không lấy mật khẩu NH.
            </p>
            <ul className="onboarding-promises">
              {TRUST_PROMISES.map((text) => (
                <li key={text}>
                  <span className="onboarding-check" aria-hidden="true">
                    <Icon name="check" />
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <div className="onboarding-actions">
              <Button type="button" className="onboarding-primary" onClick={goNextFromTrust}>
                Tiếp
                <Icon name="arrowRight" />
              </Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="onboarding-step" aria-labelledby={`${baseId}-step2-title`}>
            <h1 id={`${baseId}-step2-title`}>Xác nhận ví tiền mặt</h1>
            <p className="onboarding-lead">
              {cashId
                ? "Bạn đã có ví tiền mặt. Kiểm tra tên và số dư ban đầu (có thể sửa sau)."
                : "Tạo ví tiền mặt để ghi chi tiêu nhanh. Thêm ngân hàng / ví điện tử sau trong Tài khoản."}
            </p>

            <div className="onboarding-fields">
              <label className="onboarding-field" htmlFor={`${baseId}-wallet-name`}>
                <span>Tên ví</span>
                <input
                  id={`${baseId}-wallet-name`}
                  type="text"
                  name="walletName"
                  autoComplete="off"
                  maxLength={80}
                  value={walletName}
                  onChange={(event) => {
                    setWalletName(event.target.value);
                    setError(null);
                  }}
                  placeholder={DEFAULT_CASH_WALLET_NAME}
                />
              </label>
              <label className="onboarding-field" htmlFor={`${baseId}-wallet-balance`}>
                <span>Số dư ban đầu (₫)</span>
                <input
                  id={`${baseId}-wallet-balance`}
                  type="text"
                  name="initialBalance"
                  inputMode="numeric"
                  autoComplete="off"
                  value={balanceInput}
                  onChange={(event) => {
                    setBalanceInput(formatMoneyInput(event.target.value));
                    setError(null);
                  }}
                  placeholder="0"
                />
              </label>
            </div>

            {error && (
              <p className="onboarding-error" role="alert">
                {error}
              </p>
            )}

            <div className="onboarding-actions">
              <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={saving}>
                Quay lại
              </Button>
              <Button
                type="button"
                className="onboarding-primary"
                onClick={() => void confirmWallet()}
                disabled={saving}
              >
                {saving ? "Đang lưu…" : cashId ? "Xác nhận ví" : "Tạo ví tiền mặt"}
                {!saving && <Icon name="arrowRight" />}
              </Button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="onboarding-step" aria-labelledby={`${baseId}-step3-title`}>
            <h1 id={`${baseId}-step3-title`}>Ghi chi tiêu đầu tiên?</h1>
            <p className="onboarding-lead">
              Không bắt buộc. Bạn có thể ghi một khoản chi nhanh, hoặc vào Tổng quan ngay.
              {walletConfirmed ? " Ví tiền mặt đã sẵn sàng." : ""}
            </p>

            <div className="onboarding-summary" role="status">
              <strong>Ví: {walletName.trim() || DEFAULT_CASH_WALLET_NAME}</strong>
              <span>
                Paste / tải sao kê là tùy chọn sau — không phải bước bắt buộc lúc mới vào.
              </span>
            </div>

            {error && (
              <p className="onboarding-error" role="alert">
                {error}
              </p>
            )}

            <div className="onboarding-actions">
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                Quay lại
              </Button>
              <Button type="button" className="onboarding-primary" onClick={goQuickExpense}>
                Ghi chi nhanh
                <Icon name="arrowRight" />
              </Button>
            </div>
            <button type="button" className="onboarding-skip onboarding-skip-inline" onClick={finishToInsights}>
              Bỏ qua — vào Tổng quan
            </button>
          </section>
        )}

        <button type="button" className="onboarding-skip" onClick={skipToInsights}>
          Để sau — vào Tổng quan
        </button>
      </div>
    </main>
  );
}
