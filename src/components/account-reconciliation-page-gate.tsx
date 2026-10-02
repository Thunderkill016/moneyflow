"use client";

import { notFound } from "next/navigation";
import { useEffect, useState, type ComponentProps } from "react";
import { useDemoAccountSummaries } from "@/hooks/use-demo-accounts";
import { AccountReconciliationPage } from "./account-reconciliation-page";

type AccountReconciliationPageGateProps = ComponentProps<
  typeof AccountReconciliationPage
> & { accountId?: string };

export function AccountReconciliationPageGate(
  props: AccountReconciliationPageGateProps,
) {
  const stored = useDemoAccountSummaries(props.viewer.isDemo);
  const account =
    props.viewer.isDemo && stored.ready
      ? (stored.accounts.find(
          (item) => item.id === (props.accountId ?? props.account?.id),
        ) ?? null)
      : props.account;
  const [ready, setReady] = useState(!props.viewer.isDemo);

  useEffect(() => {
    if (!props.viewer.isDemo) return;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setReady(true));
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [props.viewer.isDemo]);

  const hydrated = ready && (!props.viewer.isDemo || stored.ready);
  if (
    hydrated &&
    props.viewer.isDemo &&
    !account &&
    !props.dataError &&
    !stored.error
  )
    notFound();
  return (
    <div
      aria-busy={!hydrated}
      data-demo-reconciliation-ready={hydrated ? "true" : "false"}
      inert={hydrated ? undefined : true}
    >
      <AccountReconciliationPage
        {...props}
        account={account}
        dataError={
          props.dataError ?? (props.viewer.isDemo ? stored.error : null)
        }
        initialState={
          props.viewer.isDemo && account
            ? { ...props.initialState, featureAvailable: true }
            : props.initialState
        }
      />
    </div>
  );
}
