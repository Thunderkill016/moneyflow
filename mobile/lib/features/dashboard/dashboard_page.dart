import 'package:flutter/material.dart';
import '../../data/demo_store.dart';
import '../../data/offline_cache.dart';
import '../../data/recurring_dismissals.dart';
import '../../data/widget_snapshot.dart';
import '../../domain/budget.dart';
import '../../domain/commitments.dart';
import '../../domain/datetime_label.dart';
import '../../domain/inbox.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../domain/month_pace.dart';
import '../../domain/month_summary.dart';
import '../../domain/recurring_detection.dart';
import '../../domain/report.dart' show dateAdd, vnMonthStart, vnNow, ymd;
import '../../domain/safe_to_spend.dart';
import '../../domain/spoken_vnd.dart';
import '../../domain/watchlist.dart';
import '../../theme/mf_theme.dart';
import '../shared/empty_state.dart';

/// One entry in the dashboard "Khám phá" hub — keeps the appbar to a
/// single button as the surface count grows.
class DashboardMenuItem {
  const DashboardMenuItem({
    required this.label,
    required this.icon,
    required this.onTap,
    this.section,
    this.badge,
    this.danger = false,
    this.actsInPlace = false,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  /// Hub grouping — items render under their section header in first-
  /// seen order; null lands in the trailing unlabelled group.
  final String? section;

  /// Destructive entries (account deletion) render in the scheme's error
  /// color — the icon and label must read as dangerous at a glance, not
  /// rely on position next to sign-out.
  final bool danger;

  /// Optional live count — fetched when the hub opens (one cheap read
  /// per open, never per dashboard build). A failure or 0 shows the
  /// bare label — a badge must never lie.
  final Future<int> Function()? badge;

  /// True for actions that flip a setting immediately instead of
  /// navigating (digest/biometric toggles) — the row shows no chevron,
  /// because a chevron promises a destination.
  final bool actsInPlace;
}

/// Dashboard loads its data through injected loaders so the same screen
/// serves demo mode (local seeds) and authenticated mode (Neon Data API).
class DashboardPage extends StatefulWidget {
  const DashboardPage({
    super.key,
    required this.loadAccounts,
    required this.loadTransactions,
    this.loadBudgets,
    this.loadBudgetRange,
    this.loadCommitments,
    this.onOpenPlanning,
    this.loadSuggestionTransactions,
    this.loadSummaryTransactions,
    this.onOpenReports,
    this.loadWatchItems,
    this.saveWatchItems,
    this.onCreateCommitment,
    this.onCreateAccount,
    this.loadPendingCount,
    this.onOpenInbox,
    this.loadPendingPreviews,
    this.loadNeedsReview,
    this.onOpenNeedsReview,
    this.onOpenTransaction,
    this.onOpenAccount,
    this.modeLabel,
    this.menuItems = const [],
    this.readSnapshot,
    this.writeSnapshot,
    this.writeWidgetSnapshot,
    this.dismissalSync,
  });

  factory DashboardPage.demo({VoidCallback? onSignOut}) => DashboardPage(
    loadAccounts: () async => DemoStore.seedAccounts(),
    loadTransactions: () async => DemoStore.seedTransactions(),
    loadBudgetRange: (from, to) async => [
      ...DemoStore.seedPriorBudgets(to),
      ...DemoStore.seedBudgets(to),
    ],
    loadCommitments: (_) async => DemoStore.seedCommitments(),
    modeLabel: 'demo',
    menuItems: [
      if (onSignOut != null)
        DashboardMenuItem(
          label: 'Đăng xuất',
          icon: Icons.logout,
          onTap: onSignOut,
        ),
    ],
  );

  final Future<List<AccountSummary>> Function() loadAccounts;
  final Future<List<Transaction>> Function() loadTransactions;

  /// Optional planning loaders for the "Còn lại tháng này" card — all
  /// are keyed on YYYY-MM-01 month starts. When commitments (and any
  /// budget source) are absent the card is hidden entirely rather than
  /// guessing at a number.
  final Future<List<BudgetProgress>> Function(String monthStart)? loadBudgets;

  /// The rollover-window read (`loadBudgetsInRange` on the store): every
  /// budgeted month in [fromMonth]..[toMonth] inclusive. Preferred over
  /// [loadBudgets] when both are wired — one request feeds the card's
  /// month rows AND the carry its threshold alerts need to agree with
  /// the Kế hoạch tiles. Falling back to [loadBudgets] simply leaves the
  /// carry at zero, like a user with no budget history.
  final Future<List<BudgetProgress>> Function(String fromMonth, String toMonth)?
  loadBudgetRange;
  final Future<List<RecurringCommitment>> Function(String monthStart)?
  loadCommitments;

  /// "Mở Kế hoạch" on the no-budget nudge — the host switches to the
  /// planning tab. Null drops the button; the honest text stays.
  final VoidCallback? onOpenPlanning;

  /// Optional detection source for the recurring-suggestion card — the
  /// [from, to) range contract of RealStore.loadTransactionsInRange.
  /// Absent (or a failed read) simply means no card: the dashboard never
  /// invents a pattern to fill the slot.
  final Future<({List<Transaction> rows, bool truncated})> Function(
    String from,
    String to,
  )?
  loadSuggestionTransactions;

  /// Range loader for the month-summary card (D9) — same rows+truncated
  /// contract; a separate seam so each surface owns its window. The rows
  /// also feed the watchlist tile (D10): one read, both consumers.
  final Future<({List<Transaction> rows, bool truncated})> Function(
    String from,
    String to,
  )?
  loadSummaryTransactions;

  /// "Xem báo cáo tháng" on the month-summary card — the shell switches
  /// to the reports tab. Absent drops the button; the stats stay honest.
  final VoidCallback? onOpenReports;

  /// Watchlist pin store (D10) — device-local bookmarks, not financial
  /// truth. The seams stay explicit (the shell wires WatchlistPrefs in
  /// both modes): an absent pair renders the card pin-less rather than
  /// letting a widget reach into SharedPreferences on its own.
  final Future<List<WatchItem>> Function()? loadWatchItems;
  final Future<void> Function(List<WatchItem> items)? saveWatchItems;

  /// "Tạo cam kết" on a suggestion — the app shell opens the shared
  /// planning form prefilled and reports whether a real save happened.
  final Future<bool> Function(RecurringSuggestion suggestion)?
  onCreateCommitment;

  /// "Tạo ví đầu tiên" on the empty-ledger intro — the host opens its
  /// account-creation flow; when it returns the dashboard re-runs its
  /// loaders so a created wallet shows immediately. Null (demo, whose
  /// seeded accounts never reach the intro anyway) drops the button —
  /// no dead affordance pointing at a write the surface cannot do.
  final Future<void> Function()? onCreateAccount;

  /// Number of Inbox candidates waiting for review; null hides the card.
  final Future<int> Function()? loadPendingCount;

  /// Opens the Inbox ("Cần xem") from the review card.
  final VoidCallback? onOpenInbox;

  /// The newest pending candidates behind the count — the card's
  /// "merchant · amount" preview lines. Null (or a failed read) leaves
  /// the count bare rather than inventing names.
  final Future<List<InboxCandidate>> Function()? loadPendingPreviews;

  /// Posted ledger rows still flagged needs_review — count plus a small
  /// newest-first preview. Null hides that section (demo has no flagged
  /// seeds and no flag writes, so the row would always be zero).
  final Future<NeedsReviewTransactions> Function()? loadNeedsReview;

  /// Opens the activity feed pre-filtered to "Cần xem lại" — the
  /// needs-review row's destination. Null leaves the row an honest
  /// count line, never a dead chevron.
  final VoidCallback? onOpenNeedsReview;

  /// Opens a posted transaction for correction (same form as the Hoạt
  /// động tab). Null leaves the rows read-only.
  final void Function(Transaction tx)? onOpenTransaction;

  /// Opens an account's register — the same destination the Tài khoản
  /// page's row tap lands on. Null keeps wallet cards read-only.
  final void Function(AccountSummary account)? onOpenAccount;
  final String? modeLabel;
  final List<DashboardMenuItem> menuItems;

  /// Offline read-back: when the loaders throw and a snapshot exists, the
  /// dashboard renders it under an explicit stale label — never as fresh.
  final DashboardSnapshot? Function()? readSnapshot;

  /// Called with a fresh snapshot after every successful load.
  final Future<void> Function(DashboardSnapshot snapshot)? writeSnapshot;

  /// Called once planning rows resolve — the home-screen widget's
  /// last-known figures ride on the dashboard's load. Absent (demo)
  /// leaves the widget's stored value untouched; staleness is the
  /// widget's own honesty boundary.
  final Future<void> Function(WidgetSnapshot snapshot)? writeWidgetSnapshot;

  /// Server sync for recurring-suggestion dismissals — signed-in mode
  /// passes the store so "Ẩn" follows the account across devices; demo
  /// and a missing seam keep the decision device-local.
  final PatternDismissalSync? dismissalSync;

  @override
  State<DashboardPage> createState() => DashboardPageState();
}

/// Attention-card payload — three small advisory reads resolved
/// together so the card builds once. Each read fails soft on its own:
/// an attention surface must never fail the dashboard, and a missed
/// section just stays hidden rather than inventing a zero.
typedef _AttentionData = ({
  int pending,
  List<InboxCandidate> previews,
  NeedsReviewTransactions needsReview,
});

/// Loaded dashboard payload — planning rows ride along so the remainder
/// card renders in the same pass; they stay null when the loaders are
/// absent or their reads fail. [budgets] may span the whole rollover
/// window (when `loadBudgetRange` is wired) — consumers filter to the
/// viewed month themselves.
typedef _DashboardData = ({
  List<AccountSummary> accounts,
  List<Transaction> txs,
  int? savedAtMs,
  List<BudgetProgress>? budgets,
  List<RecurringCommitment>? commitments,
  List<RecurringSuggestion> suggestions,
  List<Transaction>? summaryRows,
  List<WatchItem> watchItems,
});

class DashboardPageState extends State<DashboardPage> {
  /// The "sắp đến hạn" forward window — Copilot's Upcoming glance
  /// scoped to one week; anything further out stays in Kế hoạch.
  static const _upcomingWindowDays = 7;

  late Future<_DashboardData> _data;

  /// Suggestions hidden this session — persisted dismissals are filtered
  /// at load; this set also covers a just-created commitment until the
  /// next load's coverage keys exclude the pattern for real.
  final _hiddenSuggestions = <String>{};

  @override
  void initState() {
    super.initState();
    _data = _load();
    _attention = _loadAttention();
  }

  late Future<_AttentionData> _attention;

  /// One pass over the attention reads — each optional and each allowed
  /// to fail alone, the same posture the old pending-count read took.
  Future<_AttentionData> _loadAttention() async {
    var pending = 0;
    var previews = const <InboxCandidate>[];
    var needsReview = (count: 0, rows: const <Transaction>[]);
    try {
      pending = await widget.loadPendingCount?.call() ?? 0;
    } catch (_) {}
    try {
      previews =
          await widget.loadPendingPreviews?.call() ?? const <InboxCandidate>[];
    } catch (_) {}
    try {
      needsReview =
          await widget.loadNeedsReview?.call() ??
          (count: 0, rows: const <Transaction>[]);
    } catch (_) {}
    return (pending: pending, previews: previews, needsReview: needsReview);
  }

  /// Fresh load wins; on failure the saved snapshot renders under a stale
  /// label. A snapshot is only a fallback — it never masks a loader error
  /// as success.
  Future<_DashboardData> _load() async {
    try {
      final accounts = await widget.loadAccounts();
      final txs = await widget.loadTransactions();
      final snap = DashboardSnapshot(
        savedAtMs: DateTime.now().millisecondsSinceEpoch,
        accounts: accounts,
        transactions: txs,
      );
      // Persisting must not fail the render path.
      await widget.writeSnapshot?.call(snap).catchError((_) {});
      final planning = await _loadPlanningRows();
      await _writeWidgetSnapshot(accounts, planning.$1, planning.$2);
      return (
        accounts: accounts,
        txs: txs,
        savedAtMs: null,
        budgets: planning.$1,
        commitments: planning.$2,
        suggestions: await _loadSuggestions(planning.$2),
        summaryRows: await _loadSummaryRows(),
        watchItems: await _loadWatchItems(),
      );
    } catch (e) {
      final cached = widget.readSnapshot?.call();
      if (cached == null) rethrow;
      return (
        accounts: cached.accounts,
        txs: cached.transactions,
        savedAtMs: cached.savedAtMs,
        budgets: null,
        commitments: null,
        suggestions: const <RecurringSuggestion>[],
        summaryRows: null,
        watchItems: const <WatchItem>[],
      );
    }
  }

  /// The watchlist pin store — advisory: an absent seam or a failed
  /// read shows no pins rather than failing the dashboard.
  Future<List<WatchItem>> _loadWatchItems() async {
    final loader = widget.loadWatchItems;
    if (loader == null) return const [];
    try {
      return await loader();
    } catch (_) {
      return const [];
    }
  }

  /// Persist a pin/unpin then reload — the card re-derives its totals
  /// from the same ledger read as the summary card. Writes are
  /// device-local bookmarks, so no server roundtrip and no confirm.
  /// A missing save seam should be unreachable (pin/unpin buttons only
  /// exist when the pair is wired), but a silent no-op beats a throw.
  Future<void> _saveWatchItems(List<WatchItem> items) async {
    await widget.saveWatchItems?.call(items);
    _refresh();
  }

  /// Pin sheet — candidates come from THIS month's loaded ledger rows
  /// (the summary read), never a preset taxonomy. An already-pinned
  /// name re-saves as a threshold update, not a duplicate.
  Future<void> _showWatchPin(List<Transaction> rows) async {
    var kind = WatchKind.category;
    var selected = '';
    final threshold = TextEditingController();
    String? error;
    final added = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) {
          final candidates = kind == WatchKind.category
              ? watchCandidateCategories(rows)
              : watchCandidatePayees(rows);
          if (selected.isNotEmpty && !candidates.contains(selected)) {
            selected = '';
          }
          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Theo dõi tháng này',
                  style: Theme.of(ctx).textTheme.titleMedium,
                ),
                const SizedBox(height: 12),
                SegmentedButton<WatchKind>(
                  segments: const [
                    ButtonSegment(
                      value: WatchKind.category,
                      label: Text('Danh mục'),
                      icon: Icon(Icons.category_outlined),
                    ),
                    ButtonSegment(
                      value: WatchKind.payee,
                      label: Text('Người nhận'),
                      icon: Icon(Icons.storefront_outlined),
                    ),
                  ],
                  selected: {kind},
                  onSelectionChanged: (s) => setSheet(() => kind = s.first),
                ),
                const SizedBox(height: 12),
                if (candidates.isEmpty)
                  Text(
                    kind == WatchKind.category
                        ? 'Chưa có khoản chi nào tháng này để ghim danh mục.'
                        : 'Chưa có khoản chi nào có người nhận tháng này.',
                    style: Theme.of(ctx).textTheme.bodySmall,
                  )
                else
                  DropdownButtonFormField<String>(
                    initialValue: selected.isEmpty ? null : selected,
                    decoration: InputDecoration(
                      labelText: kind == WatchKind.category
                          ? 'Danh mục'
                          : 'Người nhận',
                      border: const OutlineInputBorder(),
                    ),
                    items: [
                      for (final c in candidates)
                        DropdownMenuItem(value: c, child: Text(c)),
                    ],
                    onChanged: (v) => setSheet(() => selected = v ?? ''),
                  ),
                const SizedBox(height: 12),
                TextField(
                  controller: threshold,
                  decoration: const InputDecoration(
                    labelText: 'Ngưỡng cảnh báo (tuỳ chọn)',
                    hintText: 'vd: 1tr',
                    border: OutlineInputBorder(),
                  ),
                ),
                if (error != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    error!,
                    style: TextStyle(color: Theme.of(ctx).colorScheme.error),
                  ),
                ],
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('Hủy'),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      onPressed: selected.isEmpty
                          ? null
                          : () {
                              final t = threshold.text.trim();
                              final parsed = t.isEmpty
                                  ? null
                                  : parseMoneyInput(t);
                              if (t.isNotEmpty &&
                                  (parsed == null || parsed <= 0)) {
                                setSheet(() => error = 'Ngưỡng không hợp lệ');
                                return;
                              }
                              Navigator.pop(ctx, true);
                            },
                      child: const Text('Ghim'),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
    if (added != true || selected.isEmpty) return;
    final t = threshold.text.trim();
    final item = WatchItem(
      kind: kind,
      name: selected,
      thresholdMinor: t.isEmpty ? null : parseMoneyInput(t),
    );
    final items = [
      for (final i in await _loadWatchItems())
        if (i.key != item.key) i,
      item,
    ];
    await _saveWatchItems(items);
  }

  /// The month-summary card's read — advisory like the other optional
  /// surfaces: absent loader, a failed range, or a truncated tail all
  /// hide the card rather than show a partial month labeled whole.
  Future<List<Transaction>?> _loadSummaryRows() async {
    final loader = widget.loadSummaryTransactions;
    if (loader == null) return null;
    try {
      final range = monthSummaryLoadRange(vnNow());
      final result = await loader(range.from, range.to);
      if (result.truncated) return null;
      return result.rows;
    } catch (_) {
      return null;
    }
  }

  /// The remainder card is auxiliary — a planning-read failure hides the
  /// card rather than failing the whole dashboard. No fake numbers.
  ///
  /// The budget read prefers the rollover-window loader when wired: the
  /// same rows feed both the remainder figure (this month's rows) and
  /// the threshold alerts' carry, so the card can never contradict the
  /// Kế hoạch tiles a prior-month overspend produced.
  Future<(List<BudgetProgress>?, List<RecurringCommitment>?)>
  _loadPlanningRows() async {
    final range = widget.loadBudgetRange;
    if (widget.loadCommitments == null ||
        (widget.loadBudgets == null && range == null)) {
      return (null, null);
    }
    final monthStart = vnMonthStart();
    try {
      final budgets = range != null
          ? await range(budgetRolloverWindowStart(monthStart), monthStart)
          : await widget.loadBudgets!(monthStart);
      final commitments = await widget.loadCommitments!(monthStart);
      return (budgets, commitments);
    } catch (_) {
      return (null, null);
    }
  }

  /// Detection over the last ~6 months — advisory like the safe-spend
  /// tile: a failed range or dismissal read hides the card rather than
  /// failing the dashboard, and no commitments means coverage can't be
  /// checked so nothing is suggested (a re-suggestion would be a lie).
  Future<List<RecurringSuggestion>> _loadSuggestions(
    List<RecurringCommitment>? commitments,
  ) async {
    final loader = widget.loadSuggestionTransactions;
    if (loader == null || commitments == null) return const [];
    try {
      final today = vnNow();
      // A truncated tail only narrows what detection can see — the card
      // is advisory, so suggesting less stays honest.
      final range = await loader(
        recurringDetectionStart(today),
        ymd(dateAdd(today, 1)),
      );
      final covered = {
        for (final c in commitments.where((c) => !c.isArchived))
          ...recurringCommitmentKeys(c),
      };
      final dismissed = await RecurringDismissals.load(
        sync: widget.dismissalSync,
      );
      return detectRecurring(
        range.rows,
        covered,
        today: today,
      ).where((s) => !dismissed.contains(s.key)).toList();
    } catch (_) {
      return const [];
    }
  }

  /// "Ẩn" is permanent — the key lands in mf_recurring_dismissed and the
  /// pattern is filtered out on every later load. With a sync seam it
  /// also lands in pattern_dismissals so the choice follows the account.
  Future<void> _dismissSuggestion(RecurringSuggestion s) async {
    setState(() => _hiddenSuggestions.add(s.key));
    await RecurringDismissals.dismiss(s.key, sync: widget.dismissalSync);
  }

  /// The widget mirrors exactly what the card shows — the VND-only
  /// total, and the per-day figure only when planning data actually
  /// produced one (no budget means null, and the widget renders the
  /// same honest "—" the card's missing-tile case implies).
  /// Persisting must never fail the render path.
  Future<void> _writeWidgetSnapshot(
    List<AccountSummary> accounts,
    List<BudgetProgress>? budgets,
    List<RecurringCommitment>? commitments,
  ) async {
    final sink = widget.writeWidgetSnapshot;
    if (sink == null) return;
    int? safeSpend;
    if (budgets != null && commitments != null) {
      safeSpend = safeDailySpend(
        budgets: budgets,
        commitments: commitments,
        today: vnNow(),
      )?.perDayMinor;
    }
    // The widget's "Chờ duyệt" row tallies exactly the queue its tap
    // opens — pending inbox drafts (D18). Three honest states: an absent
    // seam or a failed read is null (the row hides, never a fabricated
    // 0), a real read is the count — including a verified zero. This is
    // deliberately a separate read from _loadAttention: that one folds
    // absent/failed into 0 because a hidden card section needs no
    // distinction, while a persisted widget figure must not lie.
    int? pendingReview;
    final pendingLoader = widget.loadPendingCount;
    if (pendingLoader != null) {
      try {
        pendingReview = await pendingLoader();
      } catch (_) {
        /* unknown — the widget row stays hidden rather than quoting 0 */
      }
    }
    await sink(
      WidgetSnapshot(
        totalVnd: _vndTotal(accounts),
        safeSpendVnd: safeSpend,
        savedAtMs: DateTime.now().millisecondsSinceEpoch,
        pendingReview: pendingReview,
      ),
    ).catchError((_) {});
  }

  /// A real save covers the pattern via the new commitment's keys; hiding
  /// the card immediately just mirrors what the next load would compute.
  Future<void> _createCommitment(RecurringSuggestion s) async {
    final created = await widget.onCreateCommitment!(s);
    if (created && mounted) {
      setState(() => _hiddenSuggestions.add(s.key));
    }
  }

  /// "Tạo ví đầu tiên" on the empty-ledger intro. The seam surfaces its
  /// own save errors inside the dialog; whatever happens, the loaders
  /// re-run afterwards so the visible state is always the real one
  /// (a cancelled dialog just reloads the still-empty ledger).
  Future<void> _createAccountFromEmpty() async {
    try {
      await widget.onCreateAccount!();
    } finally {
      _refresh();
    }
  }

  Future<void> _refresh() async {
    // Braces, not `=>` — setState rejects a closure that returns a
    // Future, and `_data = _load()` evaluates to that Future (debug
    // builds throw and the pull/capture refresh silently never ran).
    setState(() {
      _data = _load();
      _attention = _loadAttention();
    });
    try {
      await _data;
    } catch (_) {
      /* surfaced by the FutureBuilder */
    }
  }

  /// Public reload for the nav shell after a capture save.
  void reload() => _refresh();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text('MoneyFlow'),
        actions: [
          if (widget.modeLabel != null)
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: context.mf.brandSubtle,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  widget.modeLabel!,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: context.mf.brandText,
                  ),
                ),
              ),
            ),
          if (widget.menuItems.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: IconButton(
                // The reference's rounded-square header button — opens
                // the "Khám phá" hub, a real page instead of a cramped
                // overflow popup.
                tooltip: 'Khám phá — tất cả tính năng',
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => _HubPage(items: widget.menuItems),
                  ),
                ),
                icon: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: context.mf.borderSubtle),
                  ),
                  child: const Icon(Icons.more_vert, size: 20),
                ),
              ),
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: DecoratedBox(
        // Soft brand glow at the top fading into the canvas — the
        // reference's backdrop. Dark mode keeps the flat ink canvas.
        decoration: BoxDecoration(
          gradient: Theme.of(context).brightness == Brightness.dark
              ? null
              : LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    context.mf.brandSubtle,
                    Theme.of(context).scaffoldBackgroundColor,
                  ],
                  stops: const [0, 0.4],
                ),
        ),
        child: FutureBuilder(
          future: _data,
          builder: (context, snap) {
            if (snap.hasError) {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Không tải được dữ liệu'),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Text(
                        'Kiểm tra kết nối mạng rồi thử lại.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _refresh,
                      child: const Text('Thử lại'),
                    ),
                  ],
                ),
              );
            }
            if (!snap.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final accounts = snap.data!.accounts;
            final txs = snap.data!.txs;
            final savedAtMs = snap.data!.savedAtMs;
            // Only VND balances fold into the đồng total — a foreign-
            // currency account created on the web would otherwise corrupt
            // it (the mobile create path is VND-only).
            final total = _vndTotal(accounts);
            final budgets = snap.data!.budgets;
            final commitments = snap.data!.commitments;
            final suggestions = snap.data!.suggestions
                .where((s) => !_hiddenSuggestions.contains(s.key))
                .toList();
            // One VN civil clock read for the whole remainder card — the
            // figure's month, its days-left count and the alert window
            // can never disagree across a midnight boundary.
            final now = vnNow();
            final monthStart =
                '${now.year}-${now.month.toString().padLeft(2, '0')}-01';
            // Attention-card commitment rows — the same verified states
            // the Kế hoạch list renders, never an invented count. A
            // failed planning read (commitments == null) hides the rows;
            // archived rows never surface as work.
            final todayStr = ymd(now);
            final overdue = <RecurringCommitment>[];
            final drift = <RecurringCommitment>[];
            final upcoming = <RecurringCommitment>[];
            for (final c in commitments ?? const <RecurringCommitment>[]) {
              if (c.isArchived) continue;
              switch (commitmentStatus(
                c,
                monthStart: monthStart,
                today: todayStr,
              )) {
                case CommitmentStatus.overdue:
                  overdue.add(c);
                case CommitmentStatus.paidDifferent:
                  drift.add(c);
                case CommitmentStatus.dueToday:
                  upcoming.add(c);
                case CommitmentStatus.upcoming:
                  // Copilot's "Upcoming" glance — only the forward
                  // window counts; a bill 20 days out is noise here.
                  final due = commitmentDueDate(monthStart, c.dueDay);
                  final days = due == null
                      ? null
                      : commitmentDaysUntil(due, todayStr);
                  if (days != null &&
                      days >= 0 &&
                      days <= _upcomingWindowDays) {
                    upcoming.add(c);
                  }
                default:
                  break;
              }
            }
            // Preview order matches the Kế hoạch feed rule — longest-
            // waiting overdue first; drift stays deterministic by name;
            // upcoming surfaces the nearest due day first (today leads).
            overdue.sort((a, b) => a.dueDay.compareTo(b.dueDay));
            drift.sort((a, b) => a.name.compareTo(b.name));
            upcoming.sort((a, b) => a.dueDay.compareTo(b.dueDay));
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                // 22px side margin — measured from the Savor reference
                // (≈5.6% of the screen width).
                padding: const EdgeInsets.fromLTRB(22, 16, 22, 16),
                children: [
                  if (savedAtMs != null) _StaleBanner(savedAtMs: savedAtMs),
                  _TotalCard(
                    total: total,
                    latestOn: _latestDay(txs),
                    foreignWallets: accounts
                        .where((a) => a.currencyCode != 'VND')
                        .length,
                  ),
                  FutureBuilder<_AttentionData>(
                    future: _attention,
                    builder: (context, attention) {
                      final a = attention.data;
                      if (a == null) return const SizedBox.shrink();
                      final card = _AttentionCard(
                        inboxCount: a.pending,
                        inboxPreviews: a.previews,
                        needsReview: a.needsReview,
                        overdue: overdue,
                        drift: drift,
                        upcoming: upcoming,
                        monthStart: monthStart,
                        today: todayStr,
                        onOpenInbox: widget.onOpenInbox,
                        onOpenNeedsReview: widget.onOpenNeedsReview,
                        onOpenPlanning: widget.onOpenPlanning,
                      );
                      if (card.isEmpty) return const SizedBox.shrink();
                      return Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: card,
                      );
                    },
                  ),
                  if (budgets != null && commitments != null) ...[
                    const SizedBox(height: 12),
                    _MonthRemainderCard(
                      spend: safeDailySpend(
                        budgets: budgets,
                        commitments: commitments,
                        today: now,
                      ),
                      alerts: budgetAlerts(budgets, monthStart: monthStart),
                      // The pace shape needs the same month rows the
                      // summary card reads — a failed read drops the
                      // chart, never fabricates one.
                      pace: snap.data!.summaryRows == null
                          ? null
                          : buildMonthPace(
                              rows: snap.data!.summaryRows!,
                              budgets: budgets,
                              today: now,
                            ),
                      onOpenPlanning: widget.onOpenPlanning,
                    ),
                  ],
                  if (snap.data!.summaryRows != null) ...[
                    Builder(
                      builder: (context) {
                        final summary = buildMonthSummary(
                          snap.data!.summaryRows!,
                          today: now,
                        );
                        // A quiet month renders nothing — same rule the
                        // digest applies to its notification.
                        if (summary.transactionCount == 0) {
                          return const SizedBox.shrink();
                        }
                        return Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: _MonthSummaryCard(
                            summary: summary,
                            onOpenReports: widget.onOpenReports,
                          ),
                        );
                      },
                    ),
                    // No pins and no candidate rows means there is
                    // nothing to watch — the card hides rather than
                    // claiming empty real estate above the wallets.
                    if (snap.data!.watchItems.isNotEmpty ||
                        snap.data!.summaryRows!.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _WatchCard(
                        items: snap.data!.watchItems,
                        rows: snap.data!.summaryRows!,
                        today: now,
                        // Pin only when the save seam exists — a Ghim
                        // that can't persist would be a dead affordance.
                        onPin: widget.saveWatchItems == null
                            ? null
                            : () => _showWatchPin(snap.data!.summaryRows!),
                        onUnwatch: (item) => _saveWatchItems([
                          for (final i in snap.data!.watchItems)
                            if (i.key != item.key) i,
                        ]),
                      ),
                    ],
                  ],
                  for (final s in suggestions) ...[
                    const SizedBox(height: 12),
                    _RecurringSuggestionCard(
                      suggestion: s,
                      onCreate: widget.onCreateCommitment == null
                          ? null
                          : () => _createCommitment(s),
                      onDismiss: () => _dismissSuggestion(s),
                    ),
                  ],
                  if (accounts.isEmpty && txs.isEmpty)
                    _EmptyLedgerIntro(
                      onCreateAccount: widget.onCreateAccount == null
                          ? null
                          : _createAccountFromEmpty,
                    )
                  else ...[
                    const SizedBox(height: 20),
                    Text('Tài khoản', style: _sectionTitle(context)),
                    const SizedBox(height: 8),
                    _AccountStrip(
                      accounts: accounts,
                      onOpenAccount: widget.onOpenAccount,
                    ),
                    const SizedBox(height: 20),
                    Text('Hoạt động gần đây', style: _sectionTitle(context)),
                    const SizedBox(height: 8),
                    if (txs.isEmpty)
                      const EmptyStateCard(
                        icon: Icons.receipt_long_outlined,
                        title: 'Chưa có giao dịch nào',
                        message:
                            'Bấm "Ghi" ở thanh dưới để thêm khoản '
                            'đầu tiên của bạn.',
                      ),
                    for (final t in txs)
                      _TransactionTile(tx: t, onOpen: widget.onOpenTransaction),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

/// The one VND-balance fold — the hero total and the widget snapshot
/// must never disagree on what "Tổng số dư" means.
int _vndTotal(List<AccountSummary> accounts) => accounts
    .where((a) => a.currencyCode == 'VND')
    .fold<int>(0, (s, a) => s + a.balance);

/// Month-to-date recap card (D9) — the in-app counterpart of the
/// month-close digest, mirroring the web weekly-summary card lifted to
/// the month boundary: thu/chi/còn lại, the top expense category, and
/// the delta against the equal-length trailing window. It names its
/// range ("1/10 – 20/10") so a partial month never reads as whole.
class _MonthSummaryCard extends StatelessWidget {
  const _MonthSummaryCard({required this.summary, this.onOpenReports});

  final MonthSummary summary;
  final VoidCallback? onOpenReports;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.textTheme.bodySmall?.copyWith(
      color: context.mf.textMuted,
    );
    final compareLine = monthSummaryCompareLine(
      summary.expenseChangePercent,
      days: summary.compareDays,
    );
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.calendar_month_outlined, size: 20),
                const SizedBox(width: 8),
                Text('Tóm tắt tháng này', style: theme.textTheme.titleSmall),
                const Spacer(),
                Text(
                  '${formatMonthDayLabel(summary.monthStart)} – '
                  '${formatMonthDayLabel(summary.monthEnd)}',
                  style: muted,
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              'Thu ${formatMoney(summary.income)} · '
              'Chi ${formatMoney(summary.expense)}',
              style: theme.textTheme.bodyLarge,
            ),
            const SizedBox(height: 2),
            Text(
              'Còn lại ${formatMoney(summary.net)}',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            if (summary.topCategories.isNotEmpty) ...[
              const SizedBox(height: 8),
              // Monarch/Spendee pattern — ranked share bars answer
              // "tiền đi đâu" faster than one "Nhiều nhất" line.
              for (final c in summary.topCategories)
                _CategoryShareRow(
                  name: c.name,
                  amount: c.amount,
                  maxAmount: summary.topCategories.first.amount,
                  expenseMinor: summary.expense,
                ),
            ],
            if (compareLine != null) ...[
              const SizedBox(height: 2),
              Text(compareLine, style: theme.textTheme.bodySmall),
            ],
            if (onOpenReports != null) ...[
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: onOpenReports,
                  child: const Text('Xem báo cáo tháng →'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// One ranked category share row — name left, "amount · N% của chi"
/// right, and a thin track whose fill is the row's share of the top
/// row's amount (so ranks read at a glance, Monarch-style).
class _CategoryShareRow extends StatelessWidget {
  const _CategoryShareRow({
    required this.name,
    required this.amount,
    required this.maxAmount,
    required this.expenseMinor,
  });

  final String name;
  final int amount;
  final int maxAmount;
  final int expenseMinor;

  static const _trackHeight = 4.0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mf = context.mf;
    final share = expenseMinor > 0 ? (amount * 100) ~/ expenseMinor : 0;
    final fill = maxAmount > 0 ? (amount / maxAmount).clamp(0.0, 1.0) : 0.0;
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  name,
                  style: theme.textTheme.bodySmall,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${formatMoney(amount)} · $share%',
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 3),
          LayoutBuilder(
            builder: (context, constraints) => Stack(
              children: [
                Container(
                  height: _trackHeight,
                  width: constraints.maxWidth,
                  decoration: BoxDecoration(
                    color: mf.textMuted.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(_trackHeight / 2),
                  ),
                ),
                Container(
                  height: _trackHeight,
                  width: constraints.maxWidth * fill,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary,
                    borderRadius: BorderRadius.circular(_trackHeight / 2),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Watchlist tile (D10) — pinned categories/payees with their
/// month-to-date expense and optional threshold state. Only renders
/// while the summary read succeeded, so totals always come from a
/// complete window; the empty state is honest copy, not a fake figure.
class _WatchCard extends StatelessWidget {
  const _WatchCard({
    required this.items,
    required this.rows,
    required this.today,
    required this.onPin,
    required this.onUnwatch,
  });

  final List<WatchItem> items;
  final List<Transaction> rows;
  final DateTime today;

  /// Null when no save seam is wired — the card stays read-only rather
  /// than offering a pin that cannot persist.
  final VoidCallback? onPin;
  final void Function(WatchItem item) onUnwatch;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.visibility_outlined, size: 20),
                const SizedBox(width: 8),
                Text('Đang theo dõi', style: theme.textTheme.titleSmall),
                const Spacer(),
                if (onPin != null)
                  TextButton.icon(
                    onPressed: onPin,
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Ghim'),
                  ),
              ],
            ),
            if (items.isEmpty)
              Padding(
                padding: const EdgeInsets.only(right: 8, bottom: 8),
                child: Text(
                  'Ghim một danh mục hay người nhận để xem tổng chi '
                  'tháng này — không cần đặt ngân sách.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: context.mf.textMuted,
                  ),
                ),
              )
            else
              for (final item in items) ...[
                _WatchRow(
                  item: item,
                  spent: watchMonthSpend(rows, item, today: today),
                  onUnwatch: () => onUnwatch(item),
                ),
              ],
          ],
        ),
      ),
    );
  }
}

/// One pinned line: name · month spend · optional threshold + alert
/// word. The label carries the meaning — color is decoration only.
class _WatchRow extends StatelessWidget {
  const _WatchRow({
    required this.item,
    required this.spent,
    required this.onUnwatch,
  });

  final WatchItem item;
  final int spent;
  final VoidCallback onUnwatch;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final alert = watchAlert(item, spent);
    final alertColor = switch (alert) {
      WatchAlert.over => theme.colorScheme.error,
      WatchAlert.near => context.mf.warningText,
      WatchAlert.ok => context.mf.textMuted,
    };
    return Row(
      children: [
        Icon(
          item.kind == WatchKind.category
              ? Icons.category_outlined
              : Icons.storefront_outlined,
          size: 18,
          color: context.mf.textMuted,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(item.name, style: theme.textTheme.bodyMedium),
              Text(
                'Chi ${formatMoney(spent)} tháng này'
                '${item.thresholdMinor == null ? '' : ' · ngưỡng ${formatMoney(item.thresholdMinor!)}'}'
                ' · ${watchAlertLabel(item, spent)}',
                style: theme.textTheme.bodySmall?.copyWith(color: alertColor),
              ),
            ],
          ),
        ),
        IconButton(
          icon: const Icon(Icons.push_pin_outlined, size: 18),
          tooltip: 'Bỏ theo dõi ${item.name}',
          onPressed: onUnwatch,
        ),
      ],
    );
  }
}

/// Menu label with a lazy count badge — "Cần xem (3)". The future is
/// awaited while the popup is already open, so the label shows first and
/// the count fades in; an error just leaves the bare label.
class _MenuBadge extends StatelessWidget {
  const _MenuBadge({required this.item});

  final DashboardMenuItem item;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<int>(
      future: item.badge!(),
      builder: (context, snap) {
        final n = snap.data;
        return Text(n != null && n > 0 ? '${item.label} ($n)' : item.label);
      },
    );
  }
}

/// Offline indicator — labels restored data with its save time so stale
/// numbers can never be mistaken for the live ledger.
class _StaleBanner extends StatelessWidget {
  const _StaleBanner({required this.savedAtMs});
  final int savedAtMs;

  @override
  Widget build(BuildContext context) {
    final saved = DateTime.fromMillisecondsSinceEpoch(savedAtMs);
    final hh = saved.hour.toString().padLeft(2, '0');
    final mm = saved.minute.toString().padLeft(2, '0');
    final dd = saved.day.toString().padLeft(2, '0');
    final mo = saved.month.toString().padLeft(2, '0');
    final mf = context.mf;
    return Card(
      color: mf.warningSubtle,
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        dense: true,
        leading: Icon(Icons.wifi_off, color: mf.warningText),
        title: const Text('Ngoại tuyến — dữ liệu đã lưu'),
        subtitle: Text('Cập nhật lúc $hh:$mm $dd/$mo'),
      ),
    );
  }
}

/// First-run state — the real total stays at 0 ₫ above; the tiles below
/// are an explicitly-labeled preview of what the ledger looks like, and
/// are never written to the user's books.
///
/// The intro only renders when there are ZERO accounts, so "bấm Ghi"
/// would be a dead end — Ghi needs a wallet. The primary CTA is
/// therefore account creation via [onCreateAccount]; without the seam
/// the card degrades to an honest pointer at the Tài khoản menu.
class _EmptyLedgerIntro extends StatelessWidget {
  const _EmptyLedgerIntro({this.onCreateAccount});

  final VoidCallback? onCreateAccount;

  @override
  Widget build(BuildContext context) {
    final samples = DemoStore.seedTransactions().take(2).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 20),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Sổ của bạn đang trống',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: 4),
                Text(
                  'Tạo ví đầu tiên để bắt đầu ghi — dưới đây là dữ liệu '
                  'mẫu minh họa.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 8),
                if (onCreateAccount != null)
                  FilledButton.icon(
                    onPressed: onCreateAccount,
                    icon: const Icon(Icons.account_balance_wallet_outlined),
                    label: const Text('Tạo ví đầu tiên'),
                  )
                else
                  Text(
                    'Tạo ví trong mục Tài khoản của menu để bắt đầu.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text('Dữ liệu mẫu', style: Theme.of(context).textTheme.labelMedium),
        const SizedBox(height: 8),
        for (final t in samples) _TransactionTile(tx: t),
      ],
    );
  }
}

/// Count-up on first mount for big đồng figures — ~400ms easeOut,
/// formatted during the tween so the grouping dots slide in naturally.
/// MediaQuery.disableAnimations (accessibility) renders the final
/// value directly.
Widget _countUpMoney(BuildContext context, int amount, TextStyle? style) {
  final reduced = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
  return TweenAnimationBuilder<int>(
    tween: IntTween(begin: reduced ? amount : 0, end: amount),
    duration: reduced ? Duration.zero : const Duration(milliseconds: 400),
    curve: Curves.easeOut,
    builder: (context, value, _) => Text(formatMoney(value), style: style),
  );
}

/// Section heading — 19px bold, measured against the reference's
/// "Team Members" (cap height ≈ 13px at a 390px-wide frame).
TextStyle? _sectionTitle(BuildContext context) => Theme.of(
  context,
).textTheme.titleLarge?.copyWith(fontSize: 19, fontWeight: FontWeight.w700);

/// Newest posted day among the loaded rows ('yyyy-MM-dd'), or null when
/// nothing is loaded. The feed is newest-first, but the max is taken
/// explicitly so ordering never decides a figure shown to the user.
String? _latestDay(List<Transaction> txs) {
  String? latest;
  for (final t in txs) {
    if (latest == null || t.occurredOn.compareTo(latest) > 0) {
      latest = t.occurredOn;
    }
  }
  return latest;
}

class _TotalCard extends StatelessWidget {
  const _TotalCard({
    required this.total,
    this.latestOn,
    this.foreignWallets = 0,
  });
  final int total;
  final String? latestOn;
  final int foreignWallets;

  @override
  Widget build(BuildContext context) {
    // No card: the oversized figure sits straight on the canvas — the
    // single scan target, with a quiet label above it.
    final theme = Theme.of(context);
    final muted = theme.textTheme.bodySmall?.copyWith(
      color: context.mf.textMuted,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Tổng số dư',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          // Reference gap between the heading row and the figure is ≈36px
          // (it holds the period chips there); 16px keeps it airy.
          const SizedBox(height: 16),
          // The spoken label is the real figure — the animated glyph
          // string ("45.000 ₫") would read digit-by-digit otherwise.
          // FittedBox keeps one line at 2x text scale instead of
          // wrapping the figure mid-number.
          Semantics(
            label: 'Tổng số dư ${spokenVnd(total)}',
            excludeSemantics: true,
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: _countUpMoney(
                context,
                total,
                mfMoneyStyle(
                  theme.textTheme.displayMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                  hero: true,
                ),
              ),
            ),
          ),
          const SizedBox(height: 6),
          // Coverage, stated plainly: what the figure includes and how far
          // the loaded data reaches — never a "synced" claim.
          Text(
            latestOn == null
                ? 'Chưa ghi giao dịch nào'
                : 'Giao dịch gần nhất ${formatYmdAsDmy(latestOn!)}',
            style: muted,
          ),
          if (foreignWallets > 0)
            Text(
              'Chỉ tính ví VND · $foreignWallets ví ngoại tệ chưa cộng vào',
              style: muted,
            ),
        ],
      ),
    );
  }
}

/// "Cần chú ý" — the Rocket-style attention card (D5): every row is a
/// verified queue, never an invented task.
///
/// - Inbox candidates are drafts, not posted transactions: the row says
///   so and names the newest items waiting.
/// - Posted rows still flagged needs_review live in the ledger — the
///   row opens the activity feed pre-filtered to them.
/// - Overdue commitments and paid-different drift come from the same
///   `commitmentStatus` math the Kế hoạch list renders.
///
/// A section only renders when its count is real and nonzero; the whole
/// card hides when nothing needs attention. A row without a destination
/// still shows its count — information, not a dead chevron.
class _AttentionCard extends StatelessWidget {
  const _AttentionCard({
    required this.inboxCount,
    required this.inboxPreviews,
    required this.needsReview,
    required this.overdue,
    required this.drift,
    required this.upcoming,
    required this.monthStart,
    required this.today,
    this.onOpenInbox,
    this.onOpenNeedsReview,
    this.onOpenPlanning,
  });

  final int inboxCount;
  final List<InboxCandidate> inboxPreviews;
  final NeedsReviewTransactions needsReview;
  final List<RecurringCommitment> overdue;
  final List<RecurringCommitment> drift;

  /// Due-today + due-soon commitments inside the forward window — the
  /// Copilot "Upcoming" glance; overdue work still leads the card.
  final List<RecurringCommitment> upcoming;

  /// YYYY-MM-01 / YYYY-MM-DD feeding `commitmentStatusLabel` — the same
  /// month the remainder card reads, so the two cards never disagree.
  final String monthStart;
  final String today;

  final VoidCallback? onOpenInbox;
  final VoidCallback? onOpenNeedsReview;
  final VoidCallback? onOpenPlanning;

  /// Preview lines a section can hold before folding into a count —
  /// two keeps the card a glance, not a second queue page.
  static const _maxPreviewLines = 2;

  /// True when nothing verified needs attention — the caller renders
  /// nothing rather than an empty shell.
  bool get isEmpty =>
      _inboxTotal <= 0 &&
      needsReview.count <= 0 &&
      overdue.isEmpty &&
      drift.isEmpty &&
      upcoming.isEmpty;

  /// The count the row displays — the authoritative count seam wins,
  /// but a preview list longer than the count (a resolve between the
  /// two reads) never understates what the lines show.
  int get _inboxTotal =>
      inboxCount > inboxPreviews.length ? inboxCount : inboxPreviews.length;

  @override
  Widget build(BuildContext context) {
    final mf = context.mf;
    final rows = <Widget>[];

    final inboxTotal = _inboxTotal;
    if (inboxTotal > 0) {
      final shown = inboxPreviews.take(_maxPreviewLines).toList();
      rows.add(
        _AttentionRow(
          icon: Icons.inbox_outlined,
          title: '$inboxTotal mục chờ duyệt',
          subtitle: 'Chưa vào sổ — duyệt để tính vào số dư',
          previews: [
            for (final c in shown)
              '${c.merchant} · ${formatMoney(c.amountMinor)}',
          ],
          overflow: inboxTotal > shown.length
              ? 'và ${inboxTotal - shown.length} mục khác'
              : null,
          onTap: onOpenInbox,
        ),
      );
    }
    if (needsReview.count > 0) {
      final shown = needsReview.rows.take(_maxPreviewLines).toList();
      rows.add(
        _AttentionRow(
          icon: Icons.flag_outlined,
          title: '${needsReview.count} khoản trong sổ cần xem lại',
          previews: [
            for (final t in shown)
              '${t.payee ?? (t.note.isEmpty ? t.category : t.note)} · '
                  '${formatMoney(t.amount)}',
          ],
          overflow: needsReview.count > shown.length
              ? 'và ${needsReview.count - shown.length} khoản khác'
              : null,
          onTap: onOpenNeedsReview,
        ),
      );
    }
    if (overdue.isNotEmpty) {
      final shown = overdue.take(_maxPreviewLines).toList();
      rows.add(
        _AttentionRow(
          icon: Icons.event_busy_outlined,
          title: '${overdue.length} cam kết quá hạn',
          previews: [
            for (final c in shown)
              '${c.name} · ${commitmentStatusLabel(CommitmentStatus.overdue, monthStart: monthStart, today: today, dueDay: c.dueDay, format: formatMoney)}',
          ],
          overflow: overdue.length > shown.length
              ? 'và ${overdue.length - shown.length} cam kết khác'
              : null,
          onTap: onOpenPlanning,
        ),
      );
    }
    if (drift.isNotEmpty) {
      final shown = drift.take(_maxPreviewLines).toList();
      rows.add(
        _AttentionRow(
          icon: Icons.sync_alt,
          title: '${drift.length} cam kết trả khác số tiền',
          previews: [
            for (final c in shown)
              '${c.name} · ${commitmentStatusLabel(CommitmentStatus.paidDifferent, monthStart: monthStart, today: today, dueDay: c.dueDay, paidAmountMinor: c.paidAmountMinor, format: formatMoney)}',
          ],
          overflow: drift.length > shown.length
              ? 'và ${drift.length - shown.length} cam kết khác'
              : null,
          onTap: onOpenPlanning,
        ),
      );
    }
    if (upcoming.isNotEmpty) {
      final shown = upcoming.take(_maxPreviewLines).toList();
      rows.add(
        _AttentionRow(
          icon: Icons.schedule_outlined,
          title: '${upcoming.length} cam kết sắp đến hạn',
          previews: [
            for (final c in shown)
              '${c.name} · ${commitmentStatusLabel(
                commitmentStatus(c, monthStart: monthStart, today: today),
                monthStart: monthStart,
                today: today,
                dueDay: c.dueDay,
                format: formatMoney,
              )}',
          ],
          overflow: upcoming.length > shown.length
              ? 'và ${upcoming.length - shown.length} cam kết khác'
              : null,
          onTap: onOpenPlanning,
        ),
      );
    }

    return Card(
      color: mf.warningSubtle,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: BorderSide(color: mf.warningBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0) Divider(height: 1, indent: 48, color: mf.warningBorder),
            rows[i],
          ],
        ],
      ),
    );
  }
}

/// One attention section — icon + count line + up to two named previews
/// + overflow count, with a chevron only when a real destination exists.
class _AttentionRow extends StatelessWidget {
  const _AttentionRow({
    required this.icon,
    required this.title,
    this.subtitle,
    this.previews = const [],
    this.overflow,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final List<String> previews;
  final String? overflow;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final mf = context.mf;
    final text = Theme.of(context).textTheme;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 1),
              child: Icon(icon, size: 20, color: mf.warningText),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: text.bodyMedium?.copyWith(
                      color: mf.warningText,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (subtitle != null) Text(subtitle!, style: text.bodySmall),
                  for (final line in previews)
                    Text(line, style: text.bodySmall),
                  if (overflow != null) Text(overflow!, style: text.bodySmall),
                ],
              ),
            ),
            if (onTap != null)
              Icon(
                Icons.chevron_right,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
          ],
        ),
      ),
    );
  }
}

/// "Còn lại tháng này" — the honest month-remainder card under the
/// balance hero (Simplifi "Left This Month" / PocketGuard "In My Pocket"
/// / Copilot "Free to Spend" — gap D3). It stays visibly secondary to
/// the hero and always names its inputs so nobody mistakes a derived
/// estimate for an account balance:
///
/// - Normal month: "Còn lại X ₫ — ~Y ₫/ngày" over the days left.
/// - Commitments overshooting the headroom: a negative figure with the
///   word "thiếu" — an over-plan state, never a red-only signal.
/// - [alerts] carries the 80%/100% budget thresholds computed on the
///   same carry-aware math the Kế hoạch rows render.
/// - No budgets at all: a setup nudge pointing at Kế hoạch — never an
///   invented number.
class _MonthRemainderCard extends StatelessWidget {
  const _MonthRemainderCard({
    required this.spend,
    required this.alerts,
    this.pace,
    this.onOpenPlanning,
  });

  final SafeDailySpend? spend;
  final List<BudgetAlert> alerts;

  /// The Copilot-pattern pace read — null when the summary read failed
  /// or no monthly budget exists; the card then keeps its figure-only
  /// form rather than drawing an invented shape.
  final MonthPace? pace;

  /// The no-budget nudge's "Mở Kế hoạch" action — null drops the button
  /// and leaves the plain text (embedders without a planning tab).
  final VoidCallback? onOpenPlanning;

  /// Named alert rows the card can hold before folding into a count —
  /// two keeps the card a glance, not a second planning page.
  static const _maxAlertLines = 2;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final text = theme.textTheme;
    final mf = context.mf;
    final s = spend;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.calendar_month_outlined,
                  size: 18,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(width: 6),
                Text('Còn lại tháng này', style: text.labelLarge),
              ],
            ),
            const SizedBox(height: 6),
            if (s == null)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Đặt ngân sách tháng để biết tháng này còn được '
                    'chi bao nhiêu',
                    style: text.bodyMedium,
                  ),
                  if (onOpenPlanning != null)
                    TextButton.icon(
                      onPressed: onOpenPlanning,
                      icon: const Icon(Icons.event_note_outlined, size: 18),
                      label: const Text('Mở Kế hoạch'),
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: const Size(0, 32),
                      ),
                    ),
                ],
              )
            else if (s.shortfallMinor > 0) ...[
              // Over-plan state: the negative figure plus the word that
              // explains it — never colour alone carrying "over".
              Semantics(
                label: 'Kế hoạch tháng thiếu ${spokenVnd(s.shortfallMinor)}',
                excludeSemantics: true,
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    formatSignedMoney(-s.shortfallMinor),
                    style: mfMoneyStyle(
                      text.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: mf.expenseText,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Cam kết sắp trả vượt hạn mức ngân sách còn lại',
                style: text.bodySmall?.copyWith(color: mf.expenseText),
              ),
              const SizedBox(height: 4),
              _basisLine(text, s),
            ] else ...[
              Semantics(
                label: 'Còn lại ${spokenVnd(s.remainingMinor)} đến hết tháng',
                excludeSemantics: true,
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: _countUpMoney(
                    context,
                    s.remainingMinor,
                    text.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(height: 2),
              Semantics(
                label:
                    'Tương đương ${spokenVnd(s.perDayMinor)} mỗi ngày, '
                    'còn ${s.daysLeft} ngày',
                excludeSemantics: true,
                child: Text(
                  '~${formatMoney(s.perDayMinor)}/ngày · '
                  'còn ${s.daysLeft} ngày',
                  style: text.bodySmall,
                ),
              ),
              const SizedBox(height: 4),
              _basisLine(text, s),
            ],
            if (pace != null) ...[
              const SizedBox(height: 10),
              _PaceChart(pace: pace!),
              const SizedBox(height: 6),
              _paceStatusLine(context, pace!),
            ],
            if (alerts.isNotEmpty) ...[
              const SizedBox(height: 8),
              for (final a in alerts.take(_maxAlertLines))
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: _alertLine(context, a),
                ),
              if (alerts.length > _maxAlertLines)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    'và ${alerts.length - _maxAlertLines} danh mục khác — '
                    'chi tiết trong Kế hoạch',
                    style: text.bodySmall,
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }

  /// Pace verdict — a coloured dot paired with words + the percent of
  /// the month's total budget already spent, so the line reads the same
  /// in greyscale.
  Widget _paceStatusLine(BuildContext context, MonthPace p) {
    final mf = context.mf;
    final text = Theme.of(context).textTheme;
    final color = switch (p.status) {
      MonthPaceStatus.over => mf.warningText,
      MonthPaceStatus.on => mf.incomeText,
      MonthPaceStatus.under => mf.textMuted,
    };
    final percent = p.budgetLimitMinor > 0
        ? (p.actualToDateMinor * 100) ~/ p.budgetLimitMinor
        : 0;
    return Row(
      children: [
        Icon(Icons.circle, size: 8, color: color),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            '${monthPaceStatusLabel(p.status)} · '
            'đã chi $percent% ngân sách',
            style: text.bodySmall?.copyWith(color: color),
          ),
        ),
      ],
    );
  }

  /// "Theo ngân sách tháng + chi đã ghi" — the basis label every figure
  /// carries; the reserved-commitment share is named when nonzero so the
  /// remainder never implies it is raw budget slack.
  Widget _basisLine(TextTheme text, SafeDailySpend s) {
    final basis = s.reservedMinor > 0
        ? 'Theo ngân sách tháng và chi đã ghi · đã trừ '
              'cam kết sắp trả ${formatMoney(s.reservedMinor)}'
        : 'Theo ngân sách tháng và chi đã ghi';
    return Text(basis, style: text.bodySmall);
  }

  /// One threshold alert — the icon and the words carry the state so the
  /// line reads the same in greyscale: "vượt X ₫" / "sắp tới hạn mức".
  Widget _alertLine(BuildContext context, BudgetAlert a) {
    final mf = context.mf;
    final over = a.state == BudgetState.over;
    final color = over ? mf.expenseText : mf.warningText;
    return Row(
      children: [
        Icon(
          over ? Icons.error_outline : Icons.warning_amber_outlined,
          size: 16,
          color: color,
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            over
                ? '${a.categoryName} vượt ${formatMoney(a.amountMinor)}'
                : '${a.categoryName} sắp tới hạn mức — còn '
                      '${formatMoney(a.amountMinor)}',
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: color),
          ),
        ),
      ],
    );
  }
}

/// The Copilot-pattern spending-progress graph: cumulative month-to-date
/// expense (solid) drawn against the month's ideal-pace line (dashed,
/// budget ÷ days spread evenly). Decorative — the status words beside it
/// carry the verdict, so the chart stays out of semantics entirely.
class _PaceChart extends StatelessWidget {
  const _PaceChart({required this.pace});

  final MonthPace pace;

  static const _height = 72.0;

  @override
  Widget build(BuildContext context) {
    final mf = context.mf;
    return ExcludeSemantics(
      child: SizedBox(
        height: _height,
        width: double.infinity,
        child: CustomPaint(
          painter: _PaceChartPainter(
            pace: pace,
            actualColor: Theme.of(context).colorScheme.primary,
            idealColor: mf.textMuted,
            guideColor: mf.textMuted.withValues(alpha: 0.18),
          ),
        ),
      ),
    );
  }
}

class _PaceChartPainter extends CustomPainter {
  _PaceChartPainter({
    required this.pace,
    required this.actualColor,
    required this.idealColor,
    required this.guideColor,
  });

  final MonthPace pace;
  final Color actualColor;
  final Color idealColor;
  final Color guideColor;

  static const _dashOn = 4.0;
  static const _dashOff = 4.0;
  static const _stroke = 2.0;
  static const _dotRadius = 3.5;

  double _xForDay(int day, double width) => day / pace.daysInMonth * width;

  @override
  void paint(Canvas canvas, Size size) {
    // Y peak covers whichever is taller — the plan or the overshoot —
    // so an over-pace line never clips out of the card.
    final peak = pace.budgetLimitMinor > pace.actualToDateMinor
        ? pace.budgetLimitMinor
        : pace.actualToDateMinor;
    if (peak <= 0 || size.width <= 0 || size.height <= 0) return;
    double yFor(int minor) => size.height - minor / peak * size.height;

    // Baseline guide so "0 ₫" has a visual floor.
    canvas.drawLine(
      Offset(0, size.height - 0.5),
      Offset(size.width, size.height - 0.5),
      Paint()
        ..color = guideColor
        ..strokeWidth = 1,
    );

    // Ideal pace — dashed diagonal from 0 on the 1st to the budget
    // total on the last day.
    final idealPaint = Paint()
      ..color = idealColor
      ..strokeWidth = _stroke / 2
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    final idealPath = Path()
      ..moveTo(_xForDay(1, size.width) - size.width / pace.daysInMonth, yFor(0))
      ..lineTo(size.width, yFor(pace.budgetLimitMinor));
    _dashed(canvas, idealPath, idealPaint);

    // Actual cumulative spend through today — one point per elapsed day.
    final points = <Offset>[
      for (var i = 0; i < pace.cumulativeMinor.length; i++)
        Offset(_xForDay(i + 1, size.width), yFor(pace.cumulativeMinor[i])),
    ];
    if (points.isNotEmpty) {
      final actualPaint = Paint()
        ..color = actualColor
        ..strokeWidth = _stroke
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round;
      final path = Path()..moveTo(points.first.dx, points.first.dy);
      for (final p in points.skip(1)) {
        path.lineTo(p.dx, p.dy);
      }
      canvas.drawPath(path, actualPaint);
      canvas.drawCircle(points.last, _dotRadius, Paint()..color = actualColor);
    }
  }

  /// March a path in [_dashOn]/[_dashOff] segments — small enough that a
  /// hand-rolled dash beats pulling in a charting dependency.
  void _dashed(Canvas canvas, Path path, Paint paint) {
    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      while (distance < metric.length) {
        final end = (distance + _dashOn).clamp(0.0, metric.length);
        canvas.drawPath(metric.extractPath(distance, end), paint);
        distance += _dashOn + _dashOff;
      }
    }
  }

  @override
  bool shouldRepaint(_PaceChartPainter old) =>
      old.pace != pace ||
      old.actualColor != actualColor ||
      old.idealColor != idealColor;
}

/// "Có vẻ là khoản định kỳ" — a detected monthly pattern the user may
/// declare as a commitment. Sits under the remainder card with the other
/// planning nudges; both actions are explicit user choices — [onCreate]
/// opens the prefilled planning form (never writes by itself) and
/// [onDismiss] permanently hides this pattern.
class _RecurringSuggestionCard extends StatelessWidget {
  const _RecurringSuggestionCard({
    required this.suggestion,
    required this.onDismiss,
    this.onCreate,
  });

  final RecurringSuggestion suggestion;
  final VoidCallback onDismiss;

  /// Null when the host offers no commitment surface (e.g. demo) — the
  /// card still lets the user hide the pattern.
  final VoidCallback? onCreate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final text = theme.textTheme;
    final s = suggestion;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.repeat, size: 18, color: theme.colorScheme.primary),
                const SizedBox(width: 6),
                Text('Có vẻ là khoản định kỳ', style: text.labelLarge),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${s.name} · ${formatMoney(s.amount)} · ngày ${s.dayOfMonth}',
              style: text.bodyMedium,
            ),
            Text(
              'Gặp ${s.occurrenceCount} lần trong '
              '${s.months.length} tháng gần đây',
              style: text.bodySmall,
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(onPressed: onDismiss, child: const Text('Ẩn')),
                const SizedBox(width: 8),
                if (onCreate != null)
                  FilledButton(
                    onPressed: onCreate,
                    child: const Text('Tạo cam kết'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Horizontal strip of wallet cards — every card is built up front (a
/// few wallets at most), so nothing is lazily offscreen.
class _AccountStrip extends StatelessWidget {
  const _AccountStrip({required this.accounts, this.onOpenAccount});
  final List<AccountSummary> accounts;
  final void Function(AccountSummary account)? onOpenAccount;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      clipBehavior: Clip.none,
      child: Row(
        children: [
          for (var i = 0; i < accounts.length; i++) ...[
            if (i > 0) const SizedBox(width: 12),
            _AccountCard(
              account: accounts[i],
              fill: mfPastelFills[i % mfPastelFills.length],
              onOpen: onOpenAccount,
            ),
          ],
        ],
      ),
    );
  }
}

class _AccountCard extends StatelessWidget {
  const _AccountCard({required this.account, required this.fill, this.onOpen});
  final AccountSummary account;
  final Color fill;
  final void Function(AccountSummary account)? onOpen;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // The pastel fill lives on the Material itself so the InkWell splash
    // actually shows; a decorated child would paint over the ripple.
    return SizedBox(
      width: 220,
      child: Material(
        color: fill,
        borderRadius: BorderRadius.circular(24),
        child: InkWell(
          onTap: onOpen == null ? null : () => onOpen!(account),
          borderRadius: BorderRadius.circular(24),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.6),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        // Long kind labels clip instead of pushing the
                        // chevron off the card at large text scales.
                        child: Text(
                          accountKindLabel(account.kind),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: mfPastelInk,
                          ),
                        ),
                      ),
                    ),
                    const Spacer(),
                    // Honest affordance: the chevron only shows when the
                    // card really opens the register — never a dead hint.
                    if (onOpen != null)
                      Icon(
                        Icons.chevron_right,
                        size: 18,
                        color: mfPastelInk.withValues(alpha: 0.55),
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  account.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: mfPastelInk,
                  ),
                ),
                const SizedBox(height: 2),
                if (account.currencyCode != 'VND')
                  Text(
                    'Ví ${account.currencyCode} — xem số dư trên web',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: mfPastelInk,
                    ),
                  )
                else
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Text(
                      formatMoney(account.balance),
                      style: mfMoneyStyle(
                        theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: mfPastelInk,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  const _TransactionTile({required this.tx, this.onOpen});
  final Transaction tx;
  final void Function(Transaction tx)? onOpen;

  @override
  Widget build(BuildContext context) {
    final kind = switch (tx.kind) {
      TransactionKind.income => MoneySignKind.income,
      TransactionKind.expense => MoneySignKind.expense,
      TransactionKind.transfer => MoneySignKind.transfer,
    };
    // Semantic money tokens (mf_theme.dart) — the +/−/↔ glyph carries
    // the direction, the color only reinforces it.
    final mf = context.mf;
    final color = switch (tx.kind) {
      TransactionKind.income => mf.incomeText,
      TransactionKind.expense => mf.expenseText,
      TransactionKind.transfer => mf.transferText,
    };
    final accountLine = tx.destinationAccount == null
        ? tx.account
        : '${tx.account} → ${tx.destinationAccount}';

    final needsReview = tx.reviewStatus == TransactionReviewStatus.needsReview;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        onTap: onOpen == null ? null : () => onOpen!(tx),
        leading: MfKindIcon(tx.kind.name),
        title: Text(tx.note.isEmpty ? tx.category : tx.note),
        subtitle: Text(
          '${tx.category} · $accountLine · ${formatYmdAsDmy(tx.occurredOn)}'
          '${needsReview ? '\nCần xem lại' : ''}',
        ),
        isThreeLine: needsReview,
        trailing: Text(
          formatMoneyWithKind(tx.amount, kind),
          style: mfMoneyStyle(
            TextStyle(color: color, fontWeight: FontWeight.w600),
          ),
        ),
      ),
    );
  }
}

/// "Khám phá" — the grouped feature hub that replaced the flat overflow
/// popup. Items arrive pre-tagged with a [DashboardMenuItem.section];
/// sections render in first-seen order so the caller controls priority
/// (features first, account/system last). Everything in the list is a
/// real destination or a real action — the hub exists to make the
/// app's surface area *reachable*, so no dead rows are allowed here.
class _HubPage extends StatelessWidget {
  const _HubPage({required this.items});

  final List<DashboardMenuItem> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // Group by section, preserving the order sections first appear in.
    final groups = <String?, List<DashboardMenuItem>>{};
    for (final item in items) {
      groups.putIfAbsent(item.section, () => []).add(item);
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Khám phá')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          for (final entry in groups.entries) ...[
            if (entry.key != null)
              Padding(
                padding: const EdgeInsets.only(left: 4, top: 16, bottom: 8),
                child: Text(
                  entry.key!,
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: context.mf.textSoft,
                    letterSpacing: 0.4,
                  ),
                ),
              )
            else
              const SizedBox(height: 8),
            Card(
              margin: EdgeInsets.zero,
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: [
                  for (var i = 0; i < entry.value.length; i++) ...[
                    _HubRow(item: entry.value[i]),
                    if (i < entry.value.length - 1)
                      Divider(
                        height: 1,
                        indent: 68,
                        color: context.mf.borderSubtle,
                      ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _HubRow extends StatelessWidget {
  const _HubRow({required this.item});

  final DashboardMenuItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mf = context.mf;
    final color = item.danger ? theme.colorScheme.error : null;
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: item.danger
              ? theme.colorScheme.error.withValues(alpha: 0.12)
              : mf.surfaceMuted,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(item.icon, size: 20, color: color ?? mf.textSoft),
      ),
      title: item.badge == null
          ? Text(item.label, style: TextStyle(color: color))
          : _MenuBadge(item: item),
      trailing: item.actsInPlace
          ? null
          : Icon(Icons.chevron_right, size: 20, color: color ?? mf.textMuted),
      onTap: () {
        // The callback was authored against a popup that closed itself;
        // on a pushed page the row must pop first so destinations land
        // on the dashboard, never stacked on the hub.
        Navigator.of(context).pop();
        item.onTap();
      },
    );
  }
}
