import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'activity_timeline_page.dart';
import 'analytics_page.dart';
import 'fintech_models.dart';
import 'fintech_store.dart';
import 'fintech_theme.dart';
import 'home_bento_page.dart';
import 'quick_capture_sheet.dart';
import 'wallets_page.dart';

class FintechApp extends StatefulWidget {
  const FintechApp({super.key, this.store});

  /// Optional test-injected store; when omitted, initializes a persistent store.
  final FintechStore? store;

  @override
  State<FintechApp> createState() => _FintechAppState();
}

class _FintechAppState extends State<FintechApp> {
  late final FintechStore _store;
  late final bool _ownsStore;

  @override
  void initState() {
    super.initState();
    _ownsStore = widget.store == null;
    _store = widget.store ?? FintechStore();
    if (_ownsStore) {
      _store.init();
    }
  }

  @override
  void dispose() {
    if (_ownsStore) _store.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MoneyFlow',
      debugShowCheckedModeBanner: false,
      theme: buildFintechTheme(),
      locale: const Locale('vi', 'VN'),
      supportedLocales: const [Locale('vi', 'VN'), Locale('en', 'US')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: FintechShell(store: _store),
    );
  }
}

class FintechShell extends StatefulWidget {
  const FintechShell({super.key, required this.store});

  final FintechStore store;

  @override
  State<FintechShell> createState() => _FintechShellState();
}

class _FintechShellState extends State<FintechShell> {
  int _tab = 0;

  Future<void> _openCapture({
    CaptureInputMode mode = CaptureInputMode.manual,
    TxKind kind = TxKind.expense,
    String? walletId,
    String? categoryId,
    int amount = 0,
    String? note,
  }) async {
    HapticFeedback.lightImpact();
    final created = await showQuickCaptureSheet(
      context,
      store: widget.store,
      initialMode: mode,
      initialKind: kind,
      initialWalletId: walletId,
      initialCategoryId: categoryId,
      initialAmount: amount,
      initialNote: note,
    );
    if (created != null && mounted) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(
              'Đã lưu ${created.note} · ${formatVnd(created.amount)}',
            ),
            action: SnackBarAction(
              label: 'Hoàn tác',
              textColor: FintechColors.cyan,
              onPressed: () => widget.store.deleteTransaction(created.id),
            ),
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.store,
      builder: (context, _) {
        return Scaffold(
          backgroundColor: FintechColors.canvas,
          body: Stack(
            children: [
              // Subtle ambient top glow
              Positioned(
                top: -90,
                left: -40,
                right: -40,
                height: 260,
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: RadialGradient(
                        center: const Alignment(0, -0.4),
                        radius: 1.0,
                        colors: [
                          FintechColors.indigo.withValues(alpha: 0.18),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              SafeArea(
                bottom: false,
                child: IndexedStack(
                  index: _tab,
                  children: [
                    HomeBentoPage(
                      store: widget.store,
                      onOpenCapture: _openCapture,
                      onSelectTab: (idx) => setState(() => _tab = idx),
                    ),
                    WalletsPage(
                      store: widget.store,
                      onOpenCapture: _openCapture,
                    ),
                    AnalyticsPage(store: widget.store),
                    ActivityTimelinePage(store: widget.store),
                  ],
                ),
              ),

              // Floating Midnight Glass Bottom Dock
              Align(
                alignment: Alignment.bottomCenter,
                child: SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(28),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
                        child: Container(
                          height: 68,
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          decoration: BoxDecoration(
                            color: FintechColors.surfaceGlass,
                            borderRadius: BorderRadius.circular(28),
                            border: Border.all(
                              color: FintechColors.border.withValues(alpha: 0.9),
                            ),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x8804060C),
                                blurRadius: 24,
                                offset: Offset(0, 10),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              _DockTabButton(
                                icon: Icons.space_dashboard_rounded,
                                label: 'Trang chủ',
                                active: _tab == 0,
                                onTap: () => _selectTab(0),
                              ),
                              _DockTabButton(
                                icon: Icons.credit_card_rounded,
                                label: 'Ví & Thẻ',
                                active: _tab == 1,
                                onTap: () => _selectTab(1),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 6),
                                child: _CenterCaptureButton(
                                  onTap: () => _openCapture(),
                                ),
                              ),
                              _DockTabButton(
                                icon: Icons.pie_chart_rounded,
                                label: 'Phân tích',
                                active: _tab == 2,
                                onTap: () => _selectTab(2),
                              ),
                              _DockTabButton(
                                icon: Icons.receipt_long_rounded,
                                label: 'Sổ thu chi',
                                active: _tab == 3,
                                onTap: () => _selectTab(3),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _selectTab(int next) {
    if (_tab == next) return;
    HapticFeedback.selectionClick();
    setState(() => _tab = next);
  }
}

class _DockTabButton extends StatelessWidget {
  const _DockTabButton({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = active ? FintechColors.textPrimary : FintechColors.textMuted;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 2),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 21,
                color: active ? FintechColors.cyan : color,
              ),
              const SizedBox(height: 3),
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                    color: color,
                  ),
                  maxLines: 1,
                ),
              ),
              const SizedBox(height: 2),
              AnimatedContainer(
                duration: const Duration(milliseconds: 160),
                width: active ? 4 : 0,
                height: 4,
                decoration: const BoxDecoration(
                  color: FintechColors.cyan,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CenterCaptureButton extends StatelessWidget {
  const _CenterCaptureButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Ghi nhanh',
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [FintechColors.indigoBright, FintechColors.cyan],
          ),
          boxShadow: [
            BoxShadow(
              color: FintechColors.cyan.withValues(alpha: 0.42),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: onTap,
            child: const SizedBox(
              width: 54,
              height: 48,
              child: Icon(Icons.add_rounded, color: Colors.white, size: 28),
            ),
          ),
        ),
      ),
    );
  }
}
