"use client";

import { CheckCircle2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TransactionController } from "../../features/transactions/use-transaction-controller.ts";
import { DesktopBentoHeader } from "./desktop-bento-header.tsx";
import { DesktopLedgerTable } from "./desktop-ledger-table.tsx";
import {
  AddAccountDialog,
  BankSmsDialog,
  BudgetEventDialog,
  ImportDialog,
  OnboardingDialog,
  ReconcileDialog,
  TransactionDialog,
} from "./desktop-modals.tsx";
import { DesktopSidebar } from "./desktop-sidebar.tsx";

export function DesktopTerminalView({
  controller,
  layoutMode,
  onChangeLayoutMode,
}: {
  controller: TransactionController;
  layoutMode: "auto" | "desktop" | "mobile";
  onChangeLayoutMode: (mode: "auto" | "desktop" | "mobile") => void;
}) {
  void layoutMode;
  const quickInputRef = useRef<HTMLInputElement | null>(null);

  const [showBankSms, setShowBankSms] = useState(false);
  const [showTransaction, setShowTransaction] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showBudgetEvent, setShowBudgetEvent] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [reconcileAccountId, setReconcileAccountId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        quickInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--mf-bg)] text-[var(--mf-text)]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6">
        {controller.statusMessage ? (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-500 dark:text-emerald-300"
          >
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {controller.statusMessage}
            </span>
            <button
              type="button"
              onClick={() => controller.setStatusMessage(null)}
              aria-label="Ẩn thông báo trạng thái"
              className="rounded p-1 hover:bg-emerald-500/20"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        <DesktopBentoHeader
          controller={controller}
          quickInputRef={quickInputRef}
          onOpenBankSms={() => setShowBankSms(true)}
          onOpenTransaction={() => setShowTransaction(true)}
          onOpenImport={() => setShowImport(true)}
          onOpenOnboarding={() => setShowOnboarding(true)}
          onOpenBudgetEvent={() => setShowBudgetEvent(true)}
          onSwitchToMobile={() => onChangeLayoutMode("mobile")}
        />

        <main className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <DesktopLedgerTable controller={controller} />
          </div>
          <div className="xl:col-span-4">
            <DesktopSidebar
              controller={controller}
              onOpenReconcile={(id) => setReconcileAccountId(id)}
              onOpenAddAccount={() => setShowAddAccount(true)}
            />
          </div>
        </main>
      </div>

      {showBankSms ? (
        <BankSmsDialog
          open
          onClose={() => setShowBankSms(false)}
          controller={controller}
        />
      ) : null}
      {showTransaction ? (
        <TransactionDialog
          open
          onClose={() => setShowTransaction(false)}
          controller={controller}
        />
      ) : null}
      {showImport ? (
        <ImportDialog
          open
          onClose={() => setShowImport(false)}
          controller={controller}
        />
      ) : null}
      {showAddAccount ? (
        <AddAccountDialog
          open
          onClose={() => setShowAddAccount(false)}
          controller={controller}
        />
      ) : null}
      {showBudgetEvent ? (
        <BudgetEventDialog
          open
          onClose={() => setShowBudgetEvent(false)}
          controller={controller}
        />
      ) : null}
      {showOnboarding ? (
        <OnboardingDialog
          open
          onClose={() => setShowOnboarding(false)}
          controller={controller}
        />
      ) : null}
      {reconcileAccountId ? (
        <ReconcileDialog
          key={reconcileAccountId}
          accountId={reconcileAccountId}
          onClose={() => setReconcileAccountId(null)}
          controller={controller}
        />
      ) : null}
    </div>
  );
}
