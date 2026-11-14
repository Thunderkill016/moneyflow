import 'package:flutter/material.dart';

import 'fintech_models.dart';
import 'fintech_store.dart';
import 'fintech_theme.dart';

class FinBrandMark extends StatelessWidget {
  const FinBrandMark({super.key, this.size = 34});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.32),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [FintechColors.indigo, FintechColors.cyan],
        ),
        boxShadow: [
          BoxShadow(
            color: FintechColors.indigo.withValues(alpha: 0.35),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Icon(
        Icons.bolt_rounded,
        color: Colors.white,
        size: size * 0.62,
      ),
    );
  }
}

class TxTileRow extends StatelessWidget {
  const TxTileRow({
    super.key,
    required this.tx,
    required this.store,
    this.onTap,
    this.onDelete,
  });

  final FinTx tx;
  final FintechStore store;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final cat = categoryById(tx.categoryId);
    final wallet = store.walletById(tx.walletId);
    final toWallet = tx.toWalletId != null ? store.walletById(tx.toWalletId!) : null;
    final walletText = toWallet != null
        ? '${wallet.bankCode} → ${toWallet.bankCode}'
        : wallet.bankCode;

    final amountColor = switch (tx.kind) {
      TxKind.income => FintechColors.emerald,
      TxKind.expense => FintechColors.textPrimary,
      TxKind.transfer => FintechColors.sky,
    };

    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      onLongPress: onDelete,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: bentoDecoration(
          fill: FintechColors.surface,
          borderColor: FintechColors.borderSubtle,
          radius: 18,
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: cat.color.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(13),
                border: Border.all(color: cat.color.withValues(alpha: 0.32)),
              ),
              child: Icon(cat.icon, color: cat.color, size: 19),
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tx.note,
                    style: const TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: FintechColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          '${cat.name} · $walletText · ${formatVnTime(tx.timestamp)}',
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: FintechColors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (tx.source == TxSource.voice || tx.source == TxSource.bill) ...[
                        const SizedBox(width: 5),
                        Icon(
                          tx.source == TxSource.voice
                              ? Icons.mic_rounded
                              : Icons.document_scanner_rounded,
                          size: 12,
                          color: FintechColors.cyan,
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(
              store.hideBalance
                  ? '••••••'
                  : formatVnd(tx.amount, signed: true, kind: tx.kind),
              style: tabularStyle(
                TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: amountColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AppleWalletCard extends StatelessWidget {
  const AppleWalletCard({
    super.key,
    required this.wallet,
    required this.hideBalance,
    this.width,
    this.selected = false,
    this.sharePct,
    this.onTap,
  });

  final WalletCardModel wallet;
  final bool hideBalance;
  final double? width;
  final bool selected;
  final double? sharePct;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c1 = Color(wallet.gradientColors.first);
    final c2 = Color(wallet.gradientColors.last);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: width,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [c1.withValues(alpha: 0.92), c2],
          ),
          border: Border.all(
            color: selected
                ? Colors.white.withValues(alpha: 0.85)
                : Colors.white.withValues(alpha: 0.16),
            width: selected ? 1.8 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: c2.withValues(alpha: 0.45),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Flexible(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.24),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(wallet.icon, size: 13, color: Colors.white),
                          const SizedBox(width: 5),
                          Text(
                            wallet.bankCode,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        wallet.accountMask,
                        maxLines: 1,
                        style: tabularStyle(
                          TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w600,
                            color: Colors.white.withValues(alpha: 0.78),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              wallet.name,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: Colors.white.withValues(alpha: 0.85),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Text(
                      hideBalance ? '•••••••• ₫' : formatVnd(wallet.balance),
                      style: tabularStyle(
                        const TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
                if (sharePct != null) ...[
                  const SizedBox(width: 8),
                  Text(
                    '${(sharePct! * 100).round()}%',
                    style: tabularStyle(
                      TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: Colors.white.withValues(alpha: 0.8),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
