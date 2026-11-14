"use client";

import clsx, { type ClassValue } from "clsx";
import { Monitor, Moon, Sun, X } from "lucide-react";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--mf-border)] bg-[var(--mf-surface)] p-4 text-[var(--mf-text)] shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
        variant === "primary" &&
          "bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 active:scale-[0.98]",
        variant === "secondary" &&
          "border border-[var(--mf-border-strong)] bg-[var(--mf-surface-2)] text-[var(--mf-text)] hover:border-emerald-500/40",
        variant === "ghost" &&
          "text-[var(--mf-text-muted)] hover:bg-[var(--mf-surface-2)] hover:text-[var(--mf-text)]",
        variant === "danger" &&
          "border border-rose-500/35 bg-rose-500/15 text-rose-500 hover:bg-rose-500/25",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ModalShell({
  open,
  title,
  onClose,
  children,
  maxWidthClass = "max-w-lg",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      onCloseRef.current();
    };
    dialog.addEventListener("close", handleClose);

    // Fallback light-dismiss for browsers lacking HTMLDialogElement.prototype.closedBy
    let cleanupBackdrop: (() => void) | undefined;
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const outside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      let pressedOutside = false;
      const onDown = (e: PointerEvent) => {
        pressedOutside = outside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && outside(e) && dialog.open) {
          dialog.close();
        }
        pressedOutside = false;
      };
      dialog.addEventListener("pointerdown", onDown);
      dialog.addEventListener("pointerup", onUp);
      cleanupBackdrop = () => {
        dialog.removeEventListener("pointerdown", onDown);
        dialog.removeEventListener("pointerup", onUp);
      };
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
      cleanupBackdrop?.();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: "any" } as Record<string, string>)}
      className={cn(
        "m-auto w-[min(94vw,42rem)] max-h-[88dvh] overflow-y-auto rounded-2xl border border-[var(--mf-border-strong)] bg-[var(--mf-surface)] p-5 text-[var(--mf-text)] shadow-2xl",
        maxWidthClass,
      )}
    >
      {open ? (
        <>
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--mf-border)] pb-3">
            <h2 id={titleId} className="text-base font-bold text-[var(--mf-text)]">
              {title}
            </h2>
            <button
              type="button"
              aria-label="Đóng hộp thoại"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--mf-text-muted)] transition hover:bg-[var(--mf-surface-2)] hover:text-[var(--mf-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </>
      ) : null}
    </dialog>
  );
}

export function MoneyFlowBrandMark({
  className = "h-8 w-8",
}: {
  className?: string;
}) {
  const uid = useId().replace(/:/gu, "");
  const bgId = `mf_bg_${uid}`;
  const waveId = `mf_wave_${uid}`;
  const echoId = `mf_echo_${uid}`;
  const glowId = `mf_glow_${uid}`;
  const rimId = `mf_rim_${uid}`;

  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient
          id={bgId}
          x1="36"
          y1="24"
          x2="476"
          y2="488"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#0B132B" />
          <stop offset="55%" stopColor="#070B16" />
          <stop offset="100%" stopColor="#05070E" />
        </linearGradient>
        <linearGradient
          id={waveId}
          x1="98"
          y1="362"
          x2="418"
          y2="146"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="48%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient
          id={echoId}
          x1="112"
          y1="392"
          x2="412"
          y2="210"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0.16" />
        </linearGradient>
        <radialGradient
          id={glowId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(290 220) rotate(132) scale(250)"
        >
          <stop stopColor="#10B981" stopOpacity="0.18" />
          <stop offset="0.55" stopColor="#06B6D4" stopOpacity="0.06" />
          <stop offset="1" stopColor="#070B14" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={rimId}
          x1="256"
          y1="16"
          x2="256"
          y2="496"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <rect x="16" y="16" width="480" height="480" rx="112" fill={`url(#${bgId})`} />
      <rect
        x="17"
        y="17"
        width="478"
        height="478"
        rx="111"
        stroke={`url(#${rimId})`}
        strokeWidth="2"
      />
      <circle cx="256" cy="240" r="196" fill={`url(#${glowId})`} />
      <path
        d="M116 364V238C116 206 154 206 168 234L214 316C228 340 264 340 278 314L310 250C324 224 358 220 380 242L396 258"
        stroke={`url(#${echoId})`}
        strokeWidth="24"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M116 346V194C116 156 162 150 180 184L226 272C240 298 274 298 288 272L322 206C336 178 370 174 392 194L400 202"
        stroke={`url(#${waveId})`}
        strokeWidth="40"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M366 150L404 146L400 184"
        stroke="#6366F1"
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="404" cy="146" r="16" fill="#34D399" />
      <circle
        cx="404"
        cy="146"
        r="30"
        stroke="#34D399"
        strokeOpacity="0.32"
        strokeWidth="4"
      />
    </svg>
  );
}

export type ColorSchemePreference = "dark" | "light" | "light dark";
const COLOR_SCHEME_STORAGE_KEY = "mf.color-scheme";
const COLOR_SCHEME_EVENT = "mf-color-scheme-change";

function parseColorSchemeValue(raw: string | null): ColorSchemePreference {
  if (raw === "light" || raw === "dark" || raw === "light dark") {
    return raw;
  }
  return "dark";
}

function readStoredColorScheme(): ColorSchemePreference {
  if (typeof window === "undefined") return "dark";
  try {
    return parseColorSchemeValue(
      window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY),
    );
  } catch {
    return "dark";
  }
}

function subscribeColorScheme(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (ev: StorageEvent) => {
    if (ev.key === null || ev.key === COLOR_SCHEME_STORAGE_KEY) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(COLOR_SCHEME_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(COLOR_SCHEME_EVENT, onStoreChange);
  };
}

function applyMetaColorScheme(value: ColorSchemePreference) {
  if (typeof document === "undefined") return;
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) {
    meta.setAttribute("content", value);
  }
}

export function useColorSchemePreference() {
  const scheme = useSyncExternalStore(
    subscribeColorScheme,
    readStoredColorScheme,
    (): ColorSchemePreference => "dark",
  );

  useEffect(() => {
    applyMetaColorScheme(scheme);
  }, [scheme]);

  const updateScheme = (next: ColorSchemePreference) => {
    applyMetaColorScheme(next);
    try {
      window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, next);
      window.dispatchEvent(new Event(COLOR_SCHEME_EVENT));
    } catch {
      // Non-fatal in restricted storage contexts
    }
  };

  const cycleScheme = () => {
    const order: ColorSchemePreference[] = ["dark", "light", "light dark"];
    const next = order[(order.indexOf(scheme) + 1) % order.length];
    updateScheme(next);
  };

  return { scheme, updateScheme, cycleScheme };
}

export function ThemeToggleControl({ compact = false }: { compact?: boolean }) {
  const { scheme, cycleScheme } = useColorSchemePreference();

  const label =
    scheme === "dark"
      ? "Tối (Obsidian)"
      : scheme === "light"
        ? "Sáng (Alabaster)"
        : "Theo hệ thống";

  return (
    <button
      type="button"
      onClick={cycleScheme}
      title={`Chế độ giao diện: ${label} (Bấm để chuyển Tối / Sáng / Hệ thống)`}
      aria-label={`Chuyển giao diện (hiện tại: ${label})`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] text-xs font-medium text-[var(--mf-text-muted)] transition hover:border-emerald-500/40 hover:text-[var(--mf-text)]",
        compact ? "px-2 py-1.5" : "px-2.5 py-1.5",
      )}
    >
      {scheme === "dark" ? (
        <Moon className="h-3.5 w-3.5 text-emerald-400" />
      ) : scheme === "light" ? (
        <Sun className="h-3.5 w-3.5 text-amber-500" />
      ) : (
        <Monitor className="h-3.5 w-3.5 text-cyan-400" />
      )}
      {!compact ? <span>{label}</span> : null}
    </button>
  );
}
