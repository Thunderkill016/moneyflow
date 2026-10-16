import 'package:flutter/material.dart';

import '../../domain/datetime_label.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../theme/mf_theme.dart';
import '../shared/empty_state.dart';
import '../shared/timed_snack_bar.dart';

/// Account list + create/archive — mirrors the web's account management
/// surface (create_financial_account, set_financial_account_archived).
/// A row tap opens the register via [onOpen] — the web's "Xem sổ" link;
/// create/archive/edit callbacks are nullable so the demo surface stays
/// honestly read-only.
class AccountsPage extends StatefulWidget {
  const AccountsPage({
    super.key,
    required this.loadAccounts,
    this.onCreate,
    this.onArchive,
    this.onUpdate,
    this.onOpen,
    this.latestActivityFor,
  });

  /// May return every account including archived — archived rows group
  /// under "Đã lưu trữ" so the archive stays reversible from this page.
  final Future<List<AccountSummary>> Function() loadAccounts;

  /// Create — null hides the "Thêm tài khoản" action entirely.
  final Future<void> Function(
    String name,
    AccountKind kind,
    int initialBalance,
  )?
  onCreate;

  /// Long-press archive / "Khôi phục" on archived rows — null disables
  /// both.
  final Future<void> Function(String accountId, bool archived)? onArchive;

  /// Tap-to-edit — shown as a trailing edit button when [onOpen] claims
  /// the row tap; when [onOpen] is null the tap itself edits.
  final Future<void> Function(
    AccountSummary account,
    String name,
    AccountKind kind,
    int initialBalance,
  )?
  onUpdate;

  /// Row tap opens the account register — null keeps the legacy
  /// tap-to-edit behavior.
  final void Function(AccountSummary account)? onOpen;

  /// Latest ledger date per account — null return means "no data yet".
  /// A null callback omits the freshness line entirely (demo or tests
  /// that don't need it). The row stays silent until the lookup
  /// resolves — a spinner-free "Chưa có giao dịch" would be a lie.
  final Future<String?> Function(String accountId)? latestActivityFor;

  @override
  State<AccountsPage> createState() => _AccountsPageState();
}

class _AccountsPageState extends State<AccountsPage> {
  late Future<List<AccountSummary>> _accounts;

  /// accountId → latest occurred_on; absent key = lookup still running.
  final _freshness = <String, String?>{};

  @override
  void initState() {
    super.initState();
    _accounts = widget.loadAccounts();
    _loadFreshness();
  }

  Future<void> _refresh() async {
    setState(() {
      _accounts = widget.loadAccounts();
      _freshness.clear();
    });
    _loadFreshness();
    try {
      await _accounts;
    } catch (_) {}
  }

  /// Fills [_freshness] after the account list lands. A lookup failure
  /// just leaves the row without a freshness line — the account-load
  /// error already has its own surface in the FutureBuilder.
  Future<void> _loadFreshness() async {
    final lookup = widget.latestActivityFor;
    if (lookup == null) return;
    try {
      final accounts = await _accounts;
      final results = <String, String?>{};
      await Future.wait([
        for (final a in accounts)
          lookup(a.id)
              .then((date) => results[a.id] = date)
              // One failing lookup must not blank the whole column.
              .catchError((_) => null),
      ]);
      if (!mounted) return;
      setState(() => _freshness.addAll(results));
    } catch (_) {}
  }

  String _subtitleFor(AccountSummary a) {
    final kind = accountKindLabel(a.kind);
    if (!_freshness.containsKey(a.id)) return kind;
    final date = _freshness[a.id];
    return date == null
        ? '$kind · Chưa có giao dịch'
        : '$kind · Dữ liệu đến ${formatYmdAsDmy(date)}';
  }

  /// Create when [editing] is null, otherwise edit that account in
  /// place — both paths go through the shared [showAccountFormDialog].
  Future<void> _showForm({AccountSummary? editing}) async {
    final saved = await showAccountFormDialog(
      context,
      editing: editing,
      onSave: (name, kind, bal) => editing == null
          ? widget.onCreate!(name, kind, bal)
          : widget.onUpdate!(editing, name, kind, bal),
    );
    if (saved) _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tài khoản')),
      body: FutureBuilder(
        future: _accounts,
        builder: (context, snap) {
          // Same failure contract as the dashboard/inbox: an explicit
          // friendly message + retry, never a forever spinner.
          if (snap.hasError) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Không tải được tài khoản'),
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
          final archived = [
            for (final a in snap.data!)
              if (a.isArchived) a,
          ];
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                if (snap.data!.isEmpty)
                  EmptyStateCard(
                    icon: Icons.account_balance_wallet_outlined,
                    title: 'Chưa có tài khoản nào',
                    message: 'Tạo ví hoặc tài khoản để bắt đầu ghi khoản.',
                    actionLabel: widget.onCreate == null
                        ? null
                        : 'Thêm tài khoản',
                    onAction: widget.onCreate == null
                        ? null
                        : () => _showForm(),
                  ),
                for (final (i, a)
                    in snap.data!.where((a) => !a.isArchived).indexed)
                  _accountTile(
                    a,
                    fill: mfPastelFills[i % mfPastelFills.length],
                  ),
                if (archived.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Text(
                    'Đã lưu trữ',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  for (final a in archived) _accountTile(a),
                ],
              ],
            ),
          );
        },
      ),
      floatingActionButton: widget.onCreate == null
          ? null
          : FloatingActionButton.extended(
              onPressed: _showForm,
              icon: const Icon(Icons.add),
              label: const Text('Thêm tài khoản'),
            ),
    );
  }

  /// Archive asks first (it hides the account from pickers); restoring
  /// is immediate, matching the categories page's no-confirm "Hiện lại".
  /// A failed write surfaces instead of silently keeping the row put.
  Future<void> _applyArchived(AccountSummary a, bool archived) async {
    try {
      await widget.onArchive!(a.id, archived);
    } catch (e) {
      if (mounted) _snack(accountFormErrorMessage(e));
      return;
    }
    _snack(archived ? 'Đã lưu trữ tài khoản.' : 'Đã hiện lại tài khoản.');
    _refresh();
  }

  void _snack(String message) {
    showTimedSnackBar(
      ScaffoldMessenger.of(context),
      SnackBar(content: Text(message)),
    );
  }

  static IconData _kindIcon(AccountKind k) => switch (k) {
    AccountKind.cash => Icons.payments_outlined,
    AccountKind.bank => Icons.account_balance_outlined,
    AccountKind.eWallet => Icons.smartphone_outlined,
    AccountKind.creditCard => Icons.credit_card_outlined,
    AccountKind.savings => Icons.savings_outlined,
  };

  Widget _accountTile(AccountSummary a, {Color? fill}) {
    // Active wallets sit on a pastel fill (the reference's wallet card);
    // archived rows stay on the neutral card so they read as inactive.
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: fill,
      child: ListTile(
        leading: MfSquareIcon(
          icon: _kindIcon(a.kind),
          fill: fill == null
              ? mfPastelFills.first
              : Colors.white.withValues(alpha: 0.6),
        ),
        title: Text(a.name),
        subtitle: Text(_subtitleFor(a)),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              formatMoney(a.balance),
              style: mfMoneyStyle(
                TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: fill == null ? null : mfPastelInk,
                ),
              ),
            ),
            // Archived rows get restore instead of edit — restore first,
            // then edit, like the web/categories rule.
            if (a.isArchived && widget.onArchive != null)
              TextButton(
                onPressed: () => _applyArchived(a, false),
                child: const Text('Khôi phục'),
              )
            // The tap went to the register — actions live in a visible
            // overflow menu like the web row's Sửa/Lưu trữ pair;
            // long-press stays as a shortcut.
            else if (widget.onOpen != null &&
                (widget.onUpdate != null || widget.onArchive != null))
              PopupMenuButton<String>(
                tooltip: 'Tùy chọn ${a.name}',
                iconSize: 20,
                onSelected: (action) {
                  switch (action) {
                    case 'edit':
                      _showForm(editing: a);
                    case 'archive':
                      _confirmArchive(a);
                  }
                },
                itemBuilder: (ctx) => [
                  if (widget.onUpdate != null)
                    const PopupMenuItem(value: 'edit', child: Text('Sửa')),
                  if (widget.onArchive != null)
                    const PopupMenuItem(
                      value: 'archive',
                      child: Text('Lưu trữ'),
                    ),
                ],
              ),
          ],
        ),
        onTap: widget.onOpen != null
            ? () => widget.onOpen!(a)
            : widget.onUpdate == null || a.isArchived
            ? null
            : () => _showForm(editing: a),
        onLongPress: widget.onArchive == null || a.isArchived
            ? null
            : () => _confirmArchive(a),
      ),
    );
  }

  Future<void> _confirmArchive(AccountSummary a) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Lưu trữ "${a.name}"?'),
        content: const Text(
          'Tài khoản sẽ ẩn khỏi danh sách; giao dịch cũ vẫn giữ.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Lưu trữ'),
          ),
        ],
      ),
    );
    if (ok == true) await _applyArchived(a, true);
  }
}

/// Account-form error copy shared by every host of the dialog — the
/// accounts page and the zero-account capture state report identical
/// failures with identical wording.
String accountFormErrorMessage(Object e) {
  final msg = e.toString();
  if (msg.contains('stale_write')) {
    return 'Tài khoản vừa thay đổi — đóng rồi mở lại để sửa bản mới';
  }
  if (msg.contains('invalid_account_name')) {
    return 'Tên tài khoản chưa hợp lệ';
  }
  return 'Không lưu được — thử lại';
}

/// The shared create/edit account form — the accounts page hosts it
/// from the FAB and row actions, and other surfaces (capture's
/// zero-account state, the empty-ledger intro, first-run onboarding)
/// reuse it so a first wallet is never created two different ways.
/// [onSave] performs the actual write; the dialog stays open with an
/// honest error when it throws. Returns true only when a save actually
/// landed. [title]/[submitLabel]/[initialName] let a host reword the
/// chrome (e.g. onboarding's "Xác nhận ví tiền mặt") without forking
/// the form.
Future<bool> showAccountFormDialog(
  BuildContext context, {
  AccountSummary? editing,
  String? title,
  String? submitLabel,
  String? initialName,
  required Future<void> Function(
    String name,
    AccountKind kind,
    int initialBalance,
  )
  onSave,
}) async {
  final name = TextEditingController(text: editing?.name ?? initialName ?? '');
  final balance = TextEditingController(
    text: editing == null ? '' : editing.initialBalance.toString(),
  );
  AccountKind kind = editing?.kind ?? AccountKind.cash;
  String? error;
  final saved = await showDialog<bool>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setDlg) => AlertDialog(
        title: Text(
          title ?? (editing == null ? 'Thêm tài khoản' : 'Sửa tài khoản'),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: name,
                decoration: const InputDecoration(
                  labelText: 'Tên tài khoản',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<AccountKind>(
                initialValue: kind,
                decoration: const InputDecoration(
                  labelText: 'Loại',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(
                    value: AccountKind.cash,
                    child: Text('Tiền mặt'),
                  ),
                  DropdownMenuItem(
                    value: AccountKind.bank,
                    child: Text('Ngân hàng'),
                  ),
                  DropdownMenuItem(
                    value: AccountKind.eWallet,
                    child: Text('Ví điện tử'),
                  ),
                  DropdownMenuItem(
                    value: AccountKind.creditCard,
                    child: Text('Thẻ tín dụng'),
                  ),
                  DropdownMenuItem(
                    value: AccountKind.savings,
                    child: Text('Tiết kiệm'),
                  ),
                ],
                onChanged: (v) => setDlg(() => kind = v ?? kind),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: balance,
                decoration: const InputDecoration(
                  labelText: 'Số dư ban đầu',
                  hintText: 'vd: 500k',
                  border: OutlineInputBorder(),
                ),
              ),
              if (error != null) ...[
                const SizedBox(height: 12),
                Text(
                  error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () async {
              final n = name.text.trim();
              if (n.isEmpty) return;
              // An empty balance is a legitimate 0 opening; a non-empty
              // entry the money parser rejects must fail visibly — `?? 0`
              // here used to silently save a mistyped balance as 0.
              final balRaw = balance.text.trim();
              final bal = balRaw.isEmpty ? 0 : parseMoneyInput(balRaw);
              if (bal == null) {
                setDlg(() => error = 'Số tiền không hợp lệ');
                return;
              }
              try {
                await onSave(n, kind, bal);
              } catch (e) {
                setDlg(() => error = accountFormErrorMessage(e));
                return;
              }
              if (ctx.mounted) Navigator.pop(ctx, true);
            },
            child: Text(submitLabel ?? (editing == null ? 'Tạo' : 'Lưu')),
          ),
        ],
      ),
    ),
  );
  return saved ?? false;
}
