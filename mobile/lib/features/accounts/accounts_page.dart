import 'package:flutter/material.dart';

import '../../domain/models.dart';
import '../../domain/money.dart';

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
  });

  final Future<List<AccountSummary>> Function() loadAccounts;

  /// Create — null hides the "Thêm tài khoản" action entirely.
  final Future<void> Function(
    String name,
    AccountKind kind,
    int initialBalance,
  )?
  onCreate;

  /// Long-press archive — null disables the gesture.
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

  @override
  State<AccountsPage> createState() => _AccountsPageState();
}

class _AccountsPageState extends State<AccountsPage> {
  late Future<List<AccountSummary>> _accounts;

  @override
  void initState() {
    super.initState();
    _accounts = widget.loadAccounts();
  }

  Future<void> _refresh() async {
    setState(() {
      _accounts = widget.loadAccounts();
    });
    try {
      await _accounts;
    } catch (_) {}
  }

  /// Create when [editing] is null, otherwise edit that account in place.
  Future<void> _showForm({AccountSummary? editing}) async {
    final name = TextEditingController(text: editing?.name ?? '');
    final balance = TextEditingController(
      text: editing == null ? '' : editing.initialBalance.toString(),
    );
    AccountKind kind = editing?.kind ?? AccountKind.cash;
    String? error;
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: Text(editing == null ? 'Thêm tài khoản' : 'Sửa tài khoản'),
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
                  Text(error!, style: TextStyle(color: Colors.red.shade700)),
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
                  if (editing == null) {
                    await widget.onCreate!(n, kind, bal);
                  } else {
                    await widget.onUpdate!(editing, n, kind, bal);
                  }
                } catch (e) {
                  setDlg(() => error = _saveError(e));
                  return;
                }
                if (ctx.mounted) Navigator.pop(ctx, true);
              },
              child: Text(editing == null ? 'Tạo' : 'Lưu'),
            ),
          ],
        ),
      ),
    );
    if (saved == true) _refresh();
  }

  String _saveError(Object e) {
    final msg = e.toString();
    if (msg.contains('stale_write')) {
      return 'Tài khoản vừa thay đổi — đóng rồi mở lại để sửa bản mới';
    }
    if (msg.contains('invalid_account_name')) {
      return 'Tên tài khoản chưa hợp lệ';
    }
    return 'Không lưu được — thử lại';
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
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                for (final a in snap.data!)
                  Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: CircleAvatar(
                        child: Text(a.name.characters.first),
                      ),
                      title: Text(a.name),
                      subtitle: Text(accountKindLabel(a.kind)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(formatMoney(a.balance)),
                          // The tap went to the register — keep edit one
                          // tap away, like the web row's "Sửa" button.
                          if (widget.onOpen != null && widget.onUpdate != null)
                            IconButton(
                              icon: const Icon(Icons.edit_outlined),
                              tooltip: 'Sửa ${a.name}',
                              onPressed: () => _showForm(editing: a),
                            ),
                        ],
                      ),
                      onTap: widget.onOpen != null
                          ? () => widget.onOpen!(a)
                          : widget.onUpdate == null
                          ? null
                          : () => _showForm(editing: a),
                      onLongPress: widget.onArchive == null
                          ? null
                          : () => _confirmArchive(a),
                    ),
                  ),
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
    if (ok == true) {
      await widget.onArchive!(a.id, true);
      _refresh();
    }
  }
}
