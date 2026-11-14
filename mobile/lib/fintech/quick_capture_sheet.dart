import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:speech_to_text/speech_to_text.dart';

import 'fintech_models.dart';
import 'fintech_store.dart';
import 'fintech_theme.dart';

enum CaptureInputMode { manual, voice, bill }

Future<FinTx?> showQuickCaptureSheet(
  BuildContext context, {
  required FintechStore store,
  CaptureInputMode initialMode = CaptureInputMode.manual,
  TxKind initialKind = TxKind.expense,
  String? initialWalletId,
  String? initialCategoryId,
  int initialAmount = 0,
  String? initialNote,
}) {
  return showModalBottomSheet<FinTx>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: FintechColors.surface,
    barrierColor: Colors.black.withValues(alpha: 0.72),
    builder: (ctx) {
      return QuickCaptureSheet(
        store: store,
        initialMode: initialMode,
        initialKind: initialKind,
        initialWalletId: initialWalletId,
        initialCategoryId: initialCategoryId,
        initialAmount: initialAmount,
        initialNote: initialNote,
      );
    },
  );
}

class QuickCaptureSheet extends StatefulWidget {
  const QuickCaptureSheet({
    super.key,
    required this.store,
    this.initialMode = CaptureInputMode.manual,
    this.initialKind = TxKind.expense,
    this.initialWalletId,
    this.initialCategoryId,
    this.initialAmount = 0,
    this.initialNote,
  });

  final FintechStore store;
  final CaptureInputMode initialMode;
  final TxKind initialKind;
  final String? initialWalletId;
  final String? initialCategoryId;
  final int initialAmount;
  final String? initialNote;

  @override
  State<QuickCaptureSheet> createState() => _QuickCaptureSheetState();
}

class _QuickCaptureSheetState extends State<QuickCaptureSheet>
    with SingleTickerProviderStateMixin {
  late CaptureInputMode _mode;
  late TxKind _kind;
  late String _walletId;
  late String _toWalletId;
  late String _categoryId;
  late int _amount;
  TxSource _source = TxSource.manual;

  late final TextEditingController _noteCtrl;
  late final TextEditingController _voiceCtrl;
  late final AnimationController _scanCtrl;

  final SpeechToText _speech = SpeechToText();
  bool _listening = false;
  String? _speechNotice;
  bool _scanningBill = false;

  static const _voicePresets = [
    'Phở bò sáng 55k tiền mặt',
    'Cà phê Highlands 69k momo',
    'Đổ xăng 90k vcb',
    'Nhận lương 28 triệu vcb',
  ];

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;
    _kind = widget.initialKind;
    final wallets = widget.store.wallets;
    _walletId = widget.initialWalletId ?? (wallets.isNotEmpty ? wallets.first.id : 'vcb');
    _toWalletId = wallets.firstWhere((w) => w.id != _walletId, orElse: () => wallets.first).id;
    _categoryId = widget.initialCategoryId ?? _defaultCategoryFor(_kind);
    _amount = widget.initialAmount;
    if (_mode == CaptureInputMode.voice) _source = TxSource.voice;
    if (_mode == CaptureInputMode.bill) _source = TxSource.bill;

    _noteCtrl = TextEditingController(text: widget.initialNote ?? '');
    _voiceCtrl = TextEditingController();
    _scanCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    );
    _syncScanAnimation();
  }

  void _syncScanAnimation() {
    if (_mode == CaptureInputMode.bill) {
      if (!_scanCtrl.isAnimating) {
        _scanCtrl.repeat(reverse: true);
      }
    } else {
      _scanCtrl.stop();
    }
  }

  void _toggleMode(CaptureInputMode target) {
    setState(() {
      _mode = _mode == target ? CaptureInputMode.manual : target;
    });
    _syncScanAnimation();
  }

  @override
  void dispose() {
    _noteCtrl.dispose();
    _voiceCtrl.dispose();
    _scanCtrl.dispose();
    if (_listening) {
      try {
        _speech.stop();
      } catch (_) {}
    }
    super.dispose();
  }

  String _defaultCategoryFor(TxKind kind) {
    return switch (kind) {
      TxKind.expense => 'food',
      TxKind.income => 'salary',
      TxKind.transfer => 'transfer',
    };
  }

  Color get _kindAccent => switch (_kind) {
        TxKind.expense => FintechColors.coral,
        TxKind.income => FintechColors.emerald,
        TxKind.transfer => FintechColors.sky,
      };

  void _setKind(TxKind next) {
    setState(() {
      _kind = next;
      _categoryId = _defaultCategoryFor(next);
      if (_kind == TxKind.transfer && _toWalletId == _walletId) {
        final other = widget.store.wallets.where((w) => w.id != _walletId).toList();
        if (other.isNotEmpty) _toWalletId = other.first.id;
      }
    });
  }

  void _tapDigit(String key) {
    HapticFeedback.selectionClick();
    setState(() {
      _source = TxSource.manual;
      if (key == '⌫') {
        _amount = _amount ~/ 10;
        return;
      }
      if (key == '000') {
        if (_amount == 0) return;
        final next = _amount * 1000;
        if (next <= 999000000000) _amount = next;
        return;
      }
      final digit = int.parse(key);
      final next = _amount * 10 + digit;
      if (next <= 999000000000) _amount = next;
    });
  }

  void _addQuickAmount(int delta) {
    HapticFeedback.lightImpact();
    setState(() {
      _source = TxSource.manual;
      final next = _amount + delta;
      if (next <= 999000000000) _amount = next;
    });
  }

  void _cycleWallet({required bool isDestination}) {
    final wallets = widget.store.wallets;
    if (wallets.isEmpty) return;
    HapticFeedback.selectionClick();
    setState(() {
      final currentId = isDestination ? _toWalletId : _walletId;
      final idx = wallets.indexWhere((w) => w.id == currentId);
      var nextIdx = (idx + 1) % wallets.length;
      if (isDestination && wallets.length > 1 && wallets[nextIdx].id == _walletId) {
        nextIdx = (nextIdx + 1) % wallets.length;
      }
      if (isDestination) {
        _toWalletId = wallets[nextIdx].id;
      } else {
        _walletId = wallets[nextIdx].id;
        if (_toWalletId == _walletId && wallets.length > 1) {
          _toWalletId = wallets.firstWhere((w) => w.id != _walletId).id;
        }
      }
    });
  }

  Future<void> _toggleMic() async {
    if (_listening) {
      try {
        await _speech.stop();
      } catch (_) {}
      if (mounted) setState(() => _listening = false);
      return;
    }

    try {
      final available = await _speech.initialize(
        onStatus: (status) {
          if (!mounted) return;
          if (status == 'done' || status == 'notListening') {
            setState(() => _listening = false);
          }
        },
        onError: (_) {
          if (!mounted) return;
          setState(() {
            _listening = false;
            _speechNotice = 'Mic không khả dụng — hãy nhập hoặc chọn mẫu bên dưới.';
          });
        },
      );
      if (!mounted) return;
      if (!available) {
        setState(() {
          _speechNotice = 'Thiết bị chưa cấp quyền mic — dùng mẫu nhanh hoặc gõ câu tiếng Việt.';
        });
        return;
      }
      setState(() {
        _listening = true;
        _speechNotice = 'Đang nghe tiếng Việt… ví dụ: "ăn trưa 55k momo"';
      });
      await _speech.listen(
        listenOptions: SpeechListenOptions(localeId: 'vi_VN'),
        onResult: (result) {
          if (!mounted) return;
          setState(() {
            _voiceCtrl.text = result.recognizedWords;
          });
        },
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _listening = false;
        _speechNotice = 'Nhập hoặc chạm mẫu câu tiếng Việt để điền siêu tốc.';
      });
    }
  }

  void _applyParsedVoice(String raw, {bool autoSave = false}) {
    final parsed = parseVietnameseQuickInput(
      raw,
      wallets: widget.store.wallets,
    );
    setState(() {
      _kind = parsed.kind;
      _categoryId = parsed.categoryId;
      _walletId = parsed.walletId;
      _amount = parsed.amount;
      _noteCtrl.text = parsed.note;
      _source = TxSource.voice;
      if (!autoSave) _mode = CaptureInputMode.manual;
    });
    if (autoSave && parsed.amount > 0) {
      _submit();
    }
  }

  Future<void> _applyBillTemplate(BillTemplate bill) async {
    HapticFeedback.mediumImpact();
    setState(() => _scanningBill = true);
    await Future<void>.delayed(const Duration(milliseconds: 350));
    if (!mounted) return;
    setState(() {
      _scanningBill = false;
      _kind = TxKind.expense;
      _categoryId = bill.categoryId;
      _walletId = bill.walletId;
      _amount = bill.amount;
      _noteCtrl.text = bill.merchant;
      _source = TxSource.bill;
      _mode = CaptureInputMode.manual;
    });
    _syncScanAnimation();
  }

  Future<void> _submit() async {
    if (_amount <= 0) return;
    HapticFeedback.mediumImpact();
    final cat = categoryById(_categoryId);
    final rawNote = _noteCtrl.text.trim();
    final tx = FinTx(
      id: 'tx-${DateTime.now().microsecondsSinceEpoch}',
      kind: _kind,
      amount: _amount,
      categoryId: _kind == TxKind.transfer ? 'transfer' : _categoryId,
      walletId: _walletId,
      toWalletId: _kind == TxKind.transfer ? _toWalletId : null,
      note: rawNote.isNotEmpty
          ? rawNote
          : (_kind == TxKind.transfer ? 'Chuyển tiền nội bộ' : cat.name),
      timestamp: DateTime.now(),
      source: _source,
    );
    await widget.store.addTransaction(tx);
    if (mounted) Navigator.of(context).pop(tx);
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final categories = kDefaultCategories.where((c) => c.kind == _kind).toList();
    final selectedWallet = widget.store.walletById(_walletId);
    final toWallet = widget.store.walletById(_toWalletId);

    return Padding(
      padding: EdgeInsets.only(bottom: media.viewInsets.bottom),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: media.size.height * 0.92),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: FintechColors.border,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Top Mode + Kind switcher
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: bentoDecoration(
                        fill: FintechColors.canvas,
                        borderColor: FintechColors.borderSubtle,
                        radius: 16,
                      ),
                      child: Row(
                        children: [
                          _KindTab(
                            label: 'Chi tiêu',
                            active: _kind == TxKind.expense,
                            color: FintechColors.coral,
                            onTap: () => _setKind(TxKind.expense),
                          ),
                          _KindTab(
                            label: 'Thu nhập',
                            active: _kind == TxKind.income,
                            color: FintechColors.emerald,
                            onTap: () => _setKind(TxKind.income),
                          ),
                          _KindTab(
                            label: 'Chuyển',
                            active: _kind == TxKind.transfer,
                            color: FintechColors.sky,
                            onTap: () => _setKind(TxKind.transfer),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  _ModeIconBtn(
                    icon: Icons.mic_rounded,
                    tooltip: 'Nói để ghi',
                    active: _mode == CaptureInputMode.voice,
                    accent: FintechColors.cyan,
                    onTap: () => _toggleMode(CaptureInputMode.voice),
                  ),
                  const SizedBox(width: 6),
                  _ModeIconBtn(
                    icon: Icons.qr_code_scanner_rounded,
                    tooltip: 'Quét hóa đơn',
                    active: _mode == CaptureInputMode.bill,
                    accent: FintechColors.indigoBright,
                    onTap: () => _toggleMode(CaptureInputMode.bill),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              if (_mode == CaptureInputMode.voice)
                _buildVoicePanel()
              else if (_mode == CaptureInputMode.bill)
                _buildBillPanel()
              else
                _buildManualBody(categories, selectedWallet, toWallet),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVoicePanel() {
    final parsed = parseVietnameseQuickInput(
      _voiceCtrl.text,
      wallets: widget.store.wallets,
    );
    final parsedCat = categoryById(parsed.categoryId);
    final parsedWallet = widget.store.walletById(parsed.walletId);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: bentoDecoration(
            fill: FintechColors.surfaceElevated,
            borderColor: FintechColors.cyan.withValues(alpha: 0.4),
            radius: 20,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: FintechColors.cyan.withValues(alpha: _listening ? 0.28 : 0.14),
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      onPressed: _toggleMic,
                      icon: Icon(
                        _listening ? Icons.graphic_eq_rounded : Icons.mic_rounded,
                        color: FintechColors.cyan,
                        size: 20,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _listening ? 'Đang nghe giọng nói…' : 'Nói hoặc gõ tự nhiên',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: FintechColors.textPrimary,
                          ),
                        ),
                        Text(
                          _speechNotice ?? 'VD: "Phở bò 55k" hoặc "Lương 25tr vcb"',
                          style: const TextStyle(
                            fontSize: 12,
                            color: FintechColors.textSecondary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _voiceCtrl,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  hintText: 'Nhập hoặc dùng mic: "Cà phê 45k momo"...',
                  prefixIcon: Icon(Icons.auto_awesome_rounded, color: FintechColors.cyan, size: 18),
                ),
              ),
              if (_voiceCtrl.text.trim().isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: bentoDecoration(
                    fill: FintechColors.canvas,
                    borderColor: parsedCat.color.withValues(alpha: 0.45),
                    radius: 14,
                  ),
                  child: Row(
                    children: [
                      Icon(parsedCat.icon, color: parsedCat.color, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${parsed.kind == TxKind.income ? "Thu" : "Chi"} · ${parsedCat.name} · ${parsedWallet.name} · "${parsed.note}"',
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: FintechColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        formatVnd(parsed.amount),
                        style: tabularStyle(
                          TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            color: parsed.kind == TxKind.income
                                ? FintechColors.emerald
                                : FintechColors.coral,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'Mẫu câu 1 chạm',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: FintechColors.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _voicePresets
              .map(
                (phrase) => ActionChip(
                  backgroundColor: FintechColors.surfaceElevated,
                  side: const BorderSide(color: FintechColors.borderSubtle),
                  label: Text(
                    phrase,
                    style: const TextStyle(fontSize: 12, color: FintechColors.textPrimary),
                  ),
                  onPressed: () => setState(() => _voiceCtrl.text = phrase),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _voiceCtrl.text.trim().isEmpty
                    ? null
                    : () => _applyParsedVoice(_voiceCtrl.text, autoSave: false),
                style: OutlinedButton.styleFrom(
                  foregroundColor: FintechColors.textPrimary,
                  side: const BorderSide(color: FintechColors.border),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text('Điền để chỉnh'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              flex: 2,
              child: _SaveGradientBtn(
                enabled: parsed.amount > 0,
                label: 'Lưu ngay ${parsed.amount > 0 ? formatVnd(parsed.amount, compact: true) : ""}',
                onTap: () => _applyParsedVoice(_voiceCtrl.text, autoSave: true),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildBillPanel() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: bentoDecoration(
            fill: FintechColors.canvas,
            borderColor: FintechColors.indigoBright.withValues(alpha: 0.45),
            radius: 20,
          ),
          child: Column(
            children: [
              SizedBox(
                height: 76,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: FintechColors.indigoBright.withValues(alpha: 0.35),
                        ),
                        gradient: LinearGradient(
                          colors: [
                            FintechColors.indigo.withValues(alpha: 0.14),
                            FintechColors.cyan.withValues(alpha: 0.08),
                          ],
                        ),
                      ),
                    ),
                    AnimatedBuilder(
                      animation: _scanCtrl,
                      builder: (context, _) {
                        final alignY = (_scanCtrl.value * 2) - 1;
                        return Align(
                          alignment: Alignment(0, alignY * 0.72),
                          child: Container(
                            height: 2.5,
                            margin: const EdgeInsets.symmetric(horizontal: 14),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [
                                  Colors.transparent,
                                  FintechColors.cyan,
                                  Colors.transparent,
                                ],
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: FintechColors.cyan.withValues(alpha: 0.7),
                                  blurRadius: 8,
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _scanningBill
                                ? Icons.hourglass_top_rounded
                                : Icons.document_scanner_rounded,
                            color: FintechColors.cyan,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              _scanningBill
                                  ? 'Đang bóc tách hóa đơn…'
                                  : 'Chọn hóa đơn để bóc tách 1 chạm',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                                color: FintechColors.textPrimary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              ...kDemoBillTemplates.map(
                (bill) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: _scanningBill ? null : () => _applyBillTemplate(bill),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: bentoDecoration(
                        fill: FintechColors.surfaceElevated,
                        borderColor: FintechColors.borderSubtle,
                        radius: 16,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: bill.badgeColor.withValues(alpha: 0.16),
                              borderRadius: BorderRadius.circular(11),
                            ),
                            child: Icon(
                              categoryById(bill.categoryId).icon,
                              color: bill.badgeColor,
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  bill.merchant,
                                  style: const TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w700,
                                    color: FintechColors.textPrimary,
                                  ),
                                ),
                                Text(
                                  bill.itemsSummary,
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    color: FintechColors.textSecondary,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            formatVnd(bill.amount),
                            style: tabularStyle(
                              const TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: FintechColors.coral,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildManualBody(
    List<CategoryMeta> categories,
    WalletCardModel selectedWallet,
    WalletCardModel toWallet,
  ) {
    final smartChips = _buildSmartAmountChips();

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Live Amount Display
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: bentoDecoration(
            fill: FintechColors.canvas,
            borderColor: _kindAccent.withValues(alpha: 0.35),
            radius: 20,
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    switch (_kind) {
                      TxKind.expense => 'SỐ TIỀN CHI',
                      TxKind.income => 'SỐ TIỀN THU',
                      TxKind.transfer => 'CHUYỂN KHOẢN NỘI BỘ',
                    },
                    style: TextStyle(
                      fontSize: 10.5,
                      letterSpacing: 0.8,
                      fontWeight: FontWeight.w700,
                      color: _kindAccent,
                    ),
                  ),
                  if (_amount > 0)
                    GestureDetector(
                      onTap: () => setState(() => _amount = 0),
                      child: const Text(
                        'Đặt lại',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: FintechColors.textMuted,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 2),
              SizedBox(
                height: 44,
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    formatVnd(_amount),
                    style: tabularStyle(
                      TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.w800,
                        color: _amount == 0
                            ? FintechColors.textMuted
                            : FintechColors.textPrimary,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 6),
              // Smart denomination / quick-add strip
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: smartChips
                      .map(
                        (chip) => Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(99),
                            onTap: chip.onTap,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: FintechColors.surfaceElevated,
                                borderRadius: BorderRadius.circular(99),
                                border: Border.all(
                                  color: FintechColors.border,
                                ),
                              ),
                              child: Text(
                                chip.label,
                                style: tabularStyle(
                                  const TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                    color: FintechColors.textPrimary,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),

        // Wallet selector + Note row
        Row(
          children: [
            InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => _cycleWallet(isDestination: false),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                decoration: bentoDecoration(
                  fill: FintechColors.surfaceElevated,
                  borderColor: FintechColors.border,
                  radius: 14,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      selectedWallet.icon,
                      size: 15,
                      color: Color(selectedWallet.gradientColors.first),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      selectedWallet.bankCode,
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: FintechColors.textPrimary,
                      ),
                    ),
                    const SizedBox(width: 2),
                    const Icon(
                      Icons.unfold_more_rounded,
                      size: 14,
                      color: FintechColors.textSecondary,
                    ),
                  ],
                ),
              ),
            ),
            if (_kind == TxKind.transfer) ...[
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 6),
                child: Icon(Icons.arrow_forward_rounded, size: 16, color: FintechColors.sky),
              ),
              InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () => _cycleWallet(isDestination: true),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                  decoration: bentoDecoration(
                    fill: FintechColors.surfaceElevated,
                    borderColor: FintechColors.sky.withValues(alpha: 0.45),
                    radius: 14,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        toWallet.icon,
                        size: 15,
                        color: Color(toWallet.gradientColors.first),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        toWallet.bankCode,
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: FintechColors.textPrimary,
                        ),
                      ),
                      const SizedBox(width: 2),
                      const Icon(
                        Icons.unfold_more_rounded,
                        size: 14,
                        color: FintechColors.textSecondary,
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _noteCtrl,
                style: const TextStyle(fontSize: 13, color: FintechColors.textPrimary),
                decoration: InputDecoration(
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  hintText: _kind == TxKind.transfer ? 'Ghi chú chuyển ví…' : 'Ghi chú nhanh…',
                ),
              ),
            ),
          ],
        ),

        // 1-Tap Category Grid (only for expense / income)
        if (_kind != TxKind.transfer) ...[
          const SizedBox(height: 10),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: categories.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
              childAspectRatio: 1.24,
            ),
            itemBuilder: (context, index) {
              final cat = categories[index];
              final selected = cat.id == _categoryId;
              return InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _categoryId = cat.id);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 140),
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 5),
                  decoration: BoxDecoration(
                    color: selected
                        ? cat.color.withValues(alpha: 0.2)
                        : FintechColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: selected ? cat.color : FintechColors.borderSubtle,
                      width: selected ? 1.5 : 1,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(cat.icon, size: 18, color: cat.color),
                      const SizedBox(height: 3),
                      Text(
                        cat.name,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                          color: FintechColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],

        const SizedBox(height: 10),

        // Fast 4x3 Custom Numpad (includes 000 key)
        _NumpadGrid(onKey: _tapDigit),
        const SizedBox(height: 10),

        _SaveGradientBtn(
          enabled: _amount > 0,
          label: 'Lưu giao dịch',
          onTap: _submit,
        ),
      ],
    );
  }

  List<_QuickAmountChipData> _buildSmartAmountChips() {
    if (_amount > 0 && _amount < 1000) {
      final kVal = _amount * 1000;
      final tenKVal = _amount * 10000;
      return [
        _QuickAmountChipData(
          label: formatVnd(kVal),
          onTap: () => setState(() => _amount = kVal),
        ),
        _QuickAmountChipData(
          label: formatVnd(tenKVal),
          onTap: () => setState(() => _amount = tenKVal),
        ),
        _QuickAmountChipData(
          label: '+50k',
          onTap: () => _addQuickAmount(50000),
        ),
      ];
    }
    return [
      _QuickAmountChipData(label: '+20k', onTap: () => _addQuickAmount(20000)),
      _QuickAmountChipData(label: '+50k', onTap: () => _addQuickAmount(50000)),
      _QuickAmountChipData(label: '+100k', onTap: () => _addQuickAmount(100000)),
      _QuickAmountChipData(label: '+500k', onTap: () => _addQuickAmount(500000)),
    ];
  }
}

class _QuickAmountChipData {
  const _QuickAmountChipData({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;
}

class _KindTab extends StatelessWidget {
  const _KindTab({
    required this.label,
    required this.active,
    required this.color,
    required this.onTap,
  });

  final String label;
  final bool active;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: active ? color.withValues(alpha: 0.2) : Colors.transparent,
            borderRadius: BorderRadius.circular(13),
            border: Border.all(
              color: active ? color.withValues(alpha: 0.7) : Colors.transparent,
            ),
          ),
          alignment: Alignment.center,
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                  color: active ? FintechColors.textPrimary : FintechColors.textSecondary,
                ),
                maxLines: 1,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ModeIconBtn extends StatelessWidget {
  const _ModeIconBtn({
    required this.icon,
    required this.tooltip,
    required this.active,
    required this.accent,
    required this.onTap,
  });

  final IconData icon;
  final String tooltip;
  final bool active;
  final Color accent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: active ? accent.withValues(alpha: 0.22) : FintechColors.surfaceElevated,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: active ? accent : FintechColors.borderSubtle,
            ),
          ),
          child: Icon(
            icon,
            size: 19,
            color: active ? accent : FintechColors.textSecondary,
          ),
        ),
      ),
    );
  }
}

class _NumpadGrid extends StatelessWidget {
  const _NumpadGrid({required this.onKey});

  final ValueChanged<String> onKey;

  static const _keys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '000', '0', '⌫',
  ];

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _keys.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 6,
        crossAxisSpacing: 8,
        childAspectRatio: 2.35,
      ),
      itemBuilder: (context, index) {
        final keyLabel = _keys[index];
        final isBackspace = keyLabel == '⌫';
        final isTripleZero = keyLabel == '000';
        return Material(
          color: isTripleZero
              ? FintechColors.indigo.withValues(alpha: 0.16)
              : FintechColors.surfaceElevated,
          borderRadius: BorderRadius.circular(14),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: () => onKey(keyLabel),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isTripleZero
                      ? FintechColors.indigoBright.withValues(alpha: 0.45)
                      : FintechColors.borderSubtle,
                ),
              ),
              alignment: Alignment.center,
              child: isBackspace
                  ? const Icon(
                      Icons.backspace_outlined,
                      size: 19,
                      color: FintechColors.textSecondary,
                    )
                  : Text(
                      keyLabel,
                      style: tabularStyle(
                        TextStyle(
                          fontSize: isTripleZero ? 16 : 19,
                          fontWeight: FontWeight.w700,
                          color: isTripleZero
                              ? FintechColors.indigoBright
                              : FintechColors.textPrimary,
                        ),
                      ),
                    ),
            ),
          ),
        );
      },
    );
  }
}

class _SaveGradientBtn extends StatelessWidget {
  const _SaveGradientBtn({
    required this.enabled,
    required this.label,
    required this.onTap,
  });

  final bool enabled;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      duration: const Duration(milliseconds: 150),
      opacity: enabled ? 1.0 : 0.42,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          gradient: const LinearGradient(
            colors: [FintechColors.indigo, FintechColors.cyan],
          ),
          boxShadow: enabled
              ? [
                  BoxShadow(
                    color: FintechColors.indigo.withValues(alpha: 0.42),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ]
              : null,
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: enabled ? onTap : null,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 14),
              child: Center(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
