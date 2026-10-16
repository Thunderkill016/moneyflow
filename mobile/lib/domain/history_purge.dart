/// D21 — "Xóa lịch sử trước ngày": scoped retention purge
/// (RESEARCH_TOP_FINANCE_APPS.md §10; migration 20261017230000).
///
/// Client twin of `public.delete_transactions_before(date, text[])`: the
/// user picks a civil cutoff ('YYYY-MM-DD') and one or more source
/// buckets; the RPC hard-deletes every matching ledger row — live or
/// already trashed — in one transaction, deliberately OUTSIDE the trash
/// contract. There is no restore.
///
/// Rows a recurring schedule or a debt repayment still owns are never
/// swept: the RPC skips them and reports the count as `locked`, so the
/// UI discloses "kept" rows instead of claiming a clean sweep.
library;

/// The three source buckets the RPC accepts — anything else fails closed
/// server-side, so this enum is the complete client vocabulary.
enum HistoryPurgeSource {
  /// No provenance row, or provenance 'manual' — typed entries,
  /// transfers, reconciliation adjustments, web quick-capture.
  manual,

  /// provenance 'notification' — bank-SMS / notification captures
  /// approved from the inbox.
  notification,

  /// provenance csv / xlsx / pdf / paste / email / agent — every
  /// machine-ingested channel.
  imported,
}

/// Wire value for the RPC's `p_sources` element — kept in lockstep with
/// the accepted tokens in 20261017230000 (`imported` shortens to the
/// RPC's 'import' bucket name).
String historyPurgeSourceKey(HistoryPurgeSource s) => switch (s) {
  HistoryPurgeSource.manual => 'manual',
  HistoryPurgeSource.notification => 'notification',
  HistoryPurgeSource.imported => 'import',
};

/// vi-VN picker labels — the file channel reads as "nhập file" to the
/// user, not the English word "import".
String historyPurgeSourceLabel(HistoryPurgeSource s) => switch (s) {
  HistoryPurgeSource.manual => 'Nhập tay',
  HistoryPurgeSource.notification => 'Từ thông báo',
  HistoryPurgeSource.imported => 'Nhập file',
};

/// What the RPC reports back. The UI prints both numbers verbatim —
/// `locked` rows are schedule/debt-linked survivors, not failures — and
/// echoes the server's own [before] cutoff in the result copy.
typedef HistoryPurgeReport = ({int deleted, int locked, String before});

/// Fail-closed parse of the jsonb result — a shape the RPC never
/// promised throws rather than reporting a fake zero to the user.
HistoryPurgeReport parseHistoryPurgeReport(Object? json) {
  if (json is! Map) {
    throw StateError('purge_report_malformed');
  }
  final deleted = json['deleted'];
  final locked = json['locked'];
  final before = json['before'];
  if (deleted is! int || locked is! int || before is! String) {
    throw StateError('purge_report_malformed');
  }
  return (deleted: deleted, locked: locked, before: before);
}
