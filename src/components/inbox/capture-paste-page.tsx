"use client";

import Link from "next/link";
import { useState } from "react";
import { useDemoAccountOptions } from "@/hooks/use-demo-accounts";
import { AppShell } from "@/components/layout/app-shell";
import { Icon } from "@/components/icons";
import { LinkButton } from "@/components/ui/button";
import type { ViewerSummary } from "@/components/user-chip";
import type { AccountOption } from "@/lib/sample-data";
import { CapturePasteForm } from "./capture-paste-form";
import styles from "./capture-paste-page.module.css";

export function CapturePastePage({
  viewer,
  accounts: initialAccounts,
}: {
  viewer: ViewerSummary;
  accounts: AccountOption[];
}) {
  const accounts = useDemoAccountOptions(initialAccounts, viewer.isDemo);
  const [inboxCount, setInboxCount] = useState(0);
  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
      primaryAction={{ label: "Inbox", href: "/inbox", icon: "inbox" }}
    >
      <main className={styles.workspace}>
        <section className={styles.heading}>
          <div className={styles.headingCopy}>
            <p className={styles.back}>
              <Link href="/capture">← Capture</Link>
            </p>
            <h1>Dán nội dung giao dịch</h1>
            <p>
              Dán tin nhắn hoặc ghi chú, ví dụ “cafe 45k”. Xem lại gợi ý rồi đưa
              vào Inbox để duyệt.
            </p>
          </div>
          <LinkButton intent="secondary" targetSize="important" href="/inbox">
            <Icon name="inbox" />
            Về Inbox
          </LinkButton>
        </section>
        <CapturePasteForm
          isDemo={viewer.isDemo}
          accounts={accounts}
          onPendingCountChange={setInboxCount}
        />
      </main>
    </AppShell>
  );
}
