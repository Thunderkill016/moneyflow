// Account reconciliation domain — port of src/lib/reconciliation.ts plus
// the Neon-Data-API read resilience the workspace needs.
//
// Money rules: every amount is integer đồng (statement_balance_minor /
// cleared_balance_minor / difference_minor), never a double. The
// difference sign fixes the adjustment kind — income when the statement
// exceeds the cleared ledger, expense when it falls short — and a nonzero
// difference NEVER auto-fixes: completion either locks a zero gap or posts
// the explicit adjustment transaction the user picked.

import 'models.dart';
import 'register.dart';

/// Entry-leg state — mirrors public.entry_reconciliation_state.
/// 'reconciled' is server-owned (locked by a completed period); the
/// set-state RPC only accepts 'pending' | 'cleared'.
enum EntryReconciliationState { pending, cleared, reconciled }

/// Session status — mirrors public.account_reconciliation_status.
enum ReconciliationStatus { open, completed }

EntryReconciliationState entryStateFromString(String raw) => switch (raw) {
  'cleared' => EntryReconciliationState.cleared,
  'reconciled' => EntryReconciliationState.reconciled,
  _ => EntryReconciliationState.pending,
};

/// Wire literal for the RPC's enum parameter.
String entryStateWire(EntryReconciliationState state) => state.name;

/// Vietnamese badge — mirrors the web's entryStateLabel.
String entryStateLabel(EntryReconciliationState state) => switch (state) {
  EntryReconciliationState.cleared => 'Đã khớp',
  EntryReconciliationState.reconciled => 'Đã đối soát',
  EntryReconciliationState.pending => 'Chờ đối chiếu',
};

/// One logical (transaction, account) leg from
/// public.account_reconciliation_entry_feed. Split expenses collapse to a
/// single representative [entryId]; the two legs of a transfer stay
/// account-independent, so toggling here never touches the other account.
class ReconciliationEntryRow {
  const ReconciliationEntryRow({
    required this.entryId,
    required this.transactionId,
    required this.accountId,
    required this.state,
    required this.entryCount,
    this.clearedAt,
    this.reconciliationId,
  });

  final String entryId;
  final String transactionId;
  final String accountId;
  final EntryReconciliationState state;
  final String? clearedAt;
  final String? reconciliationId;

  /// Split-line count behind the leg (1 for ordinary rows).
  final int entryCount;
}

/// One statement period — mirrors public.account_reconciliation_summaries.
///
/// [clearedBalance], [difference] and the three leg counts are "live"
/// fields: the summaries view always fills them, but a session read
/// through the base-table fallback arrives with them null while open —
/// [resolveSessionSnapshots] then computes them from the merged register.
/// Completed rows always carry the values stored at completion time.
class ReconciliationSession {
  const ReconciliationSession({
    required this.id,
    required this.accountId,
    required this.statementDate,
    required this.statementBalance,
    required this.status,
    this.calculatedBalance,
    this.clearedBalance,
    this.difference,
    this.pendingLegCount,
    this.clearedLegCount,
    this.reconciledLegCount,
    this.startedAt,
    this.completedAt,
    this.lastReopenedAt,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String accountId;

  /// Statement end date, YYYY-MM-DD.
  final String statementDate;

  /// Stated end-of-period balance, integer đồng.
  final int statementBalance;
  final ReconciliationStatus status;

  /// Balance the server stored at completion (null while open).
  final int? calculatedBalance;

  /// initial_balance + every cleared/reconciled leg up to [statementDate].
  final int? clearedBalance;

  /// statementBalance − clearedBalance. Positive = statement above ledger
  /// (income adjustment), negative = ledger above statement (expense).
  final int? difference;

  /// Leg counts inside the period (pending / cleared / reconciled).
  final int? pendingLegCount;
  final int? clearedLegCount;
  final int? reconciledLegCount;

  final String? startedAt;
  final String? completedAt;
  final String? lastReopenedAt;
  final String? createdAt;
  final String? updatedAt;

  ReconciliationSession copyWith({
    int? clearedBalance,
    int? difference,
    int? pendingLegCount,
    int? clearedLegCount,
    int? reconciledLegCount,
  }) => ReconciliationSession(
    id: id,
    accountId: accountId,
    statementDate: statementDate,
    statementBalance: statementBalance,
    status: status,
    calculatedBalance: calculatedBalance,
    clearedBalance: clearedBalance ?? this.clearedBalance,
    difference: difference ?? this.difference,
    pendingLegCount: pendingLegCount ?? this.pendingLegCount,
    clearedLegCount: clearedLegCount ?? this.clearedLegCount,
    reconciledLegCount: reconciledLegCount ?? this.reconciledLegCount,
    startedAt: startedAt,
    completedAt: completedAt,
    lastReopenedAt: lastReopenedAt,
    createdAt: createdAt,
    updatedAt: updatedAt,
  );
}

/// The account's reconciliation read model — the mobile counterpart of
/// the web's AccountReconciliationStateData.
class ReconciliationStateData {
  const ReconciliationStateData({
    required this.featureAvailable,
    required this.rows,
    required this.sessions,
  });

  /// False when the reconciliation contract is not deployed server-side
  /// (missing view/table/function) — the feature hides instead of
  /// pretending every read failed.
  final bool featureAvailable;

  final List<ReconciliationEntryRow> rows;
  final List<ReconciliationSession> sessions;
}

/// A register row joined to its reconciliation leg — the mobile
/// counterpart of the web's AccountReconciliationEntry.
class ReconciliationWorkspaceEntry {
  const ReconciliationWorkspaceEntry({
    required this.register,
    required this.row,
  });

  final AccountRegisterEntry register;
  final ReconciliationEntryRow row;

  Transaction get transaction => register.transaction;
  int get impact => register.impact;
  RegisterDirection get direction => register.direction;
  String? get transferCounterparty => register.transferCounterparty;
  EntryReconciliationState get state => row.state;
  String get entryId => row.entryId;
  int get entryCount => row.entryCount;
}

class ReconciliationWorkspace {
  const ReconciliationWorkspace({
    required this.entries,
    required this.sessions,
    required this.completedSessions,
    this.openSession,
  });

  /// Register entries that have a reconciliation leg, newest first.
  final List<ReconciliationWorkspaceEntry> entries;
  final List<ReconciliationSession> sessions;
  final ReconciliationSession? openSession;
  final List<ReconciliationSession> completedSessions;
}

/// YYYY-MM-DD → DD/MM/YYYY (the web's displayDate).
String displayDate(String date) {
  final parts = date.split('-');
  return parts.length == 3 ? '${parts[2]}/${parts[1]}/${parts[0]}' : date;
}

/// Statement-period title — the web's sessionTitle.
String sessionTitle(ReconciliationSession session) =>
    session.status == ReconciliationStatus.open
    ? 'Kỳ sao kê ${displayDate(session.statementDate)} đang mở'
    : 'Kỳ sao kê ${displayDate(session.statementDate)}';

/// Fixed note written on every reconciliation adjustment transaction —
/// kept in lockstep with complete_account_reconciliation's default label.
String reconciliationAdjustmentNote(String statementDate) =>
    'Điều chỉnh đối soát — sao kê ${displayDate(statementDate)}';

/// Kind forced by the sign of the statement-vs-cleared difference — the
/// server enforces the same rule (category_kind_mismatch otherwise).
TransactionKind reconciliationAdjustmentKind(int difference) =>
    difference > 0 ? TransactionKind.income : TransactionKind.expense;

int _sessionNewestFirst(ReconciliationSession a, ReconciliationSession b) {
  final byDate = b.statementDate.compareTo(a.statementDate);
  if (byDate != 0) return byDate;
  final byCreated = (b.createdAt ?? '').compareTo(a.createdAt ?? '');
  if (byCreated != 0) return byCreated;
  return b.id.compareTo(a.id);
}

/// Joins the register to the reconciliation rows by transaction id —
/// mirror of mergeAccountReconciliationWorkspace. A register row without
/// a feed leg (impossible under the contract) is dropped, never faked.
ReconciliationWorkspace mergeReconciliationWorkspace(
  List<AccountRegisterEntry> registerEntries,
  ReconciliationStateData data,
) {
  final byTransaction = {for (final r in data.rows) r.transactionId: r};
  final entries = [
    for (final e in registerEntries)
      if (byTransaction[e.transaction.id] case final row?)
        ReconciliationWorkspaceEntry(register: e, row: row),
  ];
  final sessions = [...data.sessions]..sort(_sessionNewestFirst);
  ReconciliationSession? open;
  final completed = <ReconciliationSession>[];
  for (final s in sessions) {
    if (s.status == ReconciliationStatus.open) {
      open ??= s;
    } else {
      completed.add(s);
    }
  }
  return ReconciliationWorkspace(
    entries: entries,
    sessions: sessions,
    openSession: open,
    completedSessions: completed,
  );
}

/// Only transactions on or before the statement date count this period.
bool isEntryEligibleForSession(
  ReconciliationWorkspaceEntry entry,
  String statementDate,
) => entry.transaction.occurredOn.compareTo(statementDate) <= 0;

/// Live session values — the same math
/// public.reconciliation_snapshot_for_user runs: cleared balance starts
/// at the account's initial balance and adds every cleared/reconciled
/// leg dated on or before the statement date; counts split legs by
/// state. Only eligible rows count.
({int clearedBalance, int pending, int cleared, int reconciled})
calculateSessionSnapshot(
  int initialBalance,
  List<ReconciliationWorkspaceEntry> entries,
  String statementDate,
) {
  var clearedBalance = initialBalance;
  var pending = 0;
  var cleared = 0;
  var reconciled = 0;
  for (final e in entries) {
    if (!isEntryEligibleForSession(e, statementDate)) continue;
    switch (e.state) {
      case EntryReconciliationState.pending:
        pending++;
      case EntryReconciliationState.cleared:
        clearedBalance += e.impact;
        cleared++;
      case EntryReconciliationState.reconciled:
        clearedBalance += e.impact;
        reconciled++;
    }
  }
  return (
    clearedBalance: clearedBalance,
    pending: pending,
    cleared: cleared,
    reconciled: reconciled,
  );
}

/// Fills the live fields of open sessions whose source could not compute
/// them — the base-table fallback used when the summaries view hits the
/// invoker wall. Values already present (every completed row, anything
/// the view itself returned) are never overwritten: server truth wins.
/// Mirrors the web's withRecalculatedOpenSessions demo helper.
ReconciliationStateData resolveSessionSnapshots({
  required ReconciliationStateData data,
  required List<AccountRegisterEntry> registerEntries,
  required int initialBalance,
}) {
  var needsWork = false;
  for (final s in data.sessions) {
    if (s.status == ReconciliationStatus.open && s.clearedBalance == null) {
      needsWork = true;
      break;
    }
  }
  if (!needsWork) return data;
  final workspace = mergeReconciliationWorkspace(registerEntries, data);
  final sessions = [
    for (final s in data.sessions)
      if (s.status == ReconciliationStatus.open && s.clearedBalance == null)
        () {
          final snap = calculateSessionSnapshot(
            initialBalance,
            workspace.entries,
            s.statementDate,
          );
          return s.copyWith(
            clearedBalance: snap.clearedBalance,
            difference: s.statementBalance - snap.clearedBalance,
            pendingLegCount: snap.pending,
            clearedLegCount: snap.cleared,
            reconciledLegCount: snap.reconciled,
          );
        }()
      else
        s,
  ];
  return ReconciliationStateData(
    featureAvailable: data.featureAvailable,
    rows: data.rows,
    sessions: sessions,
  );
}

/// The most recent completed period — reopen is only ever offered on it.
ReconciliationSession? latestCompletedSession(
  List<ReconciliationSession> sessions,
) {
  ReconciliationSession? latest;
  for (final s in sessions) {
    if (s.status != ReconciliationStatus.completed) continue;
    if (latest == null || _sessionNewestFirst(s, latest) < 0) latest = s;
  }
  return latest;
}

/// Mirror of the web's canReopenSession + the RPC's own gate: only the
/// latest completed period, and only while no period is open (the server
/// raises only_latest_reconciliation_can_reopen otherwise).
bool canReopenSession(
  ReconciliationSession session,
  List<ReconciliationSession> all,
) {
  if (session.status != ReconciliationStatus.completed) return false;
  if (all.any((s) => s.status == ReconciliationStatus.open)) return false;
  return latestCompletedSession(all)?.id == session.id;
}

/// The register's one-line status surface — open period first, then the
/// latest completed statement date, else an honest empty state. Null
/// means the feature is not deployed, so the strip hides entirely.
String? reconciliationStatusLabel(ReconciliationStateData data) {
  if (!data.featureAvailable) return null;
  for (final s in data.sessions) {
    if (s.status == ReconciliationStatus.open) {
      return 'Đang đối soát kỳ sao kê ${displayDate(s.statementDate)}';
    }
  }
  final latest = latestCompletedSession(data.sessions);
  if (latest != null) {
    return 'Đã đối soát đến ${displayDate(latest.statementDate)}';
  }
  return 'Chưa có kỳ đối soát';
}

/// The response body of a NeonAuthException — its message shape is
/// 'host/path -> body', and the path legitimately contains the
/// endpoint's own name (the view or the rpc function). Contract signals
/// therefore must be read from the body alone, or every error from a
/// reconciliation endpoint would masquerade as "contract missing".
String _errorBody(Object error) {
  final msg = error.toString();
  final split = msg.indexOf(' -> ');
  return split >= 0 ? msg.substring(split + 4) : msg;
}

/// True when an error says the reconciliation contract itself is absent —
/// mirror of the web's isMissingContract (missing view/table/function).
/// Codes can match the whole message; object names only the body — see
/// [_errorBody].
bool isMissingReconciliationContract(Object error) {
  final msg = error.toString();
  if (msg.contains('42P01') ||
      msg.contains('42883') ||
      msg.contains('PGRST202') ||
      msg.contains('PGRST205')) {
    return true;
  }
  final body = _errorBody(error);
  return body.contains('account_reconciliation_entry_feed') ||
      body.contains('account_reconciliation_summaries') ||
      body.contains('start_account_reconciliation') ||
      body.contains('set_account_entry_reconciliation_state') ||
      body.contains('complete_account_reconciliation') ||
      body.contains('reopen_account_reconciliation') ||
      body.contains('Could not find the table') ||
      body.contains('Could not find the function');
}

/// Honest Vietnamese message for a failed reconciliation mutation —
/// field-for-field port of the web action's reconciliationError().
String reconciliationErrorMessage(Object error) {
  if (isMissingReconciliationContract(error)) {
    return 'Tính năng đối soát chưa được bật trên máy chủ.';
  }
  final msg = error.toString();
  if (msg.contains('invalid_statement_date')) {
    return 'Ngày sao kê chưa hợp lệ.';
  }
  if (msg.contains('invalid_statement_balance')) {
    return 'Số dư sao kê chưa hợp lệ.';
  }
  if (msg.contains('account_not_found')) {
    return 'Tài khoản không còn hoạt động hoặc không tồn tại.';
  }
  if (msg.contains('open_reconciliation_exists')) {
    return 'Tài khoản đang có một kỳ đối soát mở.';
  }
  if (msg.contains('statement_date_not_after_previous_reconciliation')) {
    return 'Ngày sao kê phải sau kỳ đối soát đã hoàn tất gần nhất.';
  }
  if (msg.contains('entry_not_found') ||
      msg.contains('transaction_not_found')) {
    return 'Giao dịch đã thay đổi hoặc không còn trong sổ tài khoản.';
  }
  if (msg.contains('transaction_deleted')) {
    return 'Giao dịch đã bị xóa nên không thể đối soát.';
  }
  if (msg.contains('entry_reconciled')) {
    return 'Giao dịch đã đối soát nên không thể đổi tại đây.';
  }
  if (msg.contains('open_reconciliation_not_found')) {
    return 'Kỳ đối soát không còn mở.';
  }
  if (msg.contains('reconciliation_difference_nonzero')) {
    return 'Chênh lệch phải bằng 0 trước khi hoàn tất.';
  }
  if (msg.contains('completed_reconciliation_not_found')) {
    return 'Không tìm thấy kỳ đối soát đã hoàn tất.';
  }
  if (msg.contains('only_latest_reconciliation_can_reopen')) {
    return 'Chỉ kỳ đã hoàn tất gần nhất mới có thể mở lại.';
  }
  if (msg.contains('category_kind_mismatch')) {
    return 'Danh mục điều chỉnh phải cùng loại thu hoặc chi với khoản chênh lệch.';
  }
  if (msg.contains('category_archived')) {
    return 'Danh mục điều chỉnh đã lưu trữ. Hãy chọn danh mục đang hoạt động.';
  }
  if (msg.contains('note_too_long')) return 'Ghi chú điều chỉnh quá dài.';
  if (msg.contains('payee_too_long')) return 'Tên đối tác điều chỉnh quá dài.';
  return 'Không cập nhật được đối soát. Hãy thử lại.';
}
