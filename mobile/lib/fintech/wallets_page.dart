import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'fintech_models.dart';
import 'fintech_store.dart';
import 'fintech_theme.dart';
import 'fintech_widgets.dart';
import 'quick_capture_sheet.dart';

class WalletsPage extends StatefulWidget {
  const WalletsPage({
    super.key,
    required this.store,
    required this.onOpenCapture,
  });

  final FintechStore store;
  final Future<void> Function({
    CaptureInputMode mode,
    TxKind kind,
    String? walletId,
    String? categoryId,
    int amount,
    String? note,
  }) onOpenCapture;

  @override
  State<WalletsPage> createState() => _WalletsPageState();
}

class _WalletsPageState extends State<WalletsPage> {
  String? _selectedWalletId;

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final wallets = store.wallets;
    final total = store.totalBalance;
    final filteredTxs = store.transactionsForWallet(_selectedWalletId).take(10).toList();
    final selectedWallet =
        _selectedWalletId != null ? store.walletById(_selectedWalletId!) : null;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 112),
      children: [
        // Header
        Row(
          children: [
            const Expanded(
              child: Text(
                'Ví & Thẻ',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: FintechColors.textPrimary,
                  letterSpacing: -0.5,
                ),
              ),
            ),
            TextButton.icon(
              onPressed: () => _showAddWalletDialog(context),
              icon: const Icon(Icons.add_card_rounded, size: 18),
              label: const Text('Thêm ví'),
              style: TextButton.styleFrom(
                foregroundColor: FintechColors.cyan,
                backgroundColor: FintechColors.cyan.withValues(alpha: 0.12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Proportion Allocation Strip Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: bentoDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'TỔNG SỐ DƯ CÁC VÍ',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.9,
                        color: FintechColors.textSecondary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${wallets.length} nguồn tiền',
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: FintechColors.textMuted,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  store.hideBalance ? '•••••••••• ₫' : formatVnd(total),
                  style: tabularStyle(
                    const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: FintechColors.textPrimary,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: SizedBox(
                  height: 10,
                  child: Row(
                    children: wallets.map((w) {
                      final flex = w.balance > 0 ? w.balance : 1;
                      return Flexible(
                        flex: flex,
                        child: Container(
                          margin: const EdgeInsets.only(right: 2),
                          color: Color(w.gradientColors.first),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // 2-column Bento Apple Wallet Grid
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: wallets.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.15,
          ),
          itemBuilder: (context, index) {
            final wallet = wallets[index];
            final isSelected = wallet.id == _selectedWalletId;
            final share = total > 0 ? (wallet.balance / total).clamp(0.0, 1.0) : 0.0;
            return AppleWalletCard(
              wallet: wallet,
              hideBalance: store.hideBalance,
              selected: isSelected,
              sharePct: share,
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() {
                  _selectedWalletId = isSelected ? null : wallet.id;
                });
              },
            );
          },
        ),
        const SizedBox(height: 14),

        // Quick Wallet Actions
        Row(
          children: [
            Expanded(
              child: _WalletActionTile(
                icon: Icons.swap_horiz_rounded,
                label: 'Chuyển giữa ví',
                color: FintechColors.sky,
                onTap: () => widget.onOpenCapture(
                  kind: TxKind.transfer,
                  walletId: _selectedWalletId ?? wallets.first.id,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _WalletActionTile(
                icon: Icons.tune_rounded,
                label: 'Cập nhật số dư',
                color: FintechColors.indigoBright,
                onTap: () => _showAdjustBalanceDialog(
                  context,
                  selectedWallet ?? wallets.first,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),

        // Filtered Wallet Transactions
        Row(
          children: [
            Expanded(
              child: Text(
                selectedWallet == null
                    ? 'Biến động tất cả ví'
                    : 'Giao dịch · ${selectedWallet.name}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: FintechColors.textPrimary,
                ),
              ),
            ),
            if (selectedWallet != null)
              GestureDetector(
                onTap: () => setState(() => _selectedWalletId = null),
                child: const Text(
                  'Hiện tất cả',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: FintechColors.cyan,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 10),
        if (filteredTxs.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: bentoDecoration(),
            alignment: Alignment.center,
            child: const Text(
              'Chưa có giao dịch nào trên ví này.',
              style: TextStyle(color: FintechColors.textSecondary, fontSize: 13),
            ),
          )
        else
          for (var i = 0; i < filteredTxs.length; i++) ...[
            TxTileRow(tx: filteredTxs[i], store: store),
            if (i < filteredTxs.length - 1) const SizedBox(height: 8),
          ],
      ],
    );
  }

  Future<void> _showAdjustBalanceDialog(
    BuildContext context,
    WalletCardModel wallet,
  ) async {
    final ctrl = TextEditingController(text: wallet.balance.toString());
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          'Số dư ${wallet.name}',
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
        ),
        content: TextField(
          controller: ctrl,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(
            labelText: 'Số dư hiện tại (VND)',
            suffixText: '₫',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Huỷ'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      final parsed = int.tryParse(ctrl.text.trim());
      if (parsed != null) {
        await widget.store.adjustWalletBalance(wallet.id, parsed);
      }
    }
    ctrl.dispose();
  }

  Future<void> _showAddWalletDialog(BuildContext context) async {
    final nameCtrl = TextEditingController();
    final balanceCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(
          'Thêm ví / thẻ mới',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(
                labelText: 'Tên ngân hàng hoặc ví (VD: MB Bank)',
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: balanceCtrl,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(
                labelText: 'Số dư ban đầu (VND)',
                suffixText: '₫',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Huỷ'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Tạo ví'),
          ),
        ],
      ),
    );
    if (ok == true && nameCtrl.text.trim().isNotEmpty) {
      final name = nameCtrl.text.trim();
      final code = name
          .split(RegExp(r'\s+'))
          .map((w) => w.isEmpty ? '' : w[0].toUpperCase())
          .take(4)
          .join();
      final balance = int.tryParse(balanceCtrl.text.trim()) ?? 0;
      await widget.store.addWallet(
        WalletCardModel(
          id: 'w-${DateTime.now().microsecondsSinceEpoch}',
          name: name,
          bankCode: code.isEmpty ? 'WAL' : code,
          accountMask: '•• ${(DateTime.now().millisecond + 1000).toString().substring(0, 4)}',
          subtitle: 'Ví cá nhân',
          balance: balance,
          gradientColors: const [0xFF2563EB, 0xFF1E1B4B],
          iconKey: 'bank_tcb',
        ),
      );
    }
    nameCtrl.dispose();
    balanceCtrl.dispose();
  }
}

class _WalletActionTile extends StatelessWidget {
  const _WalletActionTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: bentoDecoration(
          fill: FintechColors.surface,
          borderColor: color.withValues(alpha: 0.35),
          radius: 18,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 7),
            Flexible(
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: FintechColors.textPrimary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
