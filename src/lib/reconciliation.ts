import type { AccountRegisterEntry } from "./account-register.ts";

export type EntryReconciliationState = "pending" | "cleared" | "reconciled";
export type AccountReconciliationStatus = "open" | "completed";

export type ReconciliationEntryStateRow = {
  entryId: string;
  transactionId: string;
  accountId: string;
  state: EntryReconciliationState;
  clearedAt: string | null;
  reconciliationId: string | null;
  entryCount: number;
};

export type AccountReconciliationSession = {
  id: string;
  accountId: string;
  statementDate: string;
  statementBalance: number;
  status: AccountReconciliationStatus;
  calculatedBalance: number | null;
  clearedBalance: number;
  difference: number;
  pendingAccountLegCount: number;
  clearedAccountLegCount: number;
  reconciledAccountLegCount: number;
  startedAt: string;
  completedAt: string | null;
  lastReopenedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountReconciliationStateData = {
  featureAvailable: boolean;
  rows: ReconciliationEntryStateRow[];
  sessions: AccountReconciliationSession[];
  dataError: string | null;
};

export type AccountReconciliationEntry = AccountRegisterEntry &
  ReconciliationEntryStateRow;

export type AccountReconciliationWorkspace = {
  entries: AccountReconciliationEntry[];
  sessions: AccountReconciliationSession[];
  openSession: AccountReconciliationSession | null;
  completedSessions: AccountReconciliationSession[];
};

export type DemoReconciliationMutationResult =
  | { ok: true; stateData: AccountReconciliationStateData }
  | { ok: false; message: string };

function isSafeMoney(value: number) {
  return Number.isSafeInteger(value);
}

function sessionNewestFirst(
  left: AccountReconciliationSession,
  right: AccountReconciliationSession,
) {
  return (
    right.statementDate.localeCompare(left.statementDate) ||
    right.createdAt.localeCompare(left.createdAt) ||
    right.id.localeCompare(left.id)
  );
}

export function entryStateLabel(state: EntryReconciliationState) {
  if (state === "cleared") return "Đã khớp";
  if (state === "reconciled") return "Đã đối soát";
  return "Chờ đối chiếu";
}

export function buildDemoReconciliationRows(
  entries: AccountRegisterEntry[],
  accountId: string,
): ReconciliationEntryStateRow[] {
  return entries.map((entry) => ({
    entryId: `demo-entry:${accountId}:${entry.transaction.id}`,
    transactionId: entry.transaction.id,
    accountId,
    state: "pending",
    clearedAt: null,
    reconciliationId: null,
    entryCount: Math.max(1, entry.transaction.splits?.length ?? 1),
  }));
}

export function mergeDemoReconciliationRows(
  storedRows: ReconciliationEntryStateRow[],
  currentRows: ReconciliationEntryStateRow[],
) {
  const storedByTransaction = new Map(
    storedRows.map((row) => [row.transactionId, row] as const),
  );
  return currentRows.map((row) => {
    const stored = storedByTransaction.get(row.transactionId);
    if (!stored || stored.accountId !== row.accountId) return row;
    return {
      ...row,
      state: stored.state,
      clearedAt: stored.clearedAt,
      reconciliationId: stored.reconciliationId,
    };
  });
}

export function mergeAccountReconciliationWorkspace(
  registerEntries: AccountRegisterEntry[],
  stateData: AccountReconciliationStateData,
): AccountReconciliationWorkspace {
  const rowsByTransaction = new Map(
    stateData.rows.map((row) => [row.transactionId, row] as const),
  );
  const entries = registerEntries.flatMap((registerEntry) => {
    const row = rowsByTransaction.get(registerEntry.transaction.id);
    return row ? [{ ...registerEntry, ...row }] : [];
  });
  const sessions = [...stateData.sessions].sort(sessionNewestFirst);
  return {
    entries,
    sessions,
    openSession: sessions.find((session) => session.status === "open") ?? null,
    completedSessions: sessions.filter((session) => session.status === "completed"),
  };
}

export function isEntryEligibleForSession(
  entry: AccountReconciliationEntry,
  statementDate: string,
) {
  return entry.transaction.occurredOn <= statementDate;
}

export function calculateOpenSessionSnapshot(
  initialBalance: number,
  entries: AccountReconciliationEntry[],
  statementDate: string,
) {
  let clearedBalance = initialBalance;
  let pendingAccountLegCount = 0;
  let clearedAccountLegCount = 0;
  let reconciledAccountLegCount = 0;

  for (const entry of entries) {
    if (!isEntryEligibleForSession(entry, statementDate)) continue;
    if (entry.state === "pending") {
      pendingAccountLegCount += 1;
      continue;
    }
    clearedBalance += entry.impact;
    if (entry.state === "cleared") clearedAccountLegCount += 1;
    else reconciledAccountLegCount += 1;
  }

  if (!isSafeMoney(clearedBalance)) throw new Error("invalid_reconciliation_balance");
  return {
    clearedBalance,
    pendingAccountLegCount,
    clearedAccountLegCount,
    reconciledAccountLegCount,
  };
}

export function latestCompletedSession(
  sessions: AccountReconciliationSession[],
) {
  return [...sessions]
    .filter((session) => session.status === "completed")
    .sort(sessionNewestFirst)[0] ?? null;
}

export function canReopenSession(
  session: AccountReconciliationSession,
  sessions: AccountReconciliationSession[],
) {
  if (session.status !== "completed") return false;
  if (sessions.some((item) => item.status === "open")) return false;
  return latestCompletedSession(sessions)?.id === session.id;
}

function withRecalculatedOpenSessions(
  stateData: AccountReconciliationStateData,
  registerEntries: AccountRegisterEntry[],
  accountId: string,
  initialBalance: number,
): AccountReconciliationStateData {
  const workspace = mergeAccountReconciliationWorkspace(registerEntries, stateData);
  const sessions = workspace.sessions.map((session) => {
    if (session.status !== "open" || session.accountId !== accountId) return session;
    const snapshot = calculateOpenSessionSnapshot(
      initialBalance,
      workspace.entries,
      session.statementDate,
    );
    return {
      ...session,
      clearedBalance: snapshot.clearedBalance,
      difference: session.statementBalance - snapshot.clearedBalance,
      pendingAccountLegCount: snapshot.pendingAccountLegCount,
      clearedAccountLegCount: snapshot.clearedAccountLegCount,
      reconciledAccountLegCount: snapshot.reconciledAccountLegCount,
    };
  });
  return { ...stateData, sessions };
}

export function refreshDemoAccountReconciliationState({
  stateData,
  registerEntries,
  accountId,
  initialBalance,
}: {
  stateData: AccountReconciliationStateData;
  registerEntries: AccountRegisterEntry[];
  accountId: string;
  initialBalance: number;
}) {
  const rows = mergeDemoReconciliationRows(
    stateData.rows,
    buildDemoReconciliationRows(registerEntries, accountId),
  );
  return withRecalculatedOpenSessions(
    { ...stateData, featureAvailable: true, rows, dataError: null },
    registerEntries,
    accountId,
    initialBalance,
  );
}

export function startDemoAccountReconciliation({
  stateData,
  registerEntries,
  accountId,
  initialBalance,
  statementDate,
  statementBalance,
  today,
  now,
  reconciliationId,
}: {
  stateData: AccountReconciliationStateData;
  registerEntries: AccountRegisterEntry[];
  accountId: string;
  initialBalance: number;
  statementDate: string;
  statementBalance: number;
  today: string;
  now: string;
  reconciliationId: string;
}): DemoReconciliationMutationResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(statementDate) || statementDate > today) {
    return { ok: false, message: "Ngày sao kê chưa hợp lệ." };
  }
  if (!isSafeMoney(statementBalance)) {
    return { ok: false, message: "Số dư sao kê chưa hợp lệ." };
  }
  if (stateData.sessions.some((session) => session.status === "open")) {
    return { ok: false, message: "Tài khoản đang có một kỳ đối soát mở." };
  }
  const latest = latestCompletedSession(stateData.sessions);
  if (latest && latest.statementDate >= statementDate) {
    return {
      ok: false,
      message: "Ngày sao kê phải sau kỳ đối soát đã hoàn tất gần nhất.",
    };
  }

  const rows = mergeDemoReconciliationRows(
    stateData.rows,
    buildDemoReconciliationRows(registerEntries, accountId),
  );
  const baseState = { ...stateData, featureAvailable: true, rows, dataError: null };
  const workspace = mergeAccountReconciliationWorkspace(registerEntries, baseState);
  const snapshot = calculateOpenSessionSnapshot(
    initialBalance,
    workspace.entries,
    statementDate,
  );
  const session: AccountReconciliationSession = {
    id: reconciliationId,
    accountId,
    statementDate,
    statementBalance,
    status: "open",
    calculatedBalance: null,
    clearedBalance: snapshot.clearedBalance,
    difference: statementBalance - snapshot.clearedBalance,
    pendingAccountLegCount: snapshot.pendingAccountLegCount,
    clearedAccountLegCount: snapshot.clearedAccountLegCount,
    reconciledAccountLegCount: snapshot.reconciledAccountLegCount,
    startedAt: now,
    completedAt: null,
    lastReopenedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  return { ok: true, stateData: { ...baseState, sessions: [session, ...baseState.sessions] } };
}

export function setDemoAccountEntryReconciliationState({
  stateData,
  registerEntries,
  accountId,
  initialBalance,
  entryId,
  state,
  now,
}: {
  stateData: AccountReconciliationStateData;
  registerEntries: AccountRegisterEntry[];
  accountId: string;
  initialBalance: number;
  entryId: string;
  state: Exclude<EntryReconciliationState, "reconciled">;
  now: string;
}): DemoReconciliationMutationResult {
  const current = stateData.rows.find((row) => row.entryId === entryId);
  if (!current || current.accountId !== accountId) {
    return { ok: false, message: "Giao dịch không còn trong sổ tài khoản." };
  }
  if (current.state === "reconciled") {
    return { ok: false, message: "Giao dịch đã đối soát nên không thể đổi tại đây." };
  }
  const rows = stateData.rows.map((row) =>
    row.entryId === entryId
      ? {
          ...row,
          state,
          clearedAt: state === "cleared" ? row.clearedAt ?? now : null,
          reconciliationId: null,
        }
      : row,
  );
  return {
    ok: true,
    stateData: withRecalculatedOpenSessions(
      { ...stateData, rows },
      registerEntries,
      accountId,
      initialBalance,
    ),
  };
}

export function completeDemoAccountReconciliation({
  stateData,
  registerEntries,
  accountId,
  initialBalance,
  reconciliationId,
  now,
}: {
  stateData: AccountReconciliationStateData;
  registerEntries: AccountRegisterEntry[];
  accountId: string;
  initialBalance: number;
  reconciliationId: string;
  now: string;
}): DemoReconciliationMutationResult {
  const refreshed = withRecalculatedOpenSessions(
    stateData,
    registerEntries,
    accountId,
    initialBalance,
  );
  const session = refreshed.sessions.find(
    (item) => item.id === reconciliationId && item.status === "open",
  );
  if (!session) return { ok: false, message: "Kỳ đối soát không còn mở." };
  if (session.difference !== 0) {
    return { ok: false, message: "Chênh lệch phải bằng 0 trước khi hoàn tất." };
  }

  const eligibleTransactions = new Set(
    registerEntries
      .filter((entry) => entry.transaction.occurredOn <= session.statementDate)
      .map((entry) => entry.transaction.id),
  );
  const rows = refreshed.rows.map((row) =>
    row.accountId === accountId &&
    row.state === "cleared" &&
    eligibleTransactions.has(row.transactionId)
      ? {
          ...row,
          state: "reconciled" as const,
          reconciliationId,
          clearedAt: row.clearedAt ?? now,
        }
      : row,
  );
  const sessions = refreshed.sessions.map((item) =>
    item.id === reconciliationId
      ? {
          ...item,
          status: "completed" as const,
          calculatedBalance: item.clearedBalance,
          difference: 0,
          clearedAccountLegCount: 0,
          reconciledAccountLegCount:
            item.reconciledAccountLegCount + item.clearedAccountLegCount,
          completedAt: now,
          updatedAt: now,
        }
      : item,
  );
  return { ok: true, stateData: { ...refreshed, rows, sessions } };
}

export function reopenDemoAccountReconciliation({
  stateData,
  registerEntries,
  accountId,
  initialBalance,
  reconciliationId,
  now,
}: {
  stateData: AccountReconciliationStateData;
  registerEntries: AccountRegisterEntry[];
  accountId: string;
  initialBalance: number;
  reconciliationId: string;
  now: string;
}): DemoReconciliationMutationResult {
  const session = stateData.sessions.find((item) => item.id === reconciliationId);
  if (!session || !canReopenSession(session, stateData.sessions)) {
    return { ok: false, message: "Chỉ kỳ đã hoàn tất gần nhất mới có thể mở lại." };
  }
  const rows = stateData.rows.map((row) =>
    row.accountId === accountId &&
    row.reconciliationId === reconciliationId &&
    row.state === "reconciled"
      ? { ...row, state: "cleared" as const, reconciliationId: null }
      : row,
  );
  const sessions = stateData.sessions.map((item) =>
    item.id === reconciliationId
      ? {
          ...item,
          status: "open" as const,
          calculatedBalance: null,
          completedAt: null,
          lastReopenedAt: now,
          updatedAt: now,
        }
      : item,
  );
  return {
    ok: true,
    stateData: withRecalculatedOpenSessions(
      { ...stateData, rows, sessions },
      registerEntries,
      accountId,
      initialBalance,
    ),
  };
}

export function emptyReconciliationState(
  featureAvailable = true,
): AccountReconciliationStateData {
  return {
    featureAvailable,
    rows: [],
    sessions: [],
    dataError: null,
  };
}

export function sanitizeStoredDemoReconciliationState(
  value: unknown,
  accountId: string,
): AccountReconciliationStateData {
  if (!value || typeof value !== "object") return emptyReconciliationState();
  const candidate = value as Partial<AccountReconciliationStateData>;
  const rows = Array.isArray(candidate.rows)
    ? candidate.rows.filter((row): row is ReconciliationEntryStateRow => {
        if (!row || typeof row !== "object") return false;
        const item = row as ReconciliationEntryStateRow;
        return (
          typeof item.entryId === "string" &&
          typeof item.transactionId === "string" &&
          item.accountId === accountId &&
          ["pending", "cleared", "reconciled"].includes(item.state) &&
          (item.clearedAt === null || typeof item.clearedAt === "string") &&
          (item.reconciliationId === null || typeof item.reconciliationId === "string") &&
          Number.isSafeInteger(item.entryCount) &&
          item.entryCount > 0
        );
      })
    : [];
  const sessions = Array.isArray(candidate.sessions)
    ? candidate.sessions.filter((session): session is AccountReconciliationSession => {
        if (!session || typeof session !== "object") return false;
        const item = session as AccountReconciliationSession;
        return (
          typeof item.id === "string" &&
          item.accountId === accountId &&
          /^\d{4}-\d{2}-\d{2}$/.test(item.statementDate) &&
          isSafeMoney(item.statementBalance) &&
          (item.calculatedBalance === null || isSafeMoney(item.calculatedBalance)) &&
          isSafeMoney(item.clearedBalance) &&
          isSafeMoney(item.difference) &&
          Number.isSafeInteger(item.pendingAccountLegCount) &&
          item.pendingAccountLegCount >= 0 &&
          Number.isSafeInteger(item.clearedAccountLegCount) &&
          item.clearedAccountLegCount >= 0 &&
          Number.isSafeInteger(item.reconciledAccountLegCount) &&
          item.reconciledAccountLegCount >= 0 &&
          typeof item.startedAt === "string" &&
          (item.completedAt === null || typeof item.completedAt === "string") &&
          (item.lastReopenedAt === null || typeof item.lastReopenedAt === "string") &&
          typeof item.createdAt === "string" &&
          typeof item.updatedAt === "string" &&
          ["open", "completed"].includes(item.status)
        );
      })
    : [];
  return {
    featureAvailable: true,
    rows,
    sessions,
    dataError: null,
  };
}
