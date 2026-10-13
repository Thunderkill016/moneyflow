import 'package:flutter/material.dart';
import '../../data/demo_store.dart';
import '../../data/offline_cache.dart';
import '../../data/recurring_dismissals.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../domain/recurring_detection.dart';
import '../../domain/report.dart' show dateAdd, ymd;
import '../../domain/safe_to_spend.dart';

/// One entry in the dashboard overflow menu — keeps the appbar to a single
/// quick action (activity) as the surface count grows.
class DashboardMenuItem {
  const DashboardMenuItem({
    required this.label,
    required this.icon,
    required this.onTap,
    this.badge,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

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
    this.modeLabel,
    this.menuItems = const [],
    this.readSnapshot,
    this.writeSnapshot,
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
  final Future<List<Transaction>> Function(String from, String to)?
  loadSuggestionTransactions;

  /// "Tạo cam kết" on a suggestion — the app shell opens the shared
  /// planning form prefilled and reports whether a real save happened.
  final Future<bool> Function(RecurringSuggestion suggestion)?
  onCreateCommitment;
  final String? modeLabel;
  final List<DashboardMenuItem> menuItems;

  /// Offline read-back: when the loaders throw and a snapshot exists, the
  /// dashboard renders it under an explicit stale label — never as fresh.
  final DashboardSnapshot? Function()? readSnapshot;

  /// Called with a fresh snapshot after every successful load.
  final Future<void> Function(DashboardSnapshot snapshot)? writeSnapshot;

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
      final txs = await loader(
        recurringDetectionStart(today),
        ymd(dateAdd(today, 1)),
      );
      final covered = {
        for (final c in commitments.where((c) => !c.isArchived))
          ...recurringCommitmentKeys(c),
      };
      final dismissed = await RecurringDismissals.load();
      return detectRecurring(
        txs,
        covered,
        today: today,
      ).where((s) => !dismissed.contains(s.key)).toList();
    } catch (_) {
      return const [];
    }
  }

  /// "Ẩn" is permanent — the key lands in mf_recurring_dismissed and the
  /// pattern is filtered out on every later load.
  Future<void> _dismissSuggestion(RecurringSuggestion s) async {
    setState(() => _hiddenSuggestions.add(s.key));
    await RecurringDismissals.dismiss(s.key);
  }

  /// A real save covers the pattern via the new commitment's keys; hiding
  /// the card immediately just mirrors what the next load would compute.
  Future<void> _createCommitment(RecurringSuggestion s) async {
    final created = await widget.onCreateCommitment!(s);
    if (created && mounted) {
      setState(() => _hiddenSuggestions.add(s.key));
    }
  }

  Future<void> _refresh() async {
    setState(() => _data = _load());
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
              onSelected: (i) => widget.menuItems[i].onTap(),
              itemBuilder: (ctx) => [
                for (var i = 0; i < widget.menuItems.length; i++)
                  PopupMenuItem(
                    value: i,
                    child: ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(widget.menuItems[i].icon),
                      title: widget.menuItems[i].badge == null
                          ? Text(widget.menuItems[i].label)
                          : _MenuBadge(item: widget.menuItems[i]),
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
          final total = accounts.fold<int>(0, (s, a) => s + a.balance);
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
                  const _EmptyLedgerIntro()
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
                    const Card(
                      child: ListTile(title: Text('Chưa có giao dịch nào')),
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
class _EmptyLedgerIntro extends StatelessWidget {
  const _EmptyLedgerIntro();

  @override
  Widget build(BuildContext context) {
    final samples = DemoStore.seedTransactions().take(2).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 20),
        Card(
          child: ListTile(
            title: const Text('Sổ của bạn đang trống'),
            subtitle: const Text(
              'Dưới đây là dữ liệu mẫu — bấm "Ghi" ở thanh dưới để '
              'thêm khoản đầu tiên của bạn.',
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
            Text(
              formatMoney(total),
              style: Theme.of(
                context,
              ).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
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
              Text(
                formatMoney(s.perDayMinor),
                style: text.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              Text('trong hạn mức ngân sách tháng này', style: text.bodySmall),
              const SizedBox(height: 4),
              Text(
                'Còn ${formatMoney(s.remainingMinor)} đến hết tháng '
                '(${s.daysLeft} ngày)',
                style: text.bodySmall,
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
