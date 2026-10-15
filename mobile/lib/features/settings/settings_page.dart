import 'dart:async';

import 'package:flutter/material.dart';

import '../../data/export_files.dart';
import '../../data/settings_prefs.dart';
import '../../domain/export_csv.dart' show jsonMimeType;
import '../../domain/weekly_digest.dart'
    show weeklyDigestHour, weeklyDigestMinute;

/// Mirrors `version:` in pubspec.yaml — package_info_plus is deliberately
/// not a dependency for a label only this surface shows. Bump with pubspec.
const kAppVersionLabel = '1.0.0+1';

/// Settings — one organized surface for the overflow menu's "Cài đặt".
///
/// Visibility is seam-driven (the codebase's honest-absence pattern): the
/// shell passes the seams a mode can actually back, and the page hides
/// whatever arrives unset — biometric lock and the weekly digest only
/// exist for the signed-in app (the lock guards the real shell and the
/// digest quotes the real ledger), the JSON archive only when the build
/// flag and a session both allow it. Device-level rows — theme, the
/// local-data wipe, policy link, welcome replay — work in both modes.
class SettingsPage extends StatefulWidget {
  const SettingsPage({
    super.key,
    this.biometricEnabled = false,
    this.onSetBiometricEnabled,
    this.digestEnabled = false,
    this.onSetDigestEnabled,
    this.onDigestScheduleChanged,
    this.loadArchive,
    this.shareFile,
    this.tempDir,
    this.onDeleteLocalData,
    this.deleteLocalDataLabel = 'Xóa dữ liệu trên máy',
    this.onChangePassword,
    this.onDeleteAccount,
    this.appVersion = kAppVersionLabel,
    this.onOpenPrivacyPolicy,
    this.onReplayWelcome,
  });

  /// Current lock state + the set seam. The shell owns the auth-proof
  /// before arming and the gate re-lock after; the seam answers whether
  /// the new value was applied so the switch never lies about the state.
  final bool biometricEnabled;
  final Future<bool> Function(bool enabled)? onSetBiometricEnabled;

  /// Weekly-digest opt-in + the set seam — the shell persists, updates
  /// its own state and re-arms through the real scheduler path.
  final bool digestEnabled;
  final Future<void> Function(bool enabled)? onSetDigestEnabled;

  /// Called after the page persists a new digest fire time — the shell
  /// re-arms the pending one-shot so the next digest lands on the new
  /// time instead of the stale one.
  final Future<void> Function()? onDigestScheduleChanged;

  /// `export_user_archive` — auth-only and behind the archive build flag.
  /// Absent hides the row entirely; a dead affordance would lie.
  final Future<Object?> Function()? loadArchive;
  final ExportSharer? shareFile;
  final ExportTempDir? tempDir;

  /// The host's existing local-data wipe (signed-in: full wipe + sign-out;
  /// demo: the demo wipe). [deleteLocalDataLabel] names it honestly —
  /// the demo wipe is not an account deletion.
  final Future<void> Function()? onDeleteLocalData;
  final String deleteLocalDataLabel;

  /// Password change — auth-only AND credential-accounts-only (a
  /// Google-only account has no current password; the host gates the
  /// seam on `listProviders()` so the row never lies). The host pushes
  /// the form page and owns the success snackbar.
  final VoidCallback? onChangePassword;

  /// Server-side account deletion — the host owns the re-auth dialog +
  /// the `delete_my_account` call + the post-wipe landing. Auth-only;
  /// absent hides the row (same honest-absence rule as the archive).
  final Future<void> Function()? onDeleteAccount;

  final String appVersion;

  /// The hosted privacy policy via the shell's UrlOpener — its failure
  /// notice already lives there.
  final VoidCallback? onOpenPrivacyPolicy;

  /// Clears the first-run flag and replays the welcome — the host owns
  /// the navigation (demo routes the real gate back to it; signed-in
  /// pushes it over the shell).
  final VoidCallback? onReplayWelcome;

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  late bool _bioEnabled = widget.biometricEnabled;
  late bool _digestEnabled = widget.digestEnabled;
  bool _bioBusy = false;
  bool _digestBusy = false;

  /// Last loaded/picked digest time — defaults to the historical 19:00
  /// until the pref resolves (the default IS the honest pre-pick value).
  var _digestTime = const TimeOfDay(
    hour: weeklyDigestHour,
    minute: weeklyDigestMinute,
  );

  static const _themeChoices = [
    (ThemeMode.system, 'Hệ thống'),
    (ThemeMode.light, 'Sáng'),
    (ThemeMode.dark, 'Tối'),
  ];

  @override
  void initState() {
    super.initState();
    // Refreshes the notifier (and with it the radios) — belt-and-braces
    // when the page is pushed before the app's startup load landed.
    unawaited(SettingsPrefs.loadThemeMode());
    if (widget.onSetDigestEnabled != null) {
      unawaited(_loadDigestTime());
    }
  }

  Future<void> _loadDigestTime() async {
    final time = await SettingsPrefs.loadDigestTime();
    if (!mounted) return;
    setState(
      () => _digestTime = TimeOfDay(hour: time.hour, minute: time.minute),
    );
  }

  Future<void> _setBiometric(bool enabled) async {
    final seam = widget.onSetBiometricEnabled;
    if (seam == null) return;
    setState(() => _bioBusy = true);
    try {
      final applied = await seam(enabled);
      if (applied && mounted) setState(() => _bioEnabled = enabled);
    } finally {
      if (mounted) setState(() => _bioBusy = false);
    }
  }

  Future<void> _setDigest(bool enabled) async {
    final seam = widget.onSetDigestEnabled;
    if (seam == null) return;
    setState(() => _digestBusy = true);
    try {
      await seam(enabled);
      if (mounted) setState(() => _digestEnabled = enabled);
    } finally {
      if (mounted) setState(() => _digestBusy = false);
    }
  }

  Future<void> _pickDigestTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _digestTime,
      // Vietnam reads 24-hour clocks — a 12h dial would need an AM/PM
      // toggle the locale doesn't want.
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked == null || !mounted) return;
    await SettingsPrefs.saveDigestTime(
      hour: picked.hour,
      minute: picked.minute,
    );
    setState(() => _digestTime = picked);
    await widget.onDigestScheduleChanged?.call();
  }

  /// The same "Sao lưu (JSON)" flow the reports sheet runs — the shared
  /// helper owns the doc shape check + file write; this surface owns its
  /// own honest failure copy.
  Future<void> _exportArchive() async {
    final load = widget.loadArchive;
    if (load == null) return;
    try {
      final file = await writeArchiveExportFile(load, tempDir: widget.tempDir);
      await (widget.shareFile ?? shareFileToSheet)(file.path, jsonMimeType);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Không xuất được file')));
      }
    }
  }

  void _replayWelcome() {
    // Back at the shell first — the host's seam then replays the welcome
    // in whichever form fits the mode (gate route vs pushed page).
    Navigator.of(context).pop();
    widget.onReplayWelcome?.call();
  }

  String _digestTimeLabel(BuildContext context) => MaterialLocalizations.of(
    context,
  ).formatTimeOfDay(_digestTime, alwaysUse24HourFormat: true);

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final showData =
        widget.loadArchive != null ||
        widget.onDeleteLocalData != null ||
        widget.onDeleteAccount != null;
    return Scaffold(
      appBar: AppBar(title: const Text('Cài đặt')),
      body: ListView(
        children: [
          const _SectionHeader('Giao diện'),
          ValueListenableBuilder<ThemeMode>(
            valueListenable: SettingsPrefs.themeMode,
            builder: (context, mode, _) => RadioGroup<ThemeMode>(
              groupValue: mode,
              onChanged: (v) {
                if (v != null) unawaited(SettingsPrefs.saveThemeMode(v));
              },
              child: Column(
                children: [
                  for (final (value, label) in _themeChoices)
                    RadioListTile<ThemeMode>(value: value, title: Text(label)),
                ],
              ),
            ),
          ),
          if (widget.onSetBiometricEnabled != null ||
              widget.onChangePassword != null) ...[
            const _SectionHeader('Bảo mật'),
            if (widget.onChangePassword != null)
              ListTile(
                leading: const Icon(Icons.password_outlined),
                title: const Text('Đổi mật khẩu'),
                subtitle: const Text('Đăng xuất các thiết bị khác'),
                onTap: widget.onChangePassword,
              ),
            if (widget.onSetBiometricEnabled != null)
              SwitchListTile(
                secondary: const Icon(Icons.fingerprint),
                title: const Text('Khóa sinh trắc'),
                subtitle: const Text('Yêu cầu xác thực khi mở app'),
                value: _bioEnabled,
                onChanged: _bioBusy ? null : _setBiometric,
              ),
          ],
          if (widget.onSetDigestEnabled != null) ...[
            const _SectionHeader('Nhắc nhở'),
            SwitchListTile(
              secondary: const Icon(Icons.notifications_none),
              title: const Text('Tóm tắt tuần'),
              subtitle: const Text('Tổng kết thu chi của tuần'),
              value: _digestEnabled,
              onChanged: _digestBusy ? null : _setDigest,
            ),
            ListTile(
              leading: const Icon(Icons.schedule),
              title: const Text('Giờ gửi tóm tắt'),
              subtitle: Text('Chủ nhật · ${_digestTimeLabel(context)}'),
              onTap: _pickDigestTime,
            ),
          ],
          if (showData) ...[
            const _SectionHeader('Dữ liệu'),
            if (widget.loadArchive != null)
              ListTile(
                leading: const Icon(Icons.archive_outlined),
                title: const Text('Sao lưu (JSON)'),
                subtitle: const Text(
                  'Toàn bộ tài khoản và giao dịch · tải về hoặc chia sẻ',
                ),
                onTap: _exportArchive,
              ),
            if (widget.onDeleteLocalData != null)
              ListTile(
                leading: Icon(Icons.delete_sweep_outlined, color: scheme.error),
                title: Text(
                  widget.deleteLocalDataLabel,
                  style: TextStyle(color: scheme.error),
                ),
                subtitle: const Text(
                  'Chỉ xóa trên thiết bị này — dữ liệu trên máy chủ giữ nguyên',
                ),
                onTap: () => unawaited(widget.onDeleteLocalData!()),
              ),
            if (widget.onDeleteAccount != null)
              ListTile(
                leading: Icon(
                  Icons.person_remove_outlined,
                  color: scheme.error,
                ),
                title: Text(
                  'Xóa tài khoản',
                  style: TextStyle(color: scheme.error),
                ),
                subtitle: const Text(
                  'Xóa vĩnh viễn tài khoản và dữ liệu trên máy chủ',
                ),
                onTap: () => unawaited(widget.onDeleteAccount!()),
              ),
          ],
          const _SectionHeader('Giới thiệu'),
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: const Text('Phiên bản'),
            trailing: Text(widget.appVersion),
          ),
          if (widget.onOpenPrivacyPolicy != null)
            ListTile(
              leading: const Icon(Icons.privacy_tip_outlined),
              title: const Text('Chính sách bảo mật'),
              onTap: widget.onOpenPrivacyPolicy,
            ),
          if (widget.onReplayWelcome != null)
            ListTile(
              leading: const Icon(Icons.waving_hand_outlined),
              title: const Text('Xem lại màn chào'),
              onTap: _replayWelcome,
            ),
        ],
      ),
    );
  }
}

/// M3 group label — primary-colored caption over each section's tiles.
class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);

  final String title;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
    child: Text(
      title,
      style: Theme.of(context).textTheme.labelLarge?.copyWith(
        color: Theme.of(context).colorScheme.primary,
      ),
    ),
  );
}
