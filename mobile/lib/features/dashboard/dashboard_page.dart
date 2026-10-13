import 'package:flutter/material.dart';
import '../../data/demo_store.dart';
import '../../data/offline_cache.dart';
import '../../data/recurring_dismissals.dart';
import '../../data/widget_snapshot.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../domain/recurring_detection.dart';
import '../../domain/report.dart' show dateAdd, ymd;
import '../../domain/safe_to_spend.dart';
import '../../domain/spoken_vnd.dart';
import '../shared/empty_state.dart';

/// One entry in the dashboard overflow menu — keeps the appbar to a single
/// quick action (activity) as the surface count grows.
class DashboardMenuItem {
  const DashboardMenuItem({
    required this.label,
    required this.icon,
    required this.onTap,
    this.badge,
    this.danger = false,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  /// Destructive entries (account deletion) render in the scheme's error
  /// color — the icon and label must read as dangerous at a glance, not
  /// rely on position next to sign-out.
  final bool danger;

  /// Optional live count — fetched when the menu opens (itemBuilder runs per
  /// open, so this costs one cheap read per tap, never per dashboard build).
  /// A failure or 0 shows the bare label — a badge must never lie.
  final Future<int> Function()? badge;
}

/// Dashboard loads its data through injected loaders so the same screen
/// serves demo mode (local seeds) and authenticated mode (Neon Data API).
class DashboardPage extends StatefulWidget {
  const DashboardPage({
    super.key,
    required this.loadAccounts,
    required this.loadTransactions,
    this.loadBudgets,
    this.loadCommitments,
    this.loadSuggestionTransactions,
    this.onCreateCommitment,
    this.onCreateAccount,
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
    loadBudgets: (monthStart) async => DemoStore.seedBudgets(monthStart),
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

  /// Optional planning loaders for the "Chi được hôm nay" tile — both are
  /// keyed on the YYYY-MM-01 month start. When either is absent the tile
  /// is hidden entirely rather than guessing at a number.
  final Future<List<BudgetProgress>> Function(String monthStart)? loadBudgets;
  final Future<List<RecurringCommitment>> Function(String monthStart)?
  loadCommitments;

  /// Optional detection source for the recurring-suggestion card — the
  /// [from, to) range contract of RealStore.loadTransactionsInRange.
  /// Absent (or a failed read) simply means no card: the dashboard never
  /// invents a pattern to fill the slot.
  final Future<({List<Transaction> rows, bool truncated})> Function(
    String from,
    String to,
  )?
  loadSuggestionTransactions;

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

/// Loaded dashboard payload — planning rows ride along so the safe-spend
/// tile renders in the same pass; they stay null when the loaders are
/// absent or their reads fail.
typedef _DashboardData = ({
  List<AccountSummary> accounts,
  List<Transaction> txs,
  int? savedAtMs,
  List<BudgetProgress>? budgets,
  List<RecurringCommitment>? commitments,
  List<RecurringSuggestion> suggestions,
});

class DashboardPageState extends State<DashboardPage> {
  late Future<_DashboardData> _data;

  /// Suggestions hidden this session — persisted dismissals are filtered
  /// at load; this set also covers a just-created commitment until the
  /// next load's coverage keys exclude the pattern for real.
  final _hiddenSuggestions = <String>{};

  @override
  void initState() {
    super.initState();
    _data = _load();
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
      );
    }
  }

  /// The safe-spend tile is auxiliary — a planning-read failure hides the
  /// tile rather than failing the whole dashboard. No fake numbers.
  Future<(List<BudgetProgress>?, List<RecurringCommitment>?)>
  _loadPlanningRows() async {
    if (widget.loadBudgets == null || widget.loadCommitments == null) {
      return (null, null);
    }
    final n = DateTime.now();
    final monthStart = '${n.year}-${n.month.toString().padLeft(2, '0')}-01';
    try {
      final budgets = await widget.loadBudgets!(monthStart);
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
      final today = DateTime.now();
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

  /// The widget mirrors exactly what the tiles show — the VND-only
  /// total, and the "Chi được hôm nay" figure only when planning data
  /// actually produced one (no budget means null, and the widget renders
  /// the same honest "—" the card's missing-tile case implies).
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
        today: DateTime.now(),
      )?.perDayMinor;
    }
    await sink(
      WidgetSnapshot(
        totalVnd: _vndTotal(accounts),
        safeSpendVnd: safeSpend,
        savedAtMs: DateTime.now().millisecondsSinceEpoch,
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
      appBar: AppBar(
        title: const Text('MoneyFlow'),
        actions: [
          if (widget.modeLabel != null) Center(child: Text(widget.modeLabel!)),
          if (widget.menuItems.isNotEmpty)
            PopupMenuButton<int>(
              icon: const Icon(Icons.more_vert),
              tooltip: 'Mở menu',
              onSelected: (i) => widget.menuItems[i].onTap(),
              itemBuilder: (ctx) => [
                for (var i = 0; i < widget.menuItems.length; i++)
                  PopupMenuItem(
                    value: i,
                    child: Builder(
                      builder: (itemCtx) {
                        final item = widget.menuItems[i];
                        final color = item.danger
                            ? Theme.of(itemCtx).colorScheme.error
                            : null;
                        return ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          leading: Icon(item.icon, color: color),
                          title: item.badge == null
                              ? Text(item.label, style: TextStyle(color: color))
                              : _MenuBadge(item: item),
                        );
                      },
                    ),
                  ),
              ],
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: FutureBuilder(
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
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                if (savedAtMs != null) _StaleBanner(savedAtMs: savedAtMs),
                _TotalCard(total: total),
                if (budgets != null && commitments != null) ...[
                  const SizedBox(height: 12),
                  _SafeSpendCard(
                    spend: safeDailySpend(
                      budgets: budgets,
                      commitments: commitments,
                      today: DateTime.now(),
                    ),
                  ),
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
                  Text(
                    'Tài khoản',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  for (final a in accounts) _AccountTile(account: a),
                  const SizedBox(height: 20),
                  Text(
                    'Hoạt động gần đây',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  if (txs.isEmpty)
                    const EmptyStateCard(
                      icon: Icons.receipt_long_outlined,
                      title: 'Chưa có giao dịch nào',
                      message:
                          'Bấm "Ghi" ở thanh dưới để thêm khoản '
                          'đầu tiên của bạn.',
                    ),
                  for (final t in txs) _TransactionTile(tx: t),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

/// The one VND-balance fold — the hero total and the widget snapshot
/// must never disagree on what "Tổng số dư" means.
int _vndTotal(List<AccountSummary> accounts) => accounts
    .where((a) => a.currencyCode == 'VND')
    .fold<int>(0, (s, a) => s + a.balance);

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
    return Card(
      color: Theme.of(context).colorScheme.errorContainer,
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        dense: true,
        leading: const Icon(Icons.wifi_off),
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

class _TotalCard extends StatelessWidget {
  const _TotalCard({required this.total});
  final int total;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Tổng số dư', style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 6),
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
                  Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// "Chi được hôm nay" tile — a safe-per-day spend figure under the
/// balance hero (Simplifi spending plan / PocketGuard "In My Pocket").
/// It stays visibly secondary to the hero, is labeled as budget headroom
/// so nobody mistakes it for an account balance, and carries no action —
/// with no budgets it shows an honest setup nudge instead of a number.
class _SafeSpendCard extends StatelessWidget {
  const _SafeSpendCard({required this.spend});

  final SafeDailySpend? spend;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final text = theme.textTheme;
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
                  Icons.today_outlined,
                  size: 18,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(width: 6),
                Text('Chi được hôm nay', style: text.labelLarge),
              ],
            ),
            const SizedBox(height: 6),
            if (s == null)
              Text(
                'Đặt ngân sách tháng để biết hôm nay nên chi tối đa bao nhiêu',
                style: text.bodyMedium,
              )
            else ...[
              Semantics(
                label: spokenVnd(s.perDayMinor),
                excludeSemantics: true,
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: _countUpMoney(
                    context,
                    s.perDayMinor,
                    text.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              Text('trong hạn mức ngân sách tháng này', style: text.bodySmall),
              const SizedBox(height: 4),
              Semantics(
                label:
                    'Còn ${spokenVnd(s.remainingMinor)} đến hết tháng, '
                    '${s.daysLeft} ngày',
                excludeSemantics: true,
                child: Text(
                  'Còn ${formatMoney(s.remainingMinor)} đến hết tháng '
                  '(${s.daysLeft} ngày)',
                  style: text.bodySmall,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// "Có vẻ là khoản định kỳ" — a detected monthly pattern the user may
/// declare as a commitment. Sits under the safe-spend tile with the other
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

class _AccountTile extends StatelessWidget {
  const _AccountTile({required this.account});
  final AccountSummary account;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(child: Text(account.name.characters.first)),
        title: Text(account.name),
        subtitle: Text(accountKindLabel(account.kind)),
        trailing: Text(formatMoney(account.balance)),
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  const _TransactionTile({required this.tx});
  final Transaction tx;

  @override
  Widget build(BuildContext context) {
    final kind = switch (tx.kind) {
      TransactionKind.income => MoneySignKind.income,
      TransactionKind.expense => MoneySignKind.expense,
      TransactionKind.transfer => MoneySignKind.transfer,
    };
    final color = switch (tx.kind) {
      TransactionKind.income => Colors.green.shade700,
      TransactionKind.expense => Colors.red.shade700,
      TransactionKind.transfer => Colors.blueGrey.shade700,
    };
    final accountLine = tx.destinationAccount == null
        ? tx.account
        : '${tx.account} → ${tx.destinationAccount}';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(tx.note.isEmpty ? tx.category : tx.note),
        subtitle: Text('${tx.category} · $accountLine · ${tx.occurredOn}'),
        trailing: Text(
          formatMoneyWithKind(tx.amount, kind),
          style: TextStyle(color: color, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
