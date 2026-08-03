"use client";

import {
  useEffect,
  useState,
  type ComponentProps,
} from "react";
import { AccountReconciliationPage } from "./account-reconciliation-page";

type AccountReconciliationPageGateProps = ComponentProps<
  typeof AccountReconciliationPage
>;

export function AccountReconciliationPageGate(
  props: AccountReconciliationPageGateProps,
) {
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

  return (
    <div
      aria-busy={!ready}
      data-demo-reconciliation-ready={ready ? "true" : "false"}
      inert={ready ? undefined : true}
    >
      <AccountReconciliationPage {...props} />
    </div>
  );
}
