"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import type { ViewerSummary } from "@/components/user-chip";
import { loadInboxForClient } from "@/hooks/client-inbox";
import {
  buildActivityItems,
  countActivityAttention,
  countIncomingActivity,
  filterActivityItems,
  type ActivityFilter,
  type ActivityItem,
} from "@/lib/activity";
import type { InboxCandidate } from "@/lib/inbox/candidate-store";
import { annotateCandidates } from "@/lib/inbox/detect";
import type { CandidateProvenance } from "@/lib/inbox/provenance";
import type {
  AccountOption,
  CategoryOption,
  Transaction,
} from "@/lib/transactions/contracts";
import styles from "./activity-workspace.module.css";

type ActivityWorkspaceData = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  dataError: string | null;
};

type CandidateLoadState = "loading" | "ready" | "error";

type ActivityCandidate = InboxCandidate & Partial<CandidateProvenance>;

const FILTERS: Array<{ id: ActivityFilter; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "attention", label: "Cần xử lý" },
  { id: "incoming", label: "Chờ vào sổ" },
  { id: "posted", label: "Đã vào sổ" },
];

function formatActivityDate(date: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(`${date}T00:00:00+07:00`));
  } catch {
    return date;
  }
}

function ledgerForDetection(transactions: Transaction[]) {
  return transactions.map((transaction) => ({
    id: transaction.id,
    kind: transaction.kind,
    amount: transaction.amount,
    occurredOn: transaction.occurredOn,
    note: transaction.note,
    account: transaction.account,
    accountId: transaction.accountId,
  }));
}

function groupByDate(items: ActivityItem[]) {
  const groups = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const group = groups.get(item.occurredOn) ?? [];
    group.push(item);
    groups.set(item.occurredOn, group);
  }
  return [...groups.entries()];
}

function emptyMessage(filter: ActivityFilter, query: string) {
  if (query.trim()) {
    return {
      title: "Không tìm thấy hoạt động",
      detail: "Thử từ khóa khác hoặc đổi bộ lọc.",
    };
  }
  if (filter === "attention") {
    return {
      title: "Không có mục nào cần xử lý",
      detail: "Những mục đang chờ duyệt hoặc cần xem lại sẽ xuất hiện ở đây.",
    };
  }
  if (filter === "incoming") {
    return {
      title: "Không có mục chờ vào sổ",
      detail: "Dữ liệu từ paste hoặc import sẽ xuất hiện ở đây trước khi được ghi vào sổ.",
    };
  }
  if (filter === "posted") {
    return {
      title: "Chưa có giao dịch trong sổ",
      detail: "Giao dịch đã ghi sổ sẽ xuất hiện ở đây.",
    };
  }
  return {
    title: "Chưa có hoạt động",
    detail: "Ghi giao dịch hoặc đưa dữ liệu vào Cần xem để bắt đầu một dòng hoạt động thống nhất.",
  };
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <li className={styles.row} data-activity-type={item.type}>
      <div className={styles.rowMain}>
        <div className={styles.rowStateLine}>
          <span
            className={item.attention ? styles.stateAttention : styles.stateNeutral}
          >
            {item.stateLabel}
          </span>
          {item.type === "inbox_candidate" ? (
            <span className={styles.sourceLabel}>Nguồn: {item.sourceLabel}</span>
          ) : null}
        </div>
        <strong className={styles.rowTitle}>{item.primaryLabel}</strong>
        <span className={styles.rowMeta}>{item.secondaryLabel}</span>
        {item.type === "inbox_candidate" && item.provenanceLabel ? (
          <span className={styles.provenance}>{item.provenanceLabel}</span>
        ) : null}
        {item.type === "inbox_candidate" && item.attentionLabels.length > 0 ? (
          <span className={styles.reasonLine}>
            {item.attentionLabels.slice(0, 2).join(" · ")}
          </span>
        ) : null}
      </div>

      <div className={styles.rowAmount}>
        <MoneyValue
          amount={item.amount}
          mode="kind"
          kind={item.amountKind}
          direction
          emphasis="strong"
          label={item.primaryLabel}
        />
        <LinkButton
          href={item.href}
          variant={item.attention ? "secondary" : "ghost"}
          targetSize="important"
          className={styles.rowAction}
        >
          {item.actionLabel}
        </LinkButton>
      </div>
    </li>
  );
}

export function ActivityWorkspace({
  viewer,
  workspace,
}: {
  viewer: ViewerSummary;
  workspace: ActivityWorkspaceData;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [candidateState, setCandidateState] =
    useState<CandidateLoadState>("loading");
  const [candidates, setCandidates] = useState<ActivityCandidate[]>([]);
  const [candidateError, setCandidateError] = useState("");

  const loadCandidates = useCallback(async () => {
    setCandidateState("loading");
    setCandidateError("");
    const result = await loadInboxForClient(viewer.isDemo);
    if (!result.ok) {
      setCandidates([]);
      setCandidateError(result.message || "Không tải được nguồn chờ vào sổ.");
      setCandidateState("error");
      return;
    }
    setCandidates(result.candidates as ActivityCandidate[]);
    setCandidateState("ready");
  }, [viewer.isDemo]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await loadInboxForClient(viewer.isDemo);
      if (cancelled) return;
      if (!result.ok) {
        setCandidates([]);
        setCandidateError(result.message || "Không tải được nguồn chờ vào sổ.");
        setCandidateState("error");
        return;
      }
      setCandidates(result.candidates as ActivityCandidate[]);
      setCandidateState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [viewer.isDemo]);

  const detectedCandidates = useMemo(
    () =>
      annotateCandidates(candidates, ledgerForDetection(workspace.transactions)) as Array<
        ActivityCandidate & {
          fingerprint: string;
          possibleDuplicate: boolean;
          possibleTransfer: boolean;
        }
      >,
    [candidates, workspace.transactions],
  );

  const items = useMemo(
    () =>
      buildActivityItems({
        transactions: workspace.transactions,
        candidates: detectedCandidates,
        accounts: workspace.accounts,
        categories: workspace.categories,
      }),
    [
      detectedCandidates,
      workspace.accounts,
      workspace.categories,
      workspace.transactions,
    ],
  );

  const visibleItems = useMemo(
    () => filterActivityItems(items, filter, query),
    [filter, items, query],
  );
  const groups = useMemo(() => groupByDate(visibleItems), [visibleItems]);
  const attentionCount = useMemo(() => countActivityAttention(items), [items]);
  const incomingCount = useMemo(() => countIncomingActivity(items), [items]);
  const postedCount = items.length - incomingCount;
  const empty = emptyMessage(filter, query);

  return (
    <AppShell
      viewer={viewer}
      searchBar={{
        value: query,
        onChange: setQuery,
        placeholder: "Tìm trong hoạt động",
      }}
      inboxCount={incomingCount}
    >
      <main className={styles.workspace}>
        <header className={styles.header}>
          <div className={styles.titleCopy}>
            <span className={styles.eyebrow}>Activity 2.0 · MVP</span>
            <h1>Hoạt động</h1>
            <p>
              Một dòng công việc cho giao dịch đã vào sổ và dữ liệu đang chờ bạn xử lý.
            </p>
          </div>
          <LinkButton href="/capture" variant="outline" targetSize="important">
            Đưa dữ liệu vào
          </LinkButton>
        </header>

        <section className={styles.summary} aria-label="Tóm tắt hoạt động">
          <div className={styles.summaryItem}>
            <span>Cần xử lý</span>
            <strong>{attentionCount}</strong>
          </div>
          <div className={styles.summaryItem}>
            <span>Chờ vào sổ</span>
            <strong>{incomingCount}</strong>
          </div>
          <div className={styles.summaryItem}>
            <span>Đã vào sổ</span>
            <strong>{postedCount}</strong>
          </div>
        </section>

        {workspace.dataError ? (
          <Alert tone="error" live="polite">
            <AlertTitle>Phần giao dịch đã vào sổ chưa tải được</AlertTitle>
            <AlertDescription>
              {workspace.dataError} Các mục chờ vào sổ bên dưới không đại diện cho toàn bộ hoạt động tài chính.
            </AlertDescription>
          </Alert>
        ) : null}

        {candidateState === "error" ? (
          <Alert tone="warning" live="polite">
            <AlertTitle>Nguồn chờ vào sổ chưa tải được</AlertTitle>
            <AlertDescription className={styles.alertBody}>
              <span>
                {candidateError} Giao dịch đã vào sổ vẫn được hiển thị, nhưng danh sách Hoạt động hiện chưa đầy đủ.
              </span>
              <Button
                type="button"
                variant="outline"
                targetSize="important"
                onClick={() => void loadCandidates()}
              >
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <section className={styles.manager} aria-labelledby="activity-list-heading">
          <div className={styles.managerHeader}>
            <div>
              <h2 id="activity-list-heading">Dòng hoạt động</h2>
              <p>Phân biệt rõ việc còn chờ với dữ liệu đã thành giao dịch trong sổ.</p>
            </div>
            <div className={styles.filters} aria-label="Lọc hoạt động">
              {FILTERS.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={filter === item.id ? "secondary" : "ghost"}
                  targetSize="important"
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          {candidateState === "loading" ? (
            <div className={styles.loading} role="status" aria-live="polite">
              <strong>Đang ghép dòng hoạt động…</strong>
              <span>MoneyFlow đang kiểm tra cả giao dịch trong sổ và dữ liệu chờ xử lý.</span>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className={styles.empty}>
              <strong>{empty.title}</strong>
              <span>{empty.detail}</span>
              {filter === "all" && !query.trim() ? (
                <LinkButton href="/capture/quick" targetSize="important">
                  Ghi giao dịch đầu tiên
                </LinkButton>
              ) : null}
            </div>
          ) : (
            <div className={styles.timeline}>
              {groups.map(([date, dateItems]) => (
                <section className={styles.dayGroup} key={date}>
                  <h3>{formatActivityDate(date)}</h3>
                  <ul className={styles.list}>
                    {dateItems.map((item) => (
                      <ActivityRow item={item} key={item.key} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </section>

        <aside className={styles.boundaryNote} aria-label="Ranh giới dữ liệu Activity">
          <strong>Activity không tạo một sổ thứ hai.</strong>
          <span>
            “Chờ vào sổ” là bằng chứng/candidate. “Đã vào sổ” là giao dịch MoneyFlow. Trạng thái nguồn chỉ xuất hiện khi dữ liệu hiện có chứng minh được nó.
          </span>
        </aside>
      </main>
    </AppShell>
  );
}
