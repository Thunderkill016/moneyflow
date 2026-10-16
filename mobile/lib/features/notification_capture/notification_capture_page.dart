// "Thu gom thông báo ngân hàng" — the opt-in consent + state surface for
// the Android notification-listener pilot. Everything on this page is the
// honest truth: what is read (whitelisted bank/wallet apps only), what is
// stored (the notification text as draft evidence), what never happens
// (auto-posting to the ledger, reading other apps).
//
// There is no runtime permission prompt for NotificationListenerService —
// the only honest flow is this explanation plus a deep link into the
// system Notification Access screen, with state re-checked on resume.

import 'package:flutter/material.dart';

import '../../data/notification_capture/notification_capture_channel.dart';
import '../../data/notification_capture/notification_capture_controller.dart';
import '../shared/timed_snack_bar.dart';

class NotificationCapturePage extends StatefulWidget {
  const NotificationCapturePage({
    super.key,
    required this.gateway,
    required this.controller,
  });

  final NotificationCaptureGateway gateway;
  final NotificationCaptureController controller;

  @override
  State<NotificationCapturePage> createState() =>
      _NotificationCapturePageState();
}

class _NotificationCapturePageState extends State<NotificationCapturePage>
    with WidgetsBindingObserver {
  bool _loading = true;
  bool _osGranted = false;
  bool _optedIn = false;
  bool _pendingEnable = false;
  List<String> _sources = const [];

  bool get _active => _osGranted && _optedIn;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Returning from the system settings screen lands here — the toggle must
  /// reflect the REAL switch, never the user's last tap.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refresh();
  }

  Future<void> _refresh() async {
    final osGranted = await widget.gateway.isAccessEnabled();
    final optedIn = await widget.controller.isEnabled();
    final sources = await widget.gateway.supportedSources();
    if (!mounted) return;
    setState(() {
      _loading = false;
      _osGranted = osGranted;
      _optedIn = optedIn;
      _sources = sources;
    });
    // "Bật thu gom" with the OS switch still off routes through system
    // settings; if the grant landed while we were away, honour the tap.
    if (_pendingEnable && osGranted) {
      _pendingEnable = false;
      await widget.controller.setEnabled(true);
      if (mounted) setState(() => _optedIn = true);
    }
  }

  Future<void> _onPrimary() async {
    if (_active) {
      await widget.controller.setEnabled(false);
      if (mounted) setState(() => _optedIn = false);
      return;
    }
    if (!_osGranted) {
      _pendingEnable = true;
      final opened = await widget.gateway.openAccessSettings();
      if (!opened) {
        _pendingEnable = false;
        if (mounted) {
          showTimedSnackBar(
            ScaffoldMessenger.of(context),
            const SnackBar(
              content: Text('Không mở được Cài đặt — thử lại sau'),
            ),
          );
        }
      }
      return;
    }
    await widget.controller.setEnabled(true);
    if (mounted) setState(() => _optedIn = true);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Thu gom thông báo ngân hàng')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _statusCard(theme),
                const SizedBox(height: 16),
                _bullet(
                  'Chỉ đọc thông báo của các app ngân hàng/ví trong danh '
                  'sách hỗ trợ (${_sources.length} nguồn). Thông báo của mọi '
                  'app khác bị bỏ qua ngay — không đọc nội dung, không lưu lại.',
                ),
                _bullet(
                  'Mỗi thông báo đọc được trở thành một bản nháp trong '
                  '"Cần xem". MoneyFlow không tự ghi vào sổ — bạn duyệt '
                  'hoặc bỏ từng mục.',
                ),
                _bullet(
                  'Nội dung thông báo được lưu kèm bản nháp làm bằng chứng. '
                  'Ngoài ra MoneyFlow không lưu và không gửi gì thêm.',
                ),
                _bullet(
                  'Thông báo không đọc được số tiền sẽ bị bỏ qua — '
                  'MoneyFlow không đoán số.',
                ),
                _bullet(
                  'Bạn có thể tắt bất cứ lúc nào. Để thu hồi hoàn toàn, '
                  'tắt MoneyFlow trong Cài đặt thông báo của hệ thống.',
                ),
                const SizedBox(height: 8),
                ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  title: Text(
                    '${_sources.length} nguồn được hỗ trợ',
                    style: theme.textTheme.titleSmall,
                  ),
                  children: [
                    for (final s in _sources)
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 2),
                          child: Text('• $s'),
                        ),
                      ),
                  ],
                ),
                if (_optedIn) _statsLine(theme),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _onPrimary,
                  child: Text(
                    _active
                        ? 'Tắt thu gom'
                        : _osGranted
                        ? 'Bật thu gom'
                        : 'Bật thu gom — mở Cài đặt',
                  ),
                ),
              ],
            ),
    );
  }

  Widget _statusCard(ThemeData theme) {
    final (label, detail, icon, color) = switch ((_active, _osGranted)) {
      (true, _) => (
        'Đang bật',
        'MoneyFlow đang nhận thông báo từ các nguồn hỗ trợ.',
        Icons.mark_email_read_outlined,
        theme.colorScheme.primary,
      ),
      (false, true) => (
        'Đã cấp quyền · tắt trong app',
        'Quyền đọc thông báo đã cấp nhưng thu gom đang tắt.',
        Icons.notifications_paused_outlined,
        theme.colorScheme.outline,
      ),
      _ => (
        'Tắt',
        'MoneyFlow chưa có quyền đọc thông báo — chưa thu gom gì.',
        Icons.notifications_off_outlined,
        theme.colorScheme.outline,
      ),
    };
    return Card(
      child: ListTile(
        leading: Icon(icon, color: color),
        title: Text(label, style: theme.textTheme.titleMedium),
        subtitle: Text(detail),
      ),
    );
  }

  Widget _bullet(String text) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('•  '),
        Expanded(child: Text(text)),
      ],
    ),
  );

  Widget _statsLine(ThemeData theme) {
    final s = widget.controller.stats;
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Text(
        'Đã nhận ${s.received} thông báo · tạo ${s.submitted} nháp · '
        'bỏ qua ${s.parseFailed} không đọc được',
        style: theme.textTheme.bodySmall,
      ),
    );
  }
}
