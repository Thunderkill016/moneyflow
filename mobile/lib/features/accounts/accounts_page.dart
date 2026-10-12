import 'package:flutter/material.dart';

import '../../domain/models.dart';
import '../../domain/money.dart';

/// Account list + create/archive — mirrors the web's account management
/// surface (create_financial_account, set_financial_account_archived).
class AccountsPage extends StatefulWidget {
  const AccountsPage({
    super.key,
    required this.loadAccounts,
    required this.onCreate,
    required this.onArchive,
  });

  final Future<List<AccountSummary>> Function() loadAccounts;
  final Future<void> Function(String name, AccountKind kind, int initialBalance)
  onCreate;
  final Future<void> Function(String accountId, bool archived) onArchive;

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
    setState(() => _accounts = widget.loadAccounts());
    try {
      await _accounts;
    } catch (_) {}
  }

  Future<void> _showCreate() async {
    final name = TextEditingController();
    final balance = TextEditingController();
    AccountKind kind = AccountKind.cash;
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: const Text('Thêm tài khoản'),
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
                final bal = parseMoneyInput(balance.text) ?? 0;
                await widget.onCreate(n, kind, bal);
                if (ctx.mounted) Navigator.pop(ctx, true);
              },
              child: const Text('Tạo'),
            ),
          ],
        ),
      ),
    );
    if (saved == true) _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tài khoản')),
      body: FutureBuilder(
        future: _accounts,
        builder: (context, snap) {
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
                      subtitle: Text(_kindLabel(a.kind)),
                      trailing: Text(formatMoney(a.balance)),
                      onLongPress: () => _confirmArchive(a),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreate,
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
      await widget.onArchive(a.id, true);
      _refresh();
    }
  }

  String _kindLabel(AccountKind kind) => switch (kind) {
    AccountKind.cash => 'Tiền mặt',
    AccountKind.bank => 'Ngân hàng',
    AccountKind.eWallet => 'Ví điện tử',
    AccountKind.creditCard => 'Thẻ tín dụng',
    AccountKind.savings => 'Tiết kiệm',
  };
}
