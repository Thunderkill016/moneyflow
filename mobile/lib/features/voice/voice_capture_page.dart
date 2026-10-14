import 'dart:async';

import 'package:flutter/material.dart';

import '../../data/neon/real_store.dart' show newIdempotencyKey;
import '../../data/voice/voice_engine.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../domain/voice_money_parser.dart';
import '../shared/empty_state.dart';
import '../capture/capture_page.dart' show CaptureIntent, CaptureResult;
import '../capture/capture_submit.dart' show CaptureQueued, submitErrorMessage;

enum _VoicePhase { idle, listening, confirming }

/// "Nói để ghi" — mic → on-device Vietnamese speech → a PROPOSED parse →
/// mandatory confirm card → the same trusted submit path as quick add.
/// Nothing writes to the ledger without the explicit "Lưu vào sổ" tap.
class VoiceCapturePage extends StatefulWidget {
  const VoiceCapturePage({
    required this.accounts,
    required this.categories,
    required this.onSubmit,
    this.engine,
    this.today,
    super.key,
  });

  final List<AccountSummary> accounts;
  final List<Category> categories;

  /// Same seam the capture page uses — the host decides between a real
  /// submit (offline-queue aware) and the demo's read-only answer.
  final Future<void> Function(CaptureIntent intent) onSubmit;

  /// Injectable for tests; production builds default to SpeechRecognizer.
  final VoiceEngine? engine;

  /// YYYY-MM-DD override for tests; voice captures always land on the
  /// Vietnam "today" like every other capture path.
  final String? today;

  @override
  State<VoiceCapturePage> createState() => _VoiceCapturePageState();
}

class _VoiceCapturePageState extends State<VoiceCapturePage> {
  late final VoiceEngine _engine = widget.engine ?? SpeechToTextEngine();

  _VoicePhase _phase = _VoicePhase.idle;
  VoiceEngineStatus? _status;
  String _partial = '';
  String? _error;
  bool _saving = false;

  VoiceAmountParse? _parsed;
  TransactionKind? _parsedKind;

  /// Idempotency key for the pending confirm — survives a failed save so
  /// a retry of the SAME confirm reuses it; a fresh key mints only when a
  /// new voice capture begins (save, cancel, or re-record).
  String? _idempotencyKey;

  String get _today {
    if (widget.today != null) return widget.today!;
    final vn = DateTime.now().toUtc().add(const Duration(hours: 7));
    String two(int v) => v.toString().padLeft(2, '0');
    return '${vn.year}-${two(vn.month)}-${two(vn.day)}';
  }

  @override
  void initState() {
    super.initState();
    _engine.initialize().then((status) {
      if (mounted) setState(() => _status = status);
    });
  }

  Future<void> _start() async {
    setState(() {
      _phase = _VoicePhase.listening;
      _partial = '';
      _error = null;
      _parsed = null;
      _idempotencyKey = newIdempotencyKey();
    });
    await _engine.listen(
      onPartial: (text) {
        if (mounted) setState(() => _partial = text);
      },
      onFinal: _finish,
      onError: (message) {
        if (!mounted) return;
        setState(() {
          _phase = _VoicePhase.idle;
          _error = 'Không nghe được — thử lại nhé.';
        });
      },
    );
  }

  /// Recognition finished (stop tap or end-of-speech): parse the final
  /// transcript into a proposal. A transcript with no parseable amount
  /// still reaches the confirm card — the user types the amount.
  void _finish(String transcript) {
    if (!mounted) return;
    final parsed = parseVietnameseMoney(transcript);
    setState(() {
      _phase = _VoicePhase.confirming;
      _parsed = parsed;
      _parsedKind = detectVoiceKind(parsed.rest);
      _partial = '';
    });
  }

  Future<void> _stop() => _engine.stop();

  void _reset() {
    if (_phase == _VoicePhase.listening) unawaited(_engine.cancel());
    setState(() {
      _phase = _VoicePhase.idle;
      _parsed = null;
      _parsedKind = null;
      _partial = '';
      _error = null;
      _idempotencyKey = null;
    });
  }

  Future<void> _confirm({
    required TransactionKind kind,
    required String accountId,
    required String? categoryId,
    required int amount,
    required String note,
  }) async {
    final key = _idempotencyKey ??= newIdempotencyKey();
    setState(() => _saving = true);
    try {
      await widget.onSubmit(
        CaptureIntent(
          kind: kind,
          accountId: accountId,
          categoryId: categoryId,
          amount: amount,
          occurredOn: _today,
          note: note,
          idempotencyKey: key,
        ),
      );
      if (mounted) Navigator.of(context).pop(CaptureResult.saved);
    } on CaptureQueued {
      if (mounted) Navigator.of(context).pop(CaptureResult.queued);
    } catch (e) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = submitErrorMessage(e);
          _phase = _VoicePhase.confirming;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasSetup = widget.accounts.isNotEmpty && widget.categories.isNotEmpty;
    return Scaffold(
      appBar: AppBar(title: const Text('Nói để ghi')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: switch ((_status, hasSetup, _phase)) {
            // Setup gates — same honesty rules as the web page.
            (_, false, _) => const EmptyStateCard(
              icon: Icons.account_balance_wallet_outlined,
              title: 'Chưa sẵn sàng ghi bằng giọng nói',
              message: 'Bạn cần ít nhất một ví và một danh mục trước.',
            ),
            (
              VoiceEngineStatus.unavailable ||
                  VoiceEngineStatus.permissionDenied,
              _,
              _,
            ) =>
              const EmptyStateCard(
                icon: Icons.mic_off,
                title: 'Thiết bị không hỗ trợ micro',
                message:
                    'Máy này không cho nhận dạng giọng nói tiếng Việt — bạn '
                    'vẫn ghi nhanh bằng tay được.',
              ),
            (_, _, _VoicePhase.listening) => _listeningPane(),
            (_, _, _VoicePhase.confirming) when _parsed != null =>
              _confirmCard(),
            _ => _idlePane(),
          },
        ),
      ),
    );
  }

  Widget _idlePane() => Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      FilledButton(
        onPressed: _saving ? null : _start,
        style: FilledButton.styleFrom(
          shape: const CircleBorder(),
          padding: const EdgeInsets.all(28),
        ),
        child: const Icon(Icons.mic, size: 40),
      ),
      const SizedBox(height: 16),
      Text(
        'Bấm mic rồi nói. Ví dụ: "Cà phê ba lăm", "Đổ xăng một trăm".',
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.bodyMedium,
      ),
      if (_error != null) ...[
        const SizedBox(height: 12),
        Text(
          _error!,
          style: TextStyle(color: Theme.of(context).colorScheme.error),
          textAlign: TextAlign.center,
        ),
      ],
      const SizedBox(height: 16),
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.lock_outline,
            size: 14,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              'Đoạn ghi âm đi qua bộ nhận dạng của máy rồi thôi — '
              'không lưu trữ, không gửi lên server MoneyFlow.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    ],
  );

  Widget _listeningPane() => Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      const Icon(Icons.graphic_eq, size: 40),
      const SizedBox(height: 12),
      Text('Đang nghe…', style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 8),
      Text(
        _partial.isEmpty ? 'Nói đi, mình đang nghe.' : '"$_partial"',
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.bodyMedium,
      ),
      const SizedBox(height: 24),
      FilledButton.icon(
        onPressed: _stop,
        icon: const Icon(Icons.check),
        label: const Text('Xong, ghi đi'),
      ),
      TextButton(onPressed: _reset, child: const Text('Hủy')),
    ],
  );

  Widget _confirmCard() {
    final parsed = _parsed!;
    return _ConfirmCard(
      key: ValueKey('${parsed.transcript}|${parsed.amount}|$_parsedKind'),
      parsed: parsed,
      suggestedKind: _parsedKind ?? TransactionKind.expense,
      accounts: widget.accounts,
      categories: widget.categories,
      saving: _saving,
      error: _error,
      onConfirm: _confirm,
      onRetry: _start,
      onCancel: _reset,
    );
  }
}

/// Mandatory confirmation step — the parser proposes, the user corrects
/// and saves. Mirrors src/components/voice/voice-confirm-card.tsx.
class _ConfirmCard extends StatefulWidget {
  const _ConfirmCard({
    required this.parsed,
    required this.suggestedKind,
    required this.accounts,
    required this.categories,
    required this.saving,
    required this.error,
    required this.onConfirm,
    required this.onRetry,
    required this.onCancel,
    super.key,
  });

  final VoiceAmountParse parsed;
  final TransactionKind suggestedKind;
  final List<AccountSummary> accounts;
  final List<Category> categories;
  final bool saving;
  final String? error;
  final Future<void> Function({
    required TransactionKind kind,
    required String accountId,
    required String? categoryId,
    required int amount,
    required String note,
  })
  onConfirm;
  final VoidCallback onRetry;
  final VoidCallback onCancel;

  @override
  State<_ConfirmCard> createState() => _ConfirmCardState();
}

class _ConfirmCardState extends State<_ConfirmCard> {
  late TransactionKind _kind = widget.suggestedKind;
  late final TextEditingController _amount = TextEditingController(
    text: widget.parsed.amount?.toString() ?? '',
  );
  late final TextEditingController _note = TextEditingController(
    text: widget.parsed.rest.isNotEmpty
        ? widget.parsed.rest
        : widget.parsed.transcript,
  );
  late String? _categoryId = _suggestedCategoryId();
  late String _accountId = widget.accounts.first.id;
  String? _amountError;

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  /// Case-insensitive name match against the workspace's real categories —
  /// a keyword hit is a suggestion, never a fabricated category.
  String? _suggestedCategoryId() {
    final name = suggestVoiceCategory(widget.parsed.rest);
    if (name == null) return null;
    for (final c in widget.categories) {
      if (c.name.toLowerCase() == name.toLowerCase() &&
          c.kind == widget.suggestedKind) {
        return c.id;
      }
    }
    return null;
  }

  List<Category> get _kindCategories =>
      widget.categories.where((c) => c.kind == _kind).toList();

  void _submit() {
    final amount = parseMoneyInput(_amount.text);
    if (amount == null || amount <= 0) {
      setState(() => _amountError = 'Nhập số tiền hợp lệ');
      return;
    }
    unawaited(
      widget.onConfirm(
        kind: _kind,
        accountId: _accountId,
        categoryId: _categoryId,
        amount: amount,
        note: _note.text.trim(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.parsed;
    return ListView(
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Mình nghe được',
                  style: Theme.of(context).textTheme.labelMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  '"${p.transcript}"',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                if (p.amount != null) ...[
                  const SizedBox(height: 6),
                  Chip(
                    label: Text(
                      '${formatMoney(p.amount!)}'
                      '${p.shorthand ? ' (hiểu là nghìn đồng)' : ''}',
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        SegmentedButton<TransactionKind>(
          segments: const [
            ButtonSegment(value: TransactionKind.expense, label: Text('Chi')),
            ButtonSegment(value: TransactionKind.income, label: Text('Thu')),
          ],
          selected: {_kind},
          onSelectionChanged: (s) => setState(() {
            _kind = s.first;
            // A picked category of the other kind can't ride along —
            // the field resets like the web card's kind change.
            if (!_kindCategories.any((c) => c.id == _categoryId)) {
              _categoryId = null;
            }
          }),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _amount,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: 'Số tiền',
            suffixText: '₫',
            errorText: _amountError,
          ),
          onChanged: (_) {
            if (_amountError != null) setState(() => _amountError = null);
          },
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _kindCategories.any((c) => c.id == _categoryId)
              ? _categoryId
              : null,
          decoration: const InputDecoration(labelText: 'Danh mục'),
          items: [
            for (final c in _kindCategories)
              DropdownMenuItem(value: c.id, child: Text(c.name)),
          ],
          onChanged: (v) => setState(() => _categoryId = v),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _accountId,
          decoration: const InputDecoration(labelText: 'Ví'),
          items: [
            for (final a in widget.accounts)
              DropdownMenuItem(value: a.id, child: Text(a.name)),
          ],
          onChanged: (v) => setState(() => _accountId = v ?? _accountId),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _note,
          decoration: const InputDecoration(labelText: 'Ghi chú'),
        ),
        if (widget.error != null) ...[
          const SizedBox(height: 8),
          Text(
            widget.error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: widget.saving ? null : _submit,
          icon: const Icon(Icons.check),
          label: const Text('Lưu vào sổ'),
        ),
        TextButton(
          onPressed: widget.saving ? null : widget.onRetry,
          child: const Text('Nói lại'),
        ),
        TextButton(
          onPressed: widget.saving ? null : widget.onCancel,
          child: const Text('Hủy'),
        ),
      ],
    );
  }
}
