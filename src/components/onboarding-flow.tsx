"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  type CaptureMethod,
  ONBOARDING_SKIP_HREF,
  ONBOARDING_STORAGE_KEY,
  captureHref,
  isOnboardingDone,
  isOnboardingDoneValue,
  markOnboardingDone,
} from "@/lib/onboarding";

const TRUST_PROMISES = [
  "Không hỏi mật khẩu / OTP ngân hàng",
  "Bạn duyệt trước khi giao dịch vào sổ",
  "Có thể xóa dữ liệu bất cứ lúc nào",
] as const;

const CAPTURE_OPTIONS: {
  id: CaptureMethod;
  label: string;
  description: string;
}[] = [
  {
    id: "paste",
    label: "Dán text / SMS",
    description: "Dán tin nhắn hoặc đoạn text — MoneyFlow gợi ý giao dịch.",
  },
  {
    id: "upload",
    label: "Tải CSV / Excel / PDF",
    description: "Sao kê từ ngân hàng hoặc bảng chi tiêu — không cần mật khẩu NH.",
  },
  {
    id: "quick",
    label: "Thêm nhanh 1 khoản (thử tay)",
    description: "Nhập một khoản để làm quen — bạn vẫn duyệt trước khi vào sổ.",
  },
];

const STEP_TITLES = {
  1: "Cam kết của MoneyFlow",
  2: "Đưa dữ liệu đầu tiên thế nào?",
  3: "Sẵn sàng bắt đầu",
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

function finishAndGo(router: ReturnType<typeof useRouter>, href: string, onError: (msg: string) => void) {
  try {
    markOnboardingDone();
    router.push(href);
  } catch {
    onError("Không lưu được tiến trình trên thiết bị này. Thử lại hoặc dùng trình duyệt khác.");
  }
}

export function OnboardingFlow() {
  const router = useRouter();
  const baseId = useId();
  const alreadyDone = useSyncExternalStore(
    subscribeOnboardingStorage,
    getOnboardingDoneSnapshot,
    getOnboardingDoneServerSnapshot,
  );
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [method, setMethod] = useState<CaptureMethod | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (alreadyDone || isOnboardingDone()) {
      router.replace(ONBOARDING_SKIP_HREF);
    }
  }, [alreadyDone, router]);

  function skipToInbox() {
    setError(null);
    finishAndGo(router, ONBOARDING_SKIP_HREF, setError);
  }

  function goNextFromTrust() {
    setError(null);
    setStep(2);
  }

  function goNextFromMethod() {
    if (!method) {
      setError("Chọn một cách đưa dữ liệu để tiếp tục.");
      return;
    }
    setError(null);
    setStep(3);
  }

  function startCapture() {
    if (!method) {
      setError("Chọn một cách đưa dữ liệu để tiếp tục.");
      setStep(2);
      return;
    }
    setError(null);
    finishAndGo(router, captureHref(method), setError);
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

  const selected = CAPTURE_OPTIONS.find((option) => option.id === method);

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
        <div className="onboarding-progress" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3} aria-label={`Bước ${step} trên 3`}>
          <span className={step >= 1 ? "is-active" : undefined} />
          <span className={step >= 2 ? "is-active" : undefined} />
          <span className={step >= 3 ? "is-active" : undefined} />
        </div>

        {step === 1 && (
          <section className="onboarding-step" aria-labelledby={`${baseId}-step1-title`}>
            <h1 id={`${baseId}-step1-title`}>Bạn kiểm soát dữ liệu</h1>
            <p className="onboarding-lead">
              Trước khi đưa giao dịch vào, MoneyFlow cam kết những điều sau — không cần tin mù quáng.
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
            <h1 id={`${baseId}-step2-title`}>Đưa dữ liệu đầu tiên thế nào?</h1>
            <p className="onboarding-lead">
              Chọn một cách — bạn vẫn duyệt trước khi bất kỳ khoản nào vào sổ.
            </p>
            <fieldset className="onboarding-methods">
              <legend className="sr-only">Cách đưa dữ liệu</legend>
              {CAPTURE_OPTIONS.map((option) => {
                const inputId = `${baseId}-method-${option.id}`;
                const selectedOption = method === option.id;
                return (
                  <label
                    key={option.id}
                    htmlFor={inputId}
                    className={selectedOption ? "onboarding-method is-selected" : "onboarding-method"}
                  >
                    <input
                      id={inputId}
                      type="radio"
                      name="captureMethod"
                      value={option.id}
                      checked={selectedOption}
                      onChange={() => {
                        setMethod(option.id);
                        setError(null);
                      }}
                    />
                    <span className="onboarding-method-copy">
                      <strong>{option.label}</strong>
                      <span>{option.description}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            {error && (
              <p className="onboarding-error" role="alert">
                {error}
              </p>
            )}
            <div className="onboarding-actions">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                Quay lại
              </Button>
              <Button type="button" className="onboarding-primary" onClick={goNextFromMethod}>
                Tiếp
                <Icon name="arrowRight" />
              </Button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="onboarding-step" aria-labelledby={`${baseId}-step3-title`}>
            <h1 id={`${baseId}-step3-title`}>Bắt đầu với cách bạn chọn</h1>
            <p className="onboarding-lead">
              {selected
                ? `Bạn chọn: ${selected.label}. Tiếp theo là màn nhập liệu — mọi gợi ý đều chờ bạn duyệt.`
                : "Chọn cách đưa dữ liệu ở bước trước."}
            </p>
            {selected && (
              <div className="onboarding-summary" role="status">
                <strong>{selected.label}</strong>
                <span>{selected.description}</span>
              </div>
            )}
            {error && (
              <p className="onboarding-error" role="alert">
                {error}
              </p>
            )}
            <div className="onboarding-actions">
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                Quay lại
              </Button>
              <Button type="button" className="onboarding-primary" onClick={startCapture} disabled={!method}>
                Bắt đầu
                <Icon name="arrowRight" />
              </Button>
            </div>
          </section>
        )}

        <button type="button" className="onboarding-skip" onClick={skipToInbox}>
          Để sau — vào Inbox trống
        </button>
      </div>
    </main>
  );
}
