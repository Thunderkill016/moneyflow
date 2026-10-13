import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/neon/auth_client.dart';
import '../data/neon/data_api.dart';
import '../data/neon/neon_config.dart';
import '../data/neon/real_store.dart';
import '../data/notifications.dart';
import '../data/offline_cache.dart';
import '../data/offline_queue.dart';
import '../data/quick_action.dart';
import '../data/session_store.dart';
import '../data/share/share_intent.dart';
import '../data/share/share_text_parser.dart';
import '../domain/models.dart';
import '../domain/recurring_detection.dart';
import '../domain/transaction_query.dart';
import 'biometric_lock.dart';
import 'delete_data.dart';
import '../features/accounts/accounts_page.dart';
import '../features/activity/activity_page.dart';
import '../features/activity/trash_page.dart';
import '../data/demo_store.dart';
import '../features/auth/login_page.dart';
import '../features/capture/capture_page.dart';
import '../features/capture/capture_submit.dart';
import '../features/capture/queue_banner.dart';
import '../features/categories/categories_page.dart';
import '../features/dashboard/dashboard_page.dart';
import '../features/inbox/inbox_page.dart';
import '../features/planning/planning_page.dart';
import '../features/planning/recurring_form_dialog.dart';
import '../features/reports/reports_page.dart';
import 'home_shell.dart';

/// MoneyFlow brand tokens (from src/app/manifest.ts).
const kBrandColor = Color(0xFF0EA5E9);
const kBrandBackground = Color(0xFFF8FAFC);

/// JSON backup ships behind a build flag until the backend is callable.
/// `export_user_archive` is SECURITY INVOKER and resolves auth.uid() in
/// its body; on the Neon Data API the `authenticated` role has no USAGE
/// on schema `auth`, so the call returns 42501 (verified 2026-10-13 —
/// `get_dashboard_bundle` fails identically while RLS policy evaluation
/// still resolves auth.uid(); the web's backup action hits the same wall
/// over this transport — `db/compat/supabase-auth-shim.sql` grants the
/// usage only on Supabase). Build with `--dart-define=MF_ARCHIVE_BACKUP=
/// true` once a backend grant or definer wrapper makes it honest.
const kArchiveBackupEnabled = bool.fromEnvironment('MF_ARCHIVE_BACKUP');

class MoneyFlowApp extends StatelessWidget {
  const MoneyFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MoneyFlow',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: kBrandColor,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: kBrandBackground,
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: kBrandColor,
          brightness: Brightness.dark,
        ),
      ),
      home: const AuthGate(),
    );
  }
}

/// Startup auth state: restore persisted session → dashboard, else login.
/// Demo mode remains reachable from the login screen for offline exploration.
///
/// [shareReceiver], [quickActions] and [biometric] are seams for widget
/// tests — production callers never pass them.
class AuthGate extends StatefulWidget {
  const AuthGate({
    super.key,
    this.shareReceiver = const ShareIntentReceiver(),
    this.quickActions = const QuickActionReceiver(),
    this.biometric,
  });

  final ShareIntentReceiver shareReceiver;
  final QuickActionSource quickActions;
  final BiometricService? biometric;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

enum _Gate { booting, login, signedIn, demo }

class _AuthGateState extends State<AuthGate> {
  final _config = NeonConfig.fromEnvironment();
  late final _auth = NeonAuthClient(config: _config);
  late final _store = RealStore(NeonDataApi(config: _config, auth: _auth));
  late final _bioService = widget.biometric ?? DeviceBiometricService();
  ShareIntentReceiver get _shareReceiver => widget.shareReceiver;
  QuickActionSource get _quickActions => widget.quickActions;

  _Gate _gate = _Gate.booting;
  bool _bioEnabled = false;

  /// True once the signed-in shell is past the biometric gate — the lock
  /// is off/unavailable, or the user just unlocked. Deep links check it
  /// so a capture form never opens over the lock screen.
  bool _unlocked = false;

  /// Weekly-digest opt-in — defaults OFF until the stored pref loads.
  bool _digestEnabled = false;
  OfflineCache? _offline;
  OfflineCaptureQueue? _queue;
  StreamSubscription<String>? _shareSub;
  StreamSubscription<String>? _quickSub;

  /// A "Ghi nhanh" action held until a surface can host it — the app is
  /// still booting, the user is on the login screen, or the biometric
  /// gate is locked. Drained from [_drainQuickAction].
  bool _quickCapturePending = false;

  /// Tab keys — a saved capture reloads the surfaces that show its effect
  /// (dashboard balances, activity list, planning budgets, month report).
  final _dashKey = GlobalKey<DashboardPageState>();
  final _actKey = GlobalKey<ActivityPageState>();
  final _planKey = GlobalKey<PlanningPageState>();
  final _reportKey = GlobalKey<ReportsPageState>();

  /// A share that arrived before sign-in — drained once the dashboard is
  /// reachable so the prefill isn't lost behind the login screen.
  SharedTextPrefill? _pendingPrefill;

  @override
  void initState() {
    super.initState();
    _restore();
    _initShare();
    _initQuick();
    // Reminder setup is best-effort — a denied notification permission
    // must not block app startup.
    unawaited(NotificationService.init().catchError((_) {}));
  }

  @override
  void dispose() {
    _shareSub?.cancel();
    _quickSub?.cancel();
    _queue?.dispose();
    super.dispose();
  }

  Future<void> _restore() async {
    _bioEnabled = await BiometricPrefs.loadBiometricEnabled();
    _digestEnabled = await NotificationPrefs.loadWeeklyDigestEnabled();
    final prefs = await SharedPreferences.getInstance();
    _offline = OfflineCache(prefs);
    _queue = OfflineCaptureQueue(prefs);
    final token = await SessionStore.read();
    if (token != null) {
      try {
        final session = await _auth.restoreSession(token);
        if (session != null) {
          setState(() => _gate = _Gate.signedIn);
          _drainPendingShare();
          unawaited(_drainQueue());
          unawaited(_refreshWeeklyDigest());
          return;
        }
      } on SocketException {
        return _restoreOffline();
      } on HttpException {
        return _restoreOffline();
      } on TimeoutException {
        return _restoreOffline();
      }
      await SessionStore.clear();
    }
    setState(() => _gate = _Gate.login);
  }

  /// The stored token couldn't be validated because the network is down —
  /// trust it anyway and let the dashboard render its cached snapshot under
  /// the stale label. The JWT refresh path re-validates lazily on the next
  /// request once connectivity returns; an upstream 401 still signs out.
  void _restoreOffline() {
    setState(() => _gate = _Gate.signedIn);
    _drainPendingShare();
    // The drain attempt will fail fast and just records an honest
    // last-attempt time on the banner.
    unawaited(_drainQueue());
    // The digest re-arm fails the same way — a failed range read leaves
    // whatever was previously armed untouched.
    unawaited(_refreshWeeklyDigest());
  }

  void _initShare() {
    _shareReceiver.consumeInitialShare().then((text) {
      if (text != null) _onSharedText(text);
    });
    _shareSub = _shareReceiver.stream().listen(_onSharedText);
  }

  /// Shared text only ever pre-fills the capture form — review stays
  /// manual, so a shared SMS can never silently mutate the ledger.
  /// Held behind the biometric gate like the quick-capture deep link.
  void _onSharedText(String text) {
    final prefill = parseSharedText(text);
    if (prefill == null || !mounted) return;
    if (_gate == _Gate.signedIn && _unlocked) {
      _openSharedCapture(prefill);
    } else {
      _pendingPrefill = prefill;
    }
  }

  void _drainPendingShare() {
    if (_pendingPrefill == null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final prefill = _pendingPrefill;
      if (prefill == null || !mounted) return;
      // The prefill stays held until the gate reports unlocked — a
      // capture form must never cover the lock screen.
      if (_gate == _Gate.signedIn && _unlocked) {
        _pendingPrefill = null;
        _openSharedCapture(prefill);
      }
    });
  }

  /// Launcher shortcut / home-widget taps — MainActivity forwards the
  /// `quick` extra as a string action.
  void _initQuick() {
    _quickActions.consumeInitialAction().then((action) {
      if (action != null) _onQuickAction(action);
    });
    _quickSub = _quickActions.stream().listen(_onQuickAction);
  }

  /// Routes a quick action. Anything that is not a capture request is
  /// ignored — the extra is open-ended so Kotlin can grow actions later.
  void _onQuickAction(String action) {
    if (action != kQuickActionCapture || !mounted) return;
    if (_gate == _Gate.signedIn && _unlocked) {
      _openQuickCapture();
    } else if (_gate == _Gate.demo) {
      _openDemoCapture();
    } else {
      // booting / login / still locked — hold for [_drainQuickAction].
      _quickCapturePending = true;
    }
  }

  /// Opens a held "Ghi nhanh" request as soon as a usable surface
  /// exists: the unlocked signed-in shell, or the read-only demo.
  /// Called from [_onGateUnlocked] and the demo transition — safe to
  /// call extra times because the flag is consumed inside the frame.
  void _drainQuickAction() {
    if (!_quickCapturePending) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_quickCapturePending) return;
      if (_gate == _Gate.signedIn && _unlocked) {
        _quickCapturePending = false;
        _openQuickCapture();
      } else if (_gate == _Gate.demo) {
        _quickCapturePending = false;
        _openDemoCapture();
      }
    });
  }

  /// BiometricGate's settle signal — the shell is visible, so held
  /// deep links (quick capture, shared text) may drain now.
  void _onGateUnlocked() {
    _unlocked = true;
    _drainPendingShare();
    _drainQuickAction();
  }

  /// The quick-entry path — same capture route as the nav "Ghi" button,
  /// plus the tab reload the shell performs on a real save.
  Future<void> _openQuickCapture() async {
    final result = await _openCapture(context);
    if (result != null && result != CaptureResult.queued) _reloadTabs();
  }

  /// Demo is read-only, but the form still opens on seed data so the
  /// one-tap entry points land somewhere honest — a save attempt
  /// answers with the same "Demo chỉ xem" notice every write path shows.
  Future<void> _openDemoCapture() async {
    await Navigator.of(context).push<CaptureResult>(
      MaterialPageRoute(
        builder: (_) => CapturePage(
          accounts: DemoStore.seedAccounts(),
          categories: DemoStore.seedCategories(),
          transactions: DemoStore.seedTransactions(),
          onSubmit: (_) async => throw const DemoReadOnly(),
        ),
      ),
    );
  }

  Future<void> _openSharedCapture(SharedTextPrefill prefill) async {
    final result = await Navigator.of(context).push<CaptureResult>(
      MaterialPageRoute(
        builder: (_) => _SharedCaptureLoader(
          store: _store,
          prefill: prefill,
          submit: _captureSubmit,
        ),
      ),
    );
    if (result == CaptureResult.queued) {
      if (mounted) _showQueuedSnack(context);
      return; // nothing landed — the banner tracks the held intent
    }
    if (result != null) _reloadTabs();
    if (result == CaptureResult.savedPartial && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đã lưu khoản — chưa tạo được cam kết lặp lại'),
        ),
      );
    }
  }

  /// Center-nav capture: loads its own accounts/categories/transactions so
  /// the form gets fresh data plus the "Mục hay dùng" ranking regardless of
  /// what the dashboard has loaded.
  Future<CaptureResult?> _openCapture(BuildContext context) async {
    final result = await Navigator.of(context).push<CaptureResult>(
      MaterialPageRoute(
        builder: (_) => _CaptureLoader(store: _store, submit: _captureSubmit),
      ),
    );
    if (!context.mounted) return result;
    if (result == CaptureResult.savedPartial) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đã lưu khoản — chưa tạo được cam kết lặp lại'),
        ),
      );
    }
    if (result == CaptureResult.queued) _showQueuedSnack(context);
    return result;
  }

  /// Tap-to-edit from the activity feed — same form as capture, prefilled
  /// from the row; accounts/categories load fresh so pickers are current.
  Future<void> _openEdit(BuildContext context, Transaction tx) async {
    final result = await Navigator.of(context).push<CaptureResult>(
      MaterialPageRoute(
        builder: (_) =>
            _EditLoader(store: _store, transaction: tx, submit: _captureSubmit),
      ),
    );
    if (result == CaptureResult.queued) {
      if (context.mounted) _showQueuedSnack(context);
      return;
    }
    if (result != null) _reloadTabs();
  }

  /// The submit failed offline; the intent is held in the queue and the
  /// banner already shows it — this snackbar explains the outcome.
  void _showQueuedSnack(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Chưa có mạng — đã giữ lại, sẽ gửi lại khi có mạng'),
      ),
    );
  }

  /// After a capture save, every surface that shows its effect reloads.
  /// The digest re-arms too, so a pending Sunday notification quotes the
  /// totals including the rows just written.
  void _reloadTabs() {
    _dashKey.currentState?.reload();
    _actKey.currentState?.reload();
    _planKey.currentState?.reload();
    _reportKey.currentState?.reload();
    unawaited(_refreshWeeklyDigest());
  }

  /// Capture submit with offline-hold semantics: a transport failure
  /// holds the intent in the queue (replayed later with the same
  /// idempotency key); a write that lands proves connectivity, so a
  /// queue drain piggybacks on it.
  Future<void> _captureSubmit(CaptureIntent intent) async {
    final queue = _queue;
    if (queue == null) return _storeSubmit(_store, intent);
    await submitOrQueue(intent, queue, (i) => _storeSubmit(_store, i));
    if (queue.pendingCount > 0) unawaited(_drainQueue());
  }

  /// Replay held captures FIFO through the same submit path — same
  /// idempotency keys, so a retried write can never double-post. The
  /// queue already records the pass; here we report it: a business
  /// rejection drops the item with an honest reason, a transport stop
  /// just leaves the banner up.
  Future<void> _drainQueue() async {
    final queue = _queue;
    if (queue == null || queue.draining || queue.pendingCount == 0) {
      return;
    }
    final report = await drainQueuedCaptures(
      queue,
      (intent) => _storeSubmit(_store, intent),
    );
    if (!mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    if (report.sent > 0) {
      _reloadTabs();
      final done = report.sent == 1
          ? 'Đã gửi lại khoản đã giữ'
          : 'Đã gửi lại ${report.sent} khoản đã giữ';
      final partial = report.partialCommitments > 0
          ? ' — chưa tạo được cam kết lặp lại'
          : '';
      messenger.showSnackBar(SnackBar(content: Text('$done$partial')));
    }
    for (final drop in report.dropped) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            'Khoản đã giữ không gửi được: ${submitErrorMessage(drop.error)}',
          ),
        ),
      );
    }
  }

  Future<void> _onSignedIn(_) async {
    final token = _auth.session?.sessionToken;
    if (token != null) await SessionStore.write(token);
    setState(() => _gate = _Gate.signedIn);
    _drainPendingShare();
    unawaited(_drainQueue());
    unawaited(_refreshWeeklyDigest());
  }

  /// The weekly digest is opt-in — enabling arms the next Sunday 19:00
  /// one-shot from fresh data, disabling cancels whatever was pending.
  Future<void> _toggleDigest() async {
    final enabled = !_digestEnabled;
    await NotificationPrefs.saveWeeklyDigestEnabled(enabled);
    setState(() => _digestEnabled = enabled);
    unawaited(_refreshWeeklyDigest().catchError((_) {}));
  }

  /// Re-arms the Sunday digest one-shot after sign-in and after every
  /// ledger write, so the copy always carries the freshest totals this
  /// device has seen. Opt-in only (NotificationPrefs) and best-effort —
  /// a failed range read leaves the previous schedule untouched.
  Future<void> _refreshWeeklyDigest() async {
    try {
      await refreshWeeklyDigest(
        enabled: _digestEnabled,
        loadRange: _store.loadTransactionsInRange,
        schedule: NotificationService.scheduleWeeklyDigest,
        cancel: NotificationService.cancelWeeklyDigest,
      );
    } catch (_) {
      /* advisory — same failure posture as the commitment reminders */
    }
  }

  /// "Tạo cam kết" on a detected pattern — pickers load fresh (the
  /// dashboard doesn't hold categories), the shared planning form opens
  /// prefilled, and Kế hoạch reloads after a real save so the new row
  /// shows up there immediately.
  Future<bool> _createSuggestedCommitment(
    BuildContext ctx,
    RecurringSuggestion suggestion,
  ) async {
    final List<AccountSummary> accounts;
    final List<Category> categories;
    try {
      final rows = await Future.wait([
        _store.loadAccounts(),
        _store.loadCategories(),
      ]);
      accounts = rows[0] as List<AccountSummary>;
      categories = rows[1] as List<Category>;
    } catch (_) {
      if (ctx.mounted) {
        ScaffoldMessenger.of(ctx).showSnackBar(
          const SnackBar(
            content: Text('Không tải được dữ liệu — thử lại khi có mạng'),
          ),
        );
      }
      return false;
    }
    if (!ctx.mounted) return false;
    final saved = await showRecurringFormDialog(
      ctx,
      accounts: accounts,
      categories: categories,
      income: false,
      suggestion: suggestion,
      onSave: (name, amount, day, accountId, categoryId) => _store
          .upsertCommitment(
            name: name,
            amountMinor: amount,
            dueDay: day,
            accountId: accountId,
            categoryId: categoryId,
          )
          .then((_) {}),
    );
    if (saved) _planKey.currentState?.reload();
    return saved;
  }

  Future<void> _toggleBiometric() async {
    if (!_bioEnabled) {
      // Prove an unlock path before arming the lock — the platform can
      // report supported hardware with no credential enrolled, and arming
      // then would strand the user on a lock screen they can never pass.
      final ok = await _bioService
          .authenticate(reason: 'Bật khóa MoneyFlow')
          .catchError((_) => false);
      if (!mounted) return;
      if (!ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không xác thực được — chưa bật khóa')),
        );
        return;
      }
    }
    final enabled = !_bioEnabled;
    await BiometricPrefs.saveBiometricEnabled(enabled);
    setState(() {
      _bioEnabled = enabled;
      // Re-arming the lock re-locks the shell — deep links wait for
      // the next onUnlocked again.
      if (enabled) _unlocked = false;
    });
  }

  Future<void> _signOut() async {
    try {
      await _auth.signOut();
    } catch (_) {
      /* upstream sign-out failure still logs out locally */
    }
    await SessionStore.clear();
    setState(() {
      _gate = _Gate.login;
      // The next signed-in session starts behind the lock again.
      _unlocked = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return switch (_gate) {
      _Gate.booting => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      _Gate.login => LoginPage(
        auth: _auth,
        onSignedIn: _onSignedIn,
        onDemo: () {
          setState(() => _gate = _Gate.demo);
          _drainQuickAction();
        },
      ),
      _Gate.demo => _demoDashboard(),
      _Gate.signedIn => BiometricGate(
        enabled: _bioEnabled,
        service: _bioService,
        onUnlocked: _onGateUnlocked,
        child: HomeShell(
          banner: _queue == null
              ? null
              : QueuedCapturesBanner(queue: _queue!, onRetry: _drainQueue),
          tabBuilders: [
            () => DashboardPage(
              key: _dashKey,
              loadAccounts: _store.loadAccounts,
              loadTransactions: _store.loadTransactions,
              loadBudgets: _store.loadBudgets,
              loadCommitments: _store.loadCommitments,
              loadSuggestionTransactions: _store.loadTransactionsInRange,
              onCreateCommitment: (s) => _createSuggestedCommitment(context, s),
              readSnapshot: () => _offline?.readDashboard(),
              writeSnapshot: (snap) =>
                  _offline?.saveDashboard(snap) ?? Future.value(),
              menuItems: _dashboardMenu(context),
            ),
            () => ActivityPage(
              key: _actKey,
              loadPage: _store.loadTransactionPage,
              loadAccounts: _store.loadAccounts,
              onDelete: _deleteTransaction,
              onOpenTrash: () => _openTrash(context),
              onEdit: (tx) => _openEdit(context, tx),
              onBulkReview: (ids, {required reviewed}) async {
                await _store.setReviewStatusBulk(ids, reviewed: reviewed);
              },
              onBulkCategory: (ids, categoryId) async {
                await _store.setCategoryBulk(ids, categoryId);
                // Category moves change budgets and the category report.
                _planKey.currentState?.reload();
                _reportKey.currentState?.reload();
                _dashKey.currentState?.reload();
              },
              loadCategories: _store.loadCategories,
            ),
            () => PlanningPage(
              key: _planKey,
              loadData: _loadPlanning,
              actions: _planningActions(),
            ),
            () => ReportsPage(
              key: _reportKey,
              loadTransactions: _store.loadTransactions,
              loadRange: _store.loadTransactionsInRange,
              loadArchive: kArchiveBackupEnabled ? _store.exportArchive : null,
            ),
          ],
          onCaptureTap: _openCapture,
          onCaptureSaved: _reloadTabs,
        ),
      ),
    };
  }

  /// Deleting a transaction moves money off every surface, not just the
  /// feed — reload balances/budgets alongside the list.
  Future<void> _deleteTransaction(String id) async {
    await _store.deleteTransaction(id);
    _reloadTabs();
  }

  Future<void> _openTrash(BuildContext context) async {
    final restored = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => TrashPage(
          loadDeleted: _store.loadDeletedTransactions,
          onRestore: _store.restoreTransaction,
        ),
      ),
    );
    if (restored == true) _reloadTabs();
  }

  /// Local wipe + honest server-account status. Managed account deletion
  /// is not implemented upstream (the web fails closed the same way), so
  /// the dialog only removes device-local data and signs out.
  Future<void> _deleteLocalData(BuildContext context) async {
    final confirmed = await showDeleteDataDialog(
      context,
      title: 'Xóa dữ liệu & tài khoản',
      body:
          'Dữ liệu trên thiết bị này (bộ nhớ đệm, lựa chọn gần nhất, khóa '
          'sinh trắc, phiên đăng nhập) sẽ bị xóa và bạn sẽ đăng xuất.',
      serverNote:
          'Xóa tài khoản trên máy chủ chưa được hỗ trợ — sổ cái của bạn '
          'không bị thay đổi.',
    );
    if (!confirmed) return;
    final prefs = await SharedPreferences.getInstance();
    await wipeLocalData(prefs);
    if (mounted) await _signOut();
  }

  /// Demo data is seed-only, but the device still holds prefs — same
  /// wipe contract as the web's demo-local deletion.
  Future<void> _deleteDemoData(BuildContext context) async {
    final confirmed = await showDeleteDataDialog(
      context,
      title: 'Xóa dữ liệu demo',
      body: 'Dữ liệu demo và cài đặt MoneyFlow trên thiết bị này sẽ bị xóa.',
      serverNote: 'Chế độ demo không có dữ liệu trên máy chủ.',
    );
    if (!confirmed) return;
    final prefs = await SharedPreferences.getInstance();
    await wipeLocalData(prefs);
    if (mounted) setState(() => _gate = _Gate.login);
  }

  /// "Cần xem" — the review queue for pasted/imported data. Every mutation
  /// inside can change the ledger (approve) or the queue (paste/reject), so
  /// a `true` result reloads the shell tabs like a capture save does.
  Future<void> _openInbox(BuildContext context) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => InboxPage(
          loadCandidates: _store.loadPendingInboxCandidates,
          loadAccounts: _store.loadAccounts,
          loadCategories: _store.loadCategories,
          onPlan: _store.planInboxCandidate,
          onApprove: (a) => _store.approveInboxCandidate(a).then((_) {}),
          onReject: _store.rejectInboxCandidate,
          onCommitDrafts: (drafts) =>
              _store.createInboxCandidates(drafts).then((_) {}),
        ),
      ),
    );
    if (changed == true) _reloadTabs();
  }

  /// Menu items on the dashboard appbar — account management, the review
  /// queue, device lock, and sign-out stay one level deep; the day-to-day
  /// surfaces are tabs.
  List<DashboardMenuItem> _dashboardMenu(BuildContext context) {
    return [
      DashboardMenuItem(
        label: 'Cần xem',
        icon: Icons.inbox_outlined,
        // The badge reads pending ids once per menu open — cheap, and a
        // failed read degrades to the bare label instead of a fake count.
        badge: _store.loadPendingInboxCount,
        onTap: () => _openInbox(context),
      ),
      DashboardMenuItem(
        label: 'Tài khoản',
        icon: Icons.account_balance_wallet,
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => AccountsPage(
              loadAccounts: _store.loadAccounts,
              onCreate: (name, kind, bal) => _store
                  .createAccount(name: name, kind: kind, initialBalance: bal)
                  .then((_) {}),
              onArchive: _store.setAccountArchived,
              onUpdate: (a, name, kind, bal) => _store
                  .updateAccount(
                    accountId: a.id,
                    name: name,
                    kind: kind,
                    initialBalance: bal,
                    icon: a.icon,
                    color: a.color,
                    expectedUpdatedAt: a.updatedAt,
                  )
                  .then((_) => _reloadTabs()),
            ),
          ),
        ),
      ),
      DashboardMenuItem(
        label: 'Danh mục',
        icon: Icons.category,
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => CategoriesPage(
              loadCategories: _store.loadAllCategories,
              onSave: (draft) => _store
                  .saveCategory(
                    id: draft.id,
                    name: draft.name,
                    kind: draft.kind,
                    icon: draft.icon,
                    color: draft.color,
                  )
                  // Category names/ids feed budgets, filters and pickers —
                  // reload the tabs that display them after every write.
                  .then((_) => _reloadTabs()),
              onSetArchived: (id, archived) => _store
                  .setCategoryArchived(id, archived)
                  .then((_) => _reloadTabs()),
              onDelete: (id) => _store.deleteCategory(id).then((deleted) {
                if (deleted) _reloadTabs();
                return deleted;
              }),
            ),
          ),
        ),
      ),
      DashboardMenuItem(
        label: _digestEnabled ? 'Tắt tóm tắt tuần' : 'Bật tóm tắt tuần',
        icon: _digestEnabled
            ? Icons.notifications_active_outlined
            : Icons.notifications_none,
        onTap: _toggleDigest,
      ),
      DashboardMenuItem(
        label: _bioEnabled ? 'Tắt khóa sinh trắc' : 'Bật khóa sinh trắc',
        icon: _bioEnabled ? Icons.fingerprint : Icons.lock_open,
        onTap: _toggleBiometric,
      ),
      DashboardMenuItem(
        label: 'Xóa dữ liệu & tài khoản',
        icon: Icons.delete_forever,
        onTap: () => _deleteLocalData(context),
      ),
      DashboardMenuItem(
        label: 'Đăng xuất',
        icon: Icons.logout,
        onTap: _signOut,
      ),
    ];
  }

  /// Demo keeps the same shell and surfaces on seed data; writes are
  /// honest no-ops so read-only exploration still works fully offline.
  HomeShell _demoDashboard() {
    String monthStart() {
      final n = DateTime.now();
      return '${n.year}-${n.month.toString().padLeft(2, '0')}-01';
    }

    return HomeShell(
      tabBuilders: [
        () => DashboardPage(
          loadAccounts: () async => DemoStore.seedAccounts(),
          loadTransactions: () async => DemoStore.seedTransactions(),
          loadBudgets: (m) async => DemoStore.seedBudgets(m),
          loadCommitments: (_) async => DemoStore.seedCommitments(),
          // Detection runs on the same seeds; the seeds carry no monthly
          // pattern today, so the card simply stays absent — if a seed
          // ever qualifies, the create button repeats the read-only rule.
          loadSuggestionTransactions: (_, _) async =>
              DemoStore.seedTransactions(),
          onCreateCommitment: (s) async {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Demo chỉ xem — đăng nhập để ghi khoản'),
                ),
              );
            }
            return false;
          },
          modeLabel: 'demo',
          menuItems: [
            DashboardMenuItem(
              label: 'Xóa dữ liệu demo',
              icon: Icons.delete_forever,
              onTap: () => _deleteDemoData(context),
            ),
            DashboardMenuItem(
              label: 'Thoát demo',
              icon: Icons.logout,
              onTap: () => setState(() => _gate = _Gate.login),
            ),
          ],
        ),
        () => ActivityPage(
          loadPage: inMemoryPageLoader(DemoStore.seedTransactions()),
          loadAccounts: () async => DemoStore.seedAccounts(),
          loadCategories: () async => DemoStore.seedCategories(),
          onDelete: (_) async {},
        ),
        () => PlanningPage(
          loadData: () async => PlanningData(
            budgets: DemoStore.seedBudgets(monthStart()),
            commitments: DemoStore.seedCommitments(),
            goals: DemoStore.seedGoals(),
            accounts: DemoStore.seedAccounts(),
            categories: DemoStore.seedCategories(),
            monthStart: monthStart(),
          ),
          actions: _noopPlanningActions,
        ),
        () => ReportsPage(
          loadTransactions: () async => DemoStore.seedTransactions(),
        ),
      ],
      onCaptureTap: (ctx) {
        ScaffoldMessenger.of(ctx).showSnackBar(
          const SnackBar(
            content: Text('Demo chỉ xem — đăng nhập để ghi khoản'),
          ),
        );
        return Future<CaptureResult?>.value();
      },
      onCaptureSaved: () {},
    );
  }

  static final _noopPlanningActions = PlanningActions(
    onBudgetSave: (_, _, _) async {},
    onBudgetDelete: (_) async {},
    onCommitmentSave: (_, _, _, _, _, _) async {},
    onCommitmentPay: (_) async {},
    onCommitmentUndo: (_) async {},
    onCommitmentArchived: (_, _) async {},
    onGoalSave: (_, _, _, _) async {},
    onGoalAdjust: (_, _) async {},
    onGoalArchived: (_, _) async {},
  );

  /// First of the current month — the planning RPC window boundary.
  static String _monthStart() {
    final n = DateTime.now();
    return '${n.year}-${n.month.toString().padLeft(2, '0')}-01';
  }

  static String _today() {
    final n = DateTime.now();
    return '${n.year}-${n.month.toString().padLeft(2, '0')}-${n.day.toString().padLeft(2, '0')}';
  }

  /// Signed-in planning loader — also reschedules due-day reminders
  /// against the just-fetched list (archived commitments get cancelled
  /// inside the scheduler).
  Future<PlanningData> _loadPlanning() async {
    final monthStart = _monthStart();
    final results = await Future.wait([
      _store.loadBudgets(monthStart),
      _store.loadCommitments(monthStart),
      _store.loadGoals(),
      _store.loadAccounts(),
      _store.loadCategories(),
      _store.loadIncomeTemplates(monthStart),
    ]);
    unawaited(
      NotificationService.scheduleCommitmentReminders(
        results[1] as List<RecurringCommitment>,
      ).catchError((_) {}),
    );
    return PlanningData(
      budgets: results[0] as List<BudgetProgress>,
      commitments: results[1] as List<RecurringCommitment>,
      goals: results[2] as List<SavingsGoal>,
      accounts: results[3] as List<AccountSummary>,
      categories: results[4] as List<Category>,
      incomeTemplates: results[5] as List<RecurringIncome>,
      monthStart: monthStart,
    );
  }

  /// Paying a commitment / receiving income posts a real ledger
  /// transaction — balances, feed and reports must follow (the planning
  /// page reloads itself).
  void _reloadLedgerTabs() {
    _dashKey.currentState?.reload();
    _actKey.currentState?.reload();
    _reportKey.currentState?.reload();
  }

  PlanningActions _planningActions() => PlanningActions(
    // An edit re-sends the same (category, month) pair with the row's
    // updated_at as the stale-write guard — like the web's saveBudgetAction.
    onBudgetSave: (editing, categoryId, limit) => _store
        .upsertBudget(
          categoryId: categoryId,
          monthStart: editing?.monthStart ?? _monthStart(),
          limitMinor: limit,
          expectedUpdatedAt: editing?.updatedAt,
        )
        .then((_) {}),
    onBudgetDelete: _store.deleteBudget,
    onCommitmentSave: (editing, name, amount, day, accountId, categoryId) =>
        _store
            .upsertCommitment(
              commitmentId: editing?.id,
              name: name,
              amountMinor: amount,
              dueDay: day,
              accountId: accountId,
              categoryId: categoryId,
              expectedUpdatedAt: editing?.updatedAt,
            )
            .then((_) {}),
    onCommitmentPay: (c) => _store
        .payCommitment(
          commitmentId: c.id,
          monthStart: _monthStart(),
          paidOn: _today(),
          idempotencyKey: newIdempotencyKey(),
        )
        .then((_) => _reloadLedgerTabs()),
    // Undoing a payment soft-deletes the expense it posted — the ledger
    // surfaces (balances, feed, reports) must reload too.
    onCommitmentUndo: (c) => _store
        .undoCommitmentPayment(c.id, _monthStart())
        .then((_) => _reloadLedgerTabs()),
    onCommitmentArchived: _store.setCommitmentArchived,
    onIncomeSave: (editing, name, amount, day, accountId, categoryId) => _store
        .upsertIncomeTemplate(
          templateId: editing?.id,
          name: name,
          amountMinor: amount,
          dueDay: day,
          accountId: accountId,
          categoryId: categoryId,
          expectedUpdatedAt: editing?.updatedAt,
        )
        .then((_) {}),
    onIncomeReceive: (i) => _store
        .receiveIncome(
          templateId: i.id,
          monthStart: _monthStart(),
          receivedOn: _today(),
          idempotencyKey: newIdempotencyKey(),
        )
        .then((_) => _reloadLedgerTabs()),
    onIncomeUndo: (i) => _store
        .undoIncomeReceipt(i.id, _monthStart())
        .then((_) => _reloadLedgerTabs()),
    onIncomeArchived: _store.setIncomeTemplateArchived,
    onGoalSave: (editing, name, target, deadline) => _store
        .upsertGoal(
          goalId: editing?.id,
          name: name,
          targetMinor: target,
          deadline: deadline,
          expectedUpdatedAt: editing?.updatedAt,
        )
        .then((_) {}),
    onGoalAdjust: _store.adjustGoal,
    onGoalArchived: _store.setGoalArchived,
  );
}

/// Loads accounts, categories and the recent feed before showing the
/// capture form — the feed powers the "Mục hay dùng" category ranking.
class _CaptureLoader extends StatelessWidget {
  const _CaptureLoader({required this.store, required this.submit});

  final RealStore store;
  final Future<void> Function(CaptureIntent intent) submit;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: Future.wait([
        store.loadAccounts(),
        store.loadCategories(),
        store.loadTransactions(),
      ]),
      builder: (context, snap) {
        if (snap.hasError) {
          // A failed load must say so — a spinner that never ends would
          // read as "still working" while the network is simply down.
          return Scaffold(
            appBar: AppBar(title: const Text('Ghi khoản')),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Không tải được dữ liệu — thử lại khi có mạng',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            ),
          );
        }
        if (!snap.hasData) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        return CapturePage(
          accounts: snap.data![0].cast(),
          categories: snap.data![1].cast(),
          transactions: snap.data![2].cast(),
          onSubmit: submit,
        );
      },
    );
  }
}

/// Edit entry — accounts/categories load fresh; the row being edited
/// carries its own updated_at as the optimistic-concurrency token.
class _EditLoader extends StatelessWidget {
  const _EditLoader({
    required this.store,
    required this.transaction,
    required this.submit,
  });

  final RealStore store;
  final Transaction transaction;
  final Future<void> Function(CaptureIntent intent) submit;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: Future.wait([store.loadAccounts(), store.loadCategories()]),
      builder: (context, snap) {
        if (snap.hasError) {
          return Scaffold(
            appBar: AppBar(title: const Text('Sửa khoản')),
            body: const Center(
              child: Text('Không tải được dữ liệu — thử lại khi có mạng'),
            ),
          );
        }
        if (!snap.hasData) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        return CapturePage(
          accounts: snap.data![0].cast(),
          categories: snap.data![1].cast(),
          editing: transaction,
          onSubmit: submit,
        );
      },
    );
  }
}

/// Share-receive entry — accounts/categories are fetched on demand because
/// a share can arrive before the dashboard has loaded anything.
class _SharedCaptureLoader extends StatelessWidget {
  const _SharedCaptureLoader({
    required this.store,
    required this.prefill,
    required this.submit,
  });

  final RealStore store;
  final SharedTextPrefill prefill;
  final Future<void> Function(CaptureIntent intent) submit;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: Future.wait([store.loadAccounts(), store.loadCategories()]),
      builder: (context, snap) {
        if (snap.hasError) {
          return Scaffold(
            appBar: AppBar(title: const Text('Ghi khoản')),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Không tải được dữ liệu — thử lại khi có mạng',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            ),
          );
        }
        if (!snap.hasData) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        return CapturePage(
          accounts: snap.data![0].cast(),
          categories: snap.data![1].cast(),
          prefill: prefill,
          onSubmit: submit,
        );
      },
    );
  }
}

/// Wires the Data API calls into the shared capture-submit orchestration —
/// transaction/transfer first, then the optional monthly commitment.
/// This is also the queue-replay path: replays call it directly so a
/// failed replay can never re-enqueue the same intent.
Future<void> _storeSubmit(RealStore store, CaptureIntent intent) {
  return submitCaptureIntent(
    intent: intent,
    createTransaction: (i) => store.createTransaction(
      accountId: i.accountId,
      categoryId: i.categoryId!,
      kind: i.kind,
      amount: i.amount,
      occurredOn: i.occurredOn,
      note: i.note,
      payee: i.payee,
      idempotencyKey: i.idempotencyKey,
    ),
    createTransfer: (i) => store.createTransfer(
      sourceAccountId: i.accountId,
      destinationAccountId: i.destinationAccountId!,
      amount: i.amount,
      occurredOn: i.occurredOn,
      note: i.note,
      idempotencyKey: i.idempotencyKey,
    ),
    createSplit: (i) => store.createSplitExpense(
      accountId: i.accountId,
      lines: i.splitLines,
      occurredOn: i.occurredOn,
      note: i.note,
      payee: i.payee,
      idempotencyKey: i.idempotencyKey,
    ),
    updateTransaction: (i) => store.updateTransaction(
      transactionId: i.transactionId!,
      accountId: i.accountId,
      categoryId: i.categoryId!,
      kind: i.kind,
      amount: i.amount,
      occurredOn: i.occurredOn,
      note: i.note,
      payee: i.payee,
      expectedUpdatedAt: i.expectedUpdatedAt,
    ),
    updateTransfer: (i) => store.updateTransfer(
      transactionId: i.transactionId!,
      sourceAccountId: i.accountId,
      destinationAccountId: i.destinationAccountId!,
      amount: i.amount,
      occurredOn: i.occurredOn,
      note: i.note,
      expectedUpdatedAt: i.expectedUpdatedAt,
    ),
    createCommitment:
        ({
          required name,
          required amountMinor,
          required dueDay,
          required accountId,
          required categoryId,
        }) => store.upsertCommitment(
          name: name,
          amountMinor: amountMinor,
          dueDay: dueDay,
          accountId: accountId,
          categoryId: categoryId,
        ),
  );
}
