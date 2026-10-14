import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/csv_file_source.dart';
import '../data/neon/auth_client.dart';
import '../data/neon/data_api.dart';
import '../data/neon/neon_config.dart';
import '../data/neon/neon_transport.dart';
import '../data/neon/real_store.dart';
import '../data/notification_capture/notification_capture_channel.dart';
import '../data/notification_capture/notification_capture_controller.dart';
import '../data/notifications.dart';
import '../data/offline_cache.dart';
import '../data/offline_queue.dart';
import '../data/quick_action.dart';
import '../data/session_store.dart';
import '../data/settings_prefs.dart';
import '../data/widget_snapshot.dart';
import '../data/share/share_intent.dart';
import '../data/share/share_text_parser.dart';
import '../domain/budget.dart';
import '../domain/report.dart' show ymd;
import '../domain/models.dart';
import '../domain/recurring_detection.dart';
import '../domain/transaction_query.dart';
import 'biometric_lock.dart';
import 'delete_account.dart';
import 'delete_data.dart';
import 'post_write_refresher.dart';
import 'url_opener.dart';
import '../features/accounts/account_reconciliation_page.dart';
import '../features/accounts/account_register_page.dart';
import '../features/accounts/balance_adjustment_dialog.dart';
import '../features/accounts/accounts_page.dart';
import '../features/activity/activity_page.dart';
import '../features/activity/trash_page.dart';
import '../data/demo_store.dart';
import '../data/google_sign_in.dart';
import '../features/auth/login_page.dart';
import '../features/auth/welcome_page.dart';
import '../features/capture/capture_page.dart';
import '../features/capture/capture_submit.dart';
import '../features/capture/queue_banner.dart';
import '../features/categories/categories_page.dart';
import '../features/dashboard/dashboard_page.dart';
import '../features/inbox/inbox_page.dart';
import '../features/inbox/rules_page.dart';
import '../features/timeline/timeline_page.dart';
import '../features/notification_capture/notification_capture_page.dart';
import '../features/onboarding/onboarding_page.dart';
import '../features/planning/planning_page.dart';
import '../features/planning/recurring_form_dialog.dart';
import '../features/reports/reports_page.dart';
import '../features/settings/change_password_page.dart';
import '../features/settings/settings_page.dart';
import '../theme/mf_theme.dart';
import 'home_shell.dart';

/// JSON backup ships through `export_user_archive` — live on both
/// acceptance and production Neon since the 20261010121000 reader-definer
/// migration applied (verified 2026-10-14: the produced archive carries
/// real tenant rows). `MF_ARCHIVE_BACKUP=false` stays as an emergency
/// off-switch if a future backend regression appears.
const kArchiveBackupEnabled = bool.fromEnvironment(
  'MF_ARCHIVE_BACKUP',
  defaultValue: true,
);

class MoneyFlowApp extends StatefulWidget {
  const MoneyFlowApp({super.key});

  @override
  State<MoneyFlowApp> createState() => _MoneyFlowAppState();
}

class _MoneyFlowAppState extends State<MoneyFlowApp> {
  @override
  void initState() {
    super.initState();
    // The stored choice lands on the notifier — the MaterialApp below
    // rebuilds with it (absent/corrupt pref falls back to system).
    unawaited(SettingsPrefs.loadThemeMode());
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: SettingsPrefs.themeMode,
      builder: (context, mode, _) => MaterialApp(
        themeMode: mode,
        title: 'MoneyFlow',
        debugShowCheckedModeBanner: false,
        // The UI is Vietnamese-only; without these delegates the framework
        // defaults (back-button tooltip "Back", menu "Show menu", date
        // pickers) read English to screen readers and long-presses.
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [Locale('vi'), Locale('en')],
        locale: const Locale('vi'),
        // Owner-approved Fresh Blue system (document-theme.css →
        // theme/mf_theme.dart): semantic income/expense/transfer tokens,
        // bordered cards, 48px targets — the same language as the web.
        theme: MfTheme.light(),
        darkTheme: MfTheme.dark(),
        home: const AuthGate(),
      ),
    );
  }
}

/// Startup auth state: restore persisted session → dashboard, else login.
/// Demo mode remains reachable from the login screen for offline exploration.
///
/// [shareReceiver], [quickActions], [biometric], [urlOpener],
/// [notificationGateway], [googleFlow] and [requester] are seams for
/// widget tests — production callers never pass them.
class AuthGate extends StatefulWidget {
  const AuthGate({
    super.key,
    this.shareReceiver = const ShareIntentReceiver(),
    this.quickActions = const QuickActionReceiver(),
    this.biometric,
    this.urlOpener = const DeviceUrlOpener(),
    this.notificationGateway = const NotificationCaptureChannel(),
    this.googleFlow,
    this.requester = httpNeonRequester,
  });

  final ShareIntentReceiver shareReceiver;
  final QuickActionSource quickActions;
  final BiometricService? biometric;
  final UrlOpener urlOpener;
  final NotificationCaptureGateway notificationGateway;

  /// Google sign-in seam — production builds the loopback redirect on
  /// first use; widget tests inject a fake that never opens a browser.
  final GoogleSignInFlow? googleFlow;

  /// HTTP seam for the Neon auth + data clients — widget tests script a
  /// fake transport instead of opening real sockets.
  final NeonRequester requester;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

enum _Gate { booting, welcome, login, onboarding, signedIn, demo }

class _AuthGateState extends State<AuthGate> with WidgetsBindingObserver {
  final _config = NeonConfig.fromEnvironment();
  late final _auth = NeonAuthClient(
    config: _config,
    requester: widget.requester,
  );
  late final _store = RealStore(
    NeonDataApi(
      config: _config,
      auth: _auth,
      requester: widget.requester,
      onSessionExpired: _onSessionExpired,
    ),
  );
  late final _bioService = widget.biometric ?? DeviceBiometricService();
  // Native sheet only exists when an Android OAuth client was
  // registered for this package (owner's own Google Cloud project) —
  // against Neon's shared provider it's skipped and the loopback runs.
  late final GoogleSignInFlow _googleFlow =
      widget.googleFlow ??
      HybridGoogleSignIn(
        native: _config.googleServerClientId.isEmpty
            ? null
            : NativeGoogleSignIn(
                auth: _auth,
                serverClientId: _config.googleServerClientId,
              ),
        loopback: LoopbackGoogleSignIn(
          auth: _auth,
          launcher: widget.urlOpener.open,
        ),
      );
  ShareIntentReceiver get _shareReceiver => widget.shareReceiver;
  QuickActionSource get _quickActions => widget.quickActions;
  NotificationCaptureGateway get _notifGateway => widget.notificationGateway;
  late final _notifCapture = NotificationCaptureController(
    gateway: widget.notificationGateway,
    submit: _store.createNotificationCandidates,
  );

  _Gate _gate = _Gate.booting;
  bool _bioEnabled = false;

  /// True once the signed-in shell is past the biometric gate — the lock
  /// is off/unavailable, or the user just unlocked. Deep links check it
  /// so a capture form never opens over the lock screen.
  bool _unlocked = false;

  /// Weekly-digest opt-in — defaults OFF until the stored pref loads.
  bool _digestEnabled = false;

  /// Notification-capture state for the menu label — refreshed on sign-in,
  /// on resume and after the settings page closes. Both halves are real:
  /// the OS grant AND the app opt-in must be on for "đang bật".
  bool _notifCaptureOn = false;
  int _supportedSourceCount = 0;
  SharedPreferences? _prefs;
  OfflineCache? _offline;
  OfflineCaptureQueue? _queue;
  final _postWriteRefresh = PostWriteRefresher();

  /// Demo-mode category writes — session-scoped so the category pack
  /// demo actually persists its adds for the visit; re-entering demo or
  /// wiping demo data starts from seeds again.
  var _demoCategories = DemoCategoryStore();

  /// Demo-mode auto-fill rules — same session scope as demo categories.
  /// The store reads the CURRENT category list through the closure (never
  /// a captured instance), so it stays correct when a fresh demo swaps
  /// `_demoCategories`; both stores are recreated together in `onDemo`.
  late var _demoRules = DemoRuleStore(
    categories: () => _demoCategories.current,
  );

  /// Demo-mode pending review queue — same session scope; recreated in
  /// `onDemo` so each visit starts from the two seeded candidates.
  var _demoInbox = DemoInboxStore();

  /// Re-entrancy guard for the session-expired sign-out — several tab
  /// loaders can 401 in the same frame and each signals the callback.
  bool _expiredSignOut = false;
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

  /// Post-auth first-run activation — the account the flow belongs to
  /// (the done-flag is keyed by it) and the seeded cash wallet step 2
  /// confirms, when the ledger already carries one. Both are set by
  /// [_needsOnboarding] and cleared by [_finishOnboarding].
  String? _onboardingUserId;
  AccountSummary? _onboardingCash;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _restore();
    _initShare();
    _initQuick();
    _notifCapture.start();
    // Reminder setup is best-effort — a denied notification permission
    // must not block app startup.
    unawaited(NotificationService.init().catchError((_) {}));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _shareSub?.cancel();
    _quickSub?.cancel();
    _queue?.dispose();
    _postWriteRefresh.dispose();
    unawaited(_notifCapture.dispose());
    super.dispose();
  }

  /// Persists the widget feed for the signed-in account. Before prefs
  /// load (the `_restore` race) there is nowhere to write — skipping is
  /// honest, the next load fills the widget.
  Future<void> _saveWidgetSnapshot(WidgetSnapshot snap) async {
    final prefs = _prefs;
    if (prefs == null) return;
    await WidgetSnapshotStore(prefs).save(snap);
  }

  /// Returning from system settings (or any backgrounding) re-reads the
  /// real OS grant — the menu label must never quote a stale toggle.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refreshNotifCaptureState();
  }

  Future<void> _restore() async {
    _bioEnabled = await BiometricPrefs.loadBiometricEnabled();
    _digestEnabled = await NotificationPrefs.loadWeeklyDigestEnabled();
    _prefs = await SharedPreferences.getInstance();
    final stored = await SessionStore.read();
    if (stored != null) {
      try {
        final session = await _auth.restoreSession(stored.token);
        if (session != null) {
          _bindAccountStores(session.userId);
          // A restorable session means this device passed the gate long
          // ago — record it so a later sign-out lands on login, not a
          // welcome screen written for first runs.
          unawaited(WelcomePrefs.markSeen());
          // First-run activation only ever applies to an account this
          // device hasn't finished it for — a restored session still
          // earns the check (the flag is per account, not per device).
          final showOnboarding = await _needsOnboarding(
            session.userId,
            isNewAccount: false,
          );
          if (!mounted) return;
          _onboardingUserId = showOnboarding ? session.userId : null;
          setState(
            () => _gate = showOnboarding ? _Gate.onboarding : _Gate.signedIn,
          );
          _drainPendingShare();
          unawaited(_drainQueue());
          unawaited(_refreshWeeklyDigest());
          unawaited(_refreshNotifCaptureState());
          return;
        }
      } on SocketException {
        return _restoreOffline(stored.userId);
      } on HttpException {
        return _restoreOffline(stored.userId);
      } on TimeoutException {
        return _restoreOffline(stored.userId);
      } on NeonAuthException {
        // restoreSession only throws this for a transient auth-service
        // fault (5xx / 429 / 408 / unreadable body) — the stored session
        // is untouched and re-validates on the next request.
        return _restoreOffline(stored.userId);
      }
      await SessionStore.clear();
      // A dead stored session is a silent sign-out — the same unscoped
      // residue must go, or it reaches the next account on this device.
      await clearSignOutResidue(_prefs!);
      // The widget held the dead session's figures — re-render now so a
      // stale balance never poses as the next account's.
      unawaited(WidgetSnapshotStore.refresh());
    }
    _bindAccountStores(null);
    // First run only: the welcome surface sits ahead of the login form.
    // A wiped flag (local-data deletion) is indistinguishable from a
    // fresh install — showing it again stays honest.
    final seenWelcome = _prefs?.getBool(WelcomePrefs.seenKey) ?? false;
    setState(() => _gate = seenWelcome ? _Gate.login : _Gate.welcome);
  }

  /// (Re)binds the device-local stores to the account in charge. Scoping
  /// by userId is the cross-account wall: a snapshot or held-capture list
  /// written under one account can never be read or replayed under
  /// another's JWT — and unlike a destructive sweep, the previous owner's
  /// held captures survive sign-out for their next session.
  void _bindAccountStores(String? userId) {
    final prefs = _prefs;
    if (prefs == null) return;
    // The outgoing queue still belongs to its owner — drop our handle
    // so it can never replay under the next account's JWT.
    _queue?.dispose();
    _queue = OfflineCaptureQueue(prefs, userId: userId);
    _offline = OfflineCache(prefs, userId: userId);
    // Notification capture binds to the same account scope — its dedupe
    // ring, counters and parked events follow the owner, never the device.
    unawaited(_notifCapture.bind(userId));
    // A pre-scoping snapshot can't be attributed to any account — drop
    // it rather than serve it to whoever signs in next.
    unawaited(prefs.remove(OfflineCache.legacyKey));
  }

  /// The stored token couldn't be validated because the network is down —
  /// trust it anyway and let the dashboard render its cached snapshot under
  /// the stale label. The JWT refresh path re-validates lazily on the next
  /// request once connectivity returns; an upstream 401 still signs out
  /// (see NeonDataApi.onSessionExpired).
  void _restoreOffline(String? userId) {
    _bindAccountStores(userId);
    // Same "not a first run" marker as the online restore path.
    unawaited(WelcomePrefs.markSeen());
    setState(() => _gate = _Gate.signedIn);
    _drainPendingShare();
    // The drain attempt will fail fast and just records an honest
    // last-attempt time on the banner.
    unawaited(_drainQueue());
    // The digest re-arm fails the same way — a failed range read leaves
    // whatever was previously armed untouched.
    unawaited(_refreshWeeklyDigest());
    unawaited(_refreshNotifCaptureState());
  }

  /// The menu label's truth source: OS grant AND app opt-in, plus the
  /// supported-source count for the "N nguồn" text. Channel failures read
  /// as "off" — a state the UI can never overclaim.
  Future<void> _refreshNotifCaptureState() async {
    final granted = await _notifGateway.isAccessEnabled();
    final optedIn = await _notifCapture.isEnabled();
    final sources = await _notifGateway.supportedSources();
    if (!mounted) return;
    setState(() {
      _notifCaptureOn = granted && optedIn;
      _supportedSourceCount = sources.length;
    });
  }

  /// The consent + state surface for the listener pilot. Popping it
  /// re-reads the OS switch so the menu never quotes a stale grant.
  Future<void> _openNotificationCapture(BuildContext context) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => NotificationCapturePage(
          gateway: _notifGateway,
          controller: _notifCapture,
        ),
      ),
    );
    unawaited(_refreshNotifCaptureState());
  }

  /// The Data API proved the session dead (a 401 from /get-session or a
  /// PostgREST JWT rejection) — a shell whose every loader fails with
  /// banners is broken UX, so sign out locally and say why. Only the
  /// signed-in gate can expire: a 401 on the login screen is a wrong
  /// password, not a dead session.
  Future<void> _onSessionExpired() async {
    if (!mounted || _expiredSignOut || _gate != _Gate.signedIn) return;
    _expiredSignOut = true;
    try {
      await _signOut();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Hết phiên đăng nhập — đăng nhập lại')),
        );
      }
    } finally {
      _expiredSignOut = false;
    }
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
  Future<void> _openQuickCapture([TransactionKind? kind]) async {
    final result = await _openCapture(context, kind: kind);
    if (result != null && result != CaptureResult.queued) _reloadTabs();
  }

  /// Demo is read-only, but the form still opens on seed data so the
  /// one-tap entry points land somewhere honest — a save attempt
  /// answers with the same "Demo chỉ xem" notice every write path shows.
  Future<void> _openDemoCapture([TransactionKind? kind]) async {
    await Navigator.of(context).push<CaptureResult>(
      MaterialPageRoute(
        builder: (_) => CapturePage(
          initialKind: kind,
          accounts: DemoStore.seedAccounts(),
          // The demo category store, not raw seeds — categories added
          // via the pack must show in the picker like a real save.
          categories: _demoCategories.active,
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
          onCreateAccount: _createAccountForCapture,
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

  /// "Tạo ví" from the zero-account capture form / empty-ledger intro —
  /// one shared create flow on the same dialog the accounts page hosts.
  /// Returns the refreshed account list after a real save (null when the
  /// dialog was cancelled) so capture can repopulate its picker without
  /// a second contract. The dialog itself reports save failures inline.
  Future<List<AccountSummary>?> _createAccountFlow() async {
    final saved = await showAccountFormDialog(
      context,
      onSave: (name, kind, bal) => _store
          .createAccount(name: name, kind: kind, initialBalance: bal)
          .then((_) {}),
    );
    if (!saved || !mounted) return null;
    return _store.loadAccounts();
  }

  /// Capture-side wrapper: the created wallet changes what every tab
  /// shows (balances, pickers), so a real save reloads them all.
  Future<List<AccountSummary>?> _createAccountForCapture() async {
    final fresh = await _createAccountFlow();
    if (fresh != null) _reloadTabs();
    return fresh;
  }

  /// Center-nav capture: loads its own accounts/categories/transactions so
  /// the form gets fresh data plus the "Mục hay dùng" ranking regardless of
  /// what the dashboard has loaded.
  Future<CaptureResult?> _openCapture(
    BuildContext context, {
    TransactionKind? kind,
  }) async {
    final result = await Navigator.of(context).push<CaptureResult>(
      MaterialPageRoute(
        builder: (_) => _CaptureLoader(
          initialKind: kind,
          store: _store,
          submit: _captureSubmit,
          onCreateAccount: _createAccountForCapture,
        ),
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
  /// totals including the rows just written. The refresher re-reads once
  /// more after the Data API's replica lag settles — the immediate pass
  /// can still observe the pre-write snapshot.
  void _reloadTabs() => _postWriteRefresh(_refreshAll);

  void _refreshAll() {
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

  /// First-run activation gate — the mobile mirror of the web's
  /// register → /onboarding redirect plus its done-flag. Shown once per
  /// account: a sign-up always qualifies (fresh account, flag cannot be
  /// set), an ordinary sign-in or session restore qualifies only when
  /// the ledger is still empty. An established ledger marks the flag
  /// instead so later sessions skip the read entirely, and an
  /// unverifiable read (offline) just defers — never blocks the shell
  /// on a guess. [isNewAccount] comes from the login page's sign-up
  /// path; Google sign-in cannot tell new from returning upstream, so
  /// it falls back to the empty-ledger rule.
  Future<bool> _needsOnboarding(
    String? userId, {
    required bool isNewAccount,
  }) async {
    if (userId == null || userId.isEmpty) return false;
    final prefs = _prefs ?? await SharedPreferences.getInstance();
    if (OnboardingPrefs.isDone(prefs, userId)) return false;
    final List<AccountSummary> accounts;
    try {
      accounts = await _store.loadAccounts();
    } catch (_) {
      return false;
    }
    // The server seeds a 'Tiền mặt' cash wallet on sign-up — when the
    // ledger already carries one, step 2 confirms it in place (the
    // web's "Bạn đã có ví tiền mặt" variant) instead of creating a
    // duplicate.
    AccountSummary? cash;
    for (final a in accounts) {
      if (a.kind == AccountKind.cash && !a.isArchived) {
        cash = a;
        break;
      }
    }
    if (isNewAccount || accounts.isEmpty) {
      _onboardingCash = cash;
      return true;
    }
    // A seeded cash wallet alone is not ledger use — the server creates
    // it at sign-up, so its presence must not auto-complete onboarding
    // (the reviewed bug: a fresh Google sign-in skipped the flow
    // entirely). Only real activity counts: a second account, or any
    // transaction. An unverifiable read defers like the accounts read
    // above — never marks done on a guess.
    try {
      final ledgerUsed =
          accounts.length > 1 ||
          (await _store.loadTransactions(limit: 1)).isNotEmpty;
      if (!ledgerUsed) {
        _onboardingCash = cash;
        return true;
      }
    } catch (_) {
      return false;
    }
    await OnboardingPrefs.markDone(prefs, userId);
    return false;
  }

  /// Onboarding step 2 — confirms the seeded cash wallet through the
  /// shared account form (update path, like the web's "Xác nhận ví"),
  /// or creates it when the ledger has none. Returns the saved wallet's
  /// name for the step-3 summary; null when the dialog was cancelled.
  Future<String?> _onboardingWallet() async {
    final cash = _onboardingCash;
    String? savedName;
    final saved = await showAccountFormDialog(
      context,
      editing: cash,
      title: cash == null ? 'Tạo ví tiền mặt' : 'Xác nhận ví tiền mặt',
      submitLabel: cash == null ? 'Tạo ví' : 'Xác nhận ví',
      initialName: 'Tiền mặt',
      onSave: (name, kind, bal) async {
        if (cash == null) {
          await _store.createAccount(
            name: name,
            kind: kind,
            initialBalance: bal,
          );
        } else {
          await _store.updateAccount(
            accountId: cash.id,
            name: name,
            kind: kind,
            initialBalance: bal,
            icon: cash.icon,
            color: cash.color,
            expectedUpdatedAt: cash.updatedAt,
          );
        }
        // Records only what the RPC actually accepted — the dialog
        // reports failures inline and never reaches this line on error.
        savedName = name;
      },
    );
    return saved ? savedName : null;
  }

  /// Onboarding finished — completed, skipped, or exiting into the
  /// first-expense capture. Marks the per-account flag so the flow is
  /// once-ever for this account on this device, then lands on the real
  /// shell; the capture request rides the held-quick-action drain so a
  /// biometric lock still wins over it.
  Future<void> _finishOnboarding({bool quickExpense = false}) async {
    final uid = _onboardingUserId;
    _onboardingUserId = null;
    _onboardingCash = null;
    if (uid != null) {
      await OnboardingPrefs.markDone(
        _prefs ?? await SharedPreferences.getInstance(),
        uid,
      );
    }
    if (!mounted) return;
    setState(() => _gate = _Gate.signedIn);
    _drainPendingShare();
    if (quickExpense) {
      _quickCapturePending = true;
      _drainQuickAction();
    }
  }

  Future<void> _onSignedIn(_, {bool isNewAccount = false}) async {
    final session = _auth.session;
    final token = session?.sessionToken;
    if (token != null) {
      await SessionStore.write(token, userId: session?.userId);
    }
    _bindAccountStores(session?.userId);
    final showOnboarding = await _needsOnboarding(
      session?.userId,
      isNewAccount: isNewAccount,
    );
    if (!mounted) return;
    _onboardingUserId = showOnboarding ? session?.userId : null;
    setState(() => _gate = showOnboarding ? _Gate.onboarding : _Gate.signedIn);
    _drainPendingShare();
    unawaited(_drainQueue());
    unawaited(_refreshWeeklyDigest());
    unawaited(_refreshNotifCaptureState());
  }

  /// The weekly digest is opt-in — enabling arms the next Sunday one-shot
  /// (at the user's stored fire time) from fresh data, disabling cancels
  /// whatever was pending. The menu toggle and the settings switch share
  /// this path; the explicit target keeps the switch independent of a
  /// hidden current value.
  Future<void> _toggleDigest() => _setDigestEnabled(!_digestEnabled);

  Future<void> _setDigestEnabled(bool enabled) async {
    await NotificationPrefs.saveWeeklyDigestEnabled(enabled);
    if (!mounted) return;
    setState(() => _digestEnabled = enabled);
    unawaited(_refreshWeeklyDigest().catchError((_) {}));
  }

  /// Re-arms the Sunday digest one-shot after sign-in and after every
  /// ledger write, so the copy always carries the freshest totals this
  /// device has seen. Opt-in only (NotificationPrefs) and best-effort —
  /// a failed range read leaves the previous schedule untouched. The fire
  /// time re-reads SettingsPrefs so a re-arm never schedules stale.
  Future<void> _refreshWeeklyDigest() async {
    try {
      final time = await SettingsPrefs.loadDigestTime();
      await refreshWeeklyDigest(
        enabled: _digestEnabled,
        digestHour: time.hour,
        digestMinute: time.minute,
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
      onSave: (name, amount, day, accountId, categoryId, interval) => _store
          .upsertCommitment(
            name: name,
            amountMinor: amount,
            dueDay: day,
            accountId: accountId,
            categoryId: categoryId,
            intervalMonths: interval,
          )
          .then((_) {}),
    );
    if (saved) _planKey.currentState?.reload();
    return saved;
  }

  Future<void> _toggleBiometric() => _setBiometricEnabled(!_bioEnabled);

  /// The menu toggle and the settings switch share this path — the
  /// explicit target keeps the page's Switch honest (it reverts itself
  /// when the seam reports the new state was not applied).
  Future<bool> _setBiometricEnabled(bool enabled) async {
    if (enabled) {
      // Prove an unlock path before arming the lock — the platform can
      // report supported hardware with no credential enrolled, and arming
      // then would strand the user on a lock screen they can never pass.
      final ok = await _bioService
          .authenticate(reason: 'Bật khóa MoneyFlow')
          .catchError((_) => false);
      if (!mounted) return false;
      if (!ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không xác thực được — chưa bật khóa')),
        );
        return false;
      }
    }
    await BiometricPrefs.saveBiometricEnabled(enabled);
    setState(() {
      _bioEnabled = enabled;
      // Re-arming the lock re-locks the shell — deep links wait for
      // the next onUnlocked again.
      if (enabled) _unlocked = false;
    });
    return true;
  }

  /// "Chính sách bảo mật" — Play requires the privacy policy reachable
  /// in-app; the hosted page opens in the device browser. A device with
  /// no handler gets an honest notice instead of a dead menu tap.
  Future<void> _openPrivacyPolicy() async {
    final opened = await widget.urlOpener
        .open(Uri.parse(kPrivacyPolicyUrl))
        .catchError((_) => false);
    if (!opened && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không mở được liên kết — thử lại sau')),
      );
    }
  }

  /// "Cài đặt" — one surface, two honest variants. The signed-in page
  /// wires the seams only that mode can back: the biometric lock (it
  /// guards the real shell, not demo), the weekly digest (it quotes the
  /// real ledger), and the JSON archive (the RPC needs a session AND the
  /// build flag). Demo keeps the device-level rows — theme, the demo
  /// wipe, policy link, welcome replay — without fake affordances.
  Future<void> _openSettings(BuildContext context) async {
    final demo = _gate == _Gate.demo;
    // Password change only exists for credential accounts — a
    // Google-only user has no current password to prove. Resolve the
    // provider list before pushing so the row either works or isn't
    // there; an unreachable server just hides it (offline can't change
    // a server password anyway).
    var canChangePassword = false;
    if (!demo) {
      try {
        canChangePassword = (await _auth.listProviders()).contains(
          'credential',
        );
      } catch (_) {}
    }
    if (!context.mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SettingsPage(
          biometricEnabled: _bioEnabled,
          onSetBiometricEnabled: demo ? null : _setBiometricEnabled,
          digestEnabled: _digestEnabled,
          onSetDigestEnabled: demo ? null : _setDigestEnabled,
          onDigestScheduleChanged: demo ? null : _refreshWeeklyDigest,
          loadArchive: demo || !kArchiveBackupEnabled
              ? null
              : _store.exportArchive,
          onDeleteLocalData: demo
              ? () => _deleteDemoData(context)
              : () => _deleteLocalData(context),
          deleteLocalDataLabel: demo
              ? 'Xóa dữ liệu demo'
              : 'Xóa dữ liệu trên máy',
          onChangePassword: canChangePassword
              ? () => _changePassword(context)
              : null,
          onDeleteAccount: demo ? null : () => _deleteAccount(context),
          onOpenPrivacyPolicy: _openPrivacyPolicy,
          onReplayWelcome: _replayWelcome,
        ),
      ),
    );
    // No post-refresh needed: the biometric/digest seams update the
    // gate's fields with their own setState, so the menu reopens fresh.
  }

  /// "Xem lại màn chào" — clears the first-run flag (the next no-session
  /// boot treats the device as unintroduced again) and replays the page
  /// now. Demo goes through the real gate so both CTAs keep their
  /// first-run meaning; signed-in pushes it over the shell instead —
  /// routing the gate to `welcome` would land a live session on a login
  /// form it doesn't need, so the pushed variant just pops back.
  Future<void> _replayWelcome() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(WelcomePrefs.seenKey);
    if (!mounted) return;
    if (_gate == _Gate.demo) {
      setState(() => _gate = _Gate.welcome);
      return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => WelcomePage(
          onStart: () {
            unawaited(WelcomePrefs.markSeen());
            Navigator.of(context).pop();
          },
          onDemo: () {
            unawaited(WelcomePrefs.markSeen());
            Navigator.of(context).pop();
            _enterDemo();
          },
        ),
      ),
    );
  }

  Future<void> _signOut() async {
    try {
      await _auth.signOut();
    } catch (_) {
      /* upstream sign-out failure still logs out locally */
    }
    await SessionStore.clear();
    // Signed-out capture must not keep parked raw notification text — the
    // next account on this device can never inherit it.
    unawaited(_notifCapture.unbind());
    final prefs = _prefs;
    if (prefs != null) {
      // Session-scoped residue (last-capture picks, dismissed patterns,
      // unscoped pre-scoping keys) must not reach the next sign-in on
      // this device. Account-scoped stores survive on purpose — they
      // can't leak, and sign-out must not destroy held captures.
      await clearSignOutResidue(prefs);
    }
    // Drop the widget's balance view with the session — the residue
    // sweep removed the value, this re-renders the honest "—".
    unawaited(WidgetSnapshotStore.refresh());
    _bindAccountStores(null);
    if (mounted) {
      setState(() {
        _gate = _Gate.login;
        // The next signed-in session starts behind the lock again.
        _unlocked = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return switch (_gate) {
      _Gate.booting => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      _Gate.welcome => WelcomePage(
        onStart: () {
          unawaited(WelcomePrefs.markSeen());
          setState(() => _gate = _Gate.login);
        },
        onDemo: () {
          unawaited(WelcomePrefs.markSeen());
          _enterDemo();
        },
      ),
      _Gate.login => LoginPage(
        auth: _auth,
        onSignedIn: _onSignedIn,
        // Sign-up is the web's register → /onboarding boundary — the
        // activation flow always follows a fresh account.
        onSignedUp: (s) => _onSignedIn(s, isNewAccount: true),
        // Browser loopback redirect — works with Neon's shared Google
        // provider, no per-app Android OAuth client needed. The seam
        // stays injectable so tests never touch a browser/socket.
        googleFlow: _googleFlow,
        onDemo: _enterDemo,
      ),
      _Gate.onboarding => OnboardingPage(
        hasCashWallet: _onboardingCash != null,
        onWalletStep: _onboardingWallet,
        onQuickExpense: () => _finishOnboarding(quickExpense: true),
        onDone: _finishOnboarding,
      ),
      _Gate.demo => _demoDashboard(),
      _Gate.signedIn => BiometricGate(
        enabled: _bioEnabled,
        service: _bioService,
        onUnlocked: _onGateUnlocked,
        // Backgrounding re-locks the gate — held deep links wait for the
        // next unlock again instead of opening over the lock screen.
        onLocked: () => _unlocked = false,
        child: HomeShell(
          banner: _queue == null
              ? null
              : QueuedCapturesBanner(queue: _queue!, onRetry: _drainQueue),
          tabBuilders: [
            () => DashboardPage(
              key: _dashKey,
              onCapture: _openQuickCapture,
              loadAccounts: _store.loadAccounts,
              loadTransactions: _store.loadTransactions,
              loadBudgets: _store.loadBudgets,
              loadCommitments: _store.loadCommitments,
              loadSuggestionTransactions: _store.loadTransactionsInRange,
              onCreateCommitment: (s) => _createSuggestedCommitment(context, s),
              // "Tạo ví đầu tiên" on the empty ledger — the page reloads
              // itself after the seam returns; the other tabs that read
              // accounts follow on a real save.
              onCreateAccount: () async {
                final fresh = await _createAccountFlow();
                if (fresh == null) return;
                _actKey.currentState?.reload();
                _planKey.currentState?.reload();
                _reportKey.currentState?.reload();
                unawaited(_refreshWeeklyDigest());
              },
              readSnapshot: () => _offline?.readDashboard(),
              writeSnapshot: (snap) =>
                  _offline?.saveDashboard(snap) ?? Future.value(),
              // The home-screen widget's last-known figures ride on the
              // dashboard's load — cheap piggyback on the snapshot write,
              // same "never fail the render path" rule.
              writeWidgetSnapshot: _saveWidgetSnapshot,
              // "Ẩn" on a recurring suggestion persists to
              // pattern_dismissals so the choice follows the account.
              dismissalSync: _store,
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
              // "Ghi khoản đầu tiên" on the empty feed — the same route
              // as the center nav button.
              onCapture: _openQuickCapture,
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
              loadAccounts: _store.loadAccounts,
              loadArchive: kArchiveBackupEnabled ? _store.exportArchive : null,
              onOpenActivity: (q, title) =>
                  _openActivitySlice(context, q, title),
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

  /// Local wipe — device-local data only. The label and copy name the
  /// honest scope ("trên máy"): server-side account deletion lives on
  /// the separate "Xóa tài khoản" entry below.
  Future<void> _deleteLocalData(BuildContext context) async {
    final confirmed = await showDeleteDataDialog(
      context,
      title: 'Xóa dữ liệu trên máy',
      body:
          'Dữ liệu trên thiết bị này (bộ nhớ đệm, lựa chọn gần nhất, khóa '
          'sinh trắc, phiên đăng nhập) sẽ bị xóa và bạn sẽ đăng xuất.',
      serverNote:
          'Tài khoản và sổ trên máy chủ không bị ảnh hưởng — dùng "Xóa '
          'tài khoản" nếu muốn xóa cả tài khoản.',
    );
    if (!confirmed) return;
    final prefs = await SharedPreferences.getInstance();
    await wipeLocalData(prefs);
    if (mounted) await _signOut();
  }

  /// "Đổi mật khẩu" — the page owns the form + error surfacing; the
  /// shell supplies the real auth call and confirms success once the
  /// page pops true. Other devices' sessions are revoked server-side
  /// (`revokeOtherSessions`), this one keeps working.
  Future<void> _changePassword(BuildContext context) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => ChangePasswordPage(onSubmit: _auth.changePassword),
      ),
    );
    if (changed == true && mounted) {
      ScaffoldMessenger.of(
        this.context,
      ).showSnackBar(const SnackBar(content: Text('Đã đổi mật khẩu')));
    }
  }

  /// Server-side account deletion — the dialog owns re-auth + the
  /// delete_my_account call; on success the session is already dead
  /// upstream, so the shell wipes local stores and lands on the login
  /// gate without /sign-out or a session restore.
  Future<void> _deleteAccount(BuildContext context) async {
    final deleted = await showDeleteAccountFlow(
      context,
      auth: _auth,
      deleteAccount: _store.deleteMyAccount,
      // Same seam as the login page: a Google-only account re-auths
      // through the loopback redirect.
      googleFlow: _googleFlow,
    );
    if (!deleted || !mounted) return;
    // Grab the messenger before the async wipe — a context read after an
    // await gap is unsafe. `this.context` is the State's own element —
    // the `mounted` guard covers it.
    final messenger = ScaffoldMessenger.of(this.context);
    _auth.discardSession();
    unawaited(_notifCapture.unbind());
    final prefs = _prefs ?? await SharedPreferences.getInstance();
    // Full wipe — not the lighter sign-out residue sweep: the account no
    // longer exists, so its scoped stores (dashboard snapshot, held
    // captures) can never be read or replayed by anyone. Mirrors the
    // web's clearLocalMoneyFlowStores after server deletion.
    await wipeLocalData(prefs);
    // The deleted account's widget feed is gone — re-render before any
    // next sign-in could be mistaken for it.
    unawaited(WidgetSnapshotStore.refresh());
    _bindAccountStores(null);
    setState(() {
      // The wiped opt-in keys must not linger in memory — the next
      // sign-in starts from honest defaults.
      _bioEnabled = false;
      _digestEnabled = false;
      _gate = _Gate.login;
      _unlocked = false;
    });
    // Dropped scheduled digests too — a notification for a deleted
    // account would be a lie, and the schedule prefs are already gone.
    unawaited(NotificationService.cancelWeeklyDigest().catchError((_) {}));
    messenger.showSnackBar(
      const SnackBar(content: Text('Tài khoản đã được xóa')),
    );
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
    unawaited(WidgetSnapshotStore.refresh());
    if (mounted) setState(() => _gate = _Gate.login);
  }

  /// Row tap from the accounts list — the register anchors its
  /// running-balance chain on the account snapshot the list just loaded
  /// and re-anchors through loadAccounts after every edit/delete inside
  /// the page, so the ledger and the "Số dư hiện tại" header never drift.
  Future<void> _openAccountRegister(
    BuildContext context,
    AccountSummary account,
  ) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AccountRegisterPage(
          account: account,
          loadPage: _store.loadTransactionPage,
          onDelete: _deleteTransaction,
          onEdit: (tx) => _openEdit(context, tx),
          // loadAccounts filters out archived rows — a null result keeps
          // the last snapshot, so an archived register stays readable.
          loadAccount: () async {
            final accounts = await _store.loadAccounts();
            for (final a in accounts) {
              if (a.id == account.id) return a;
            }
            return null;
          },
          loadReconciliation: () => _store.loadReconciliationState(account.id),
          onOpenReconciliation: () => _openReconciliation(context, account),
          onAdjustBalance: () => _adjustBalance(context, account),
        ),
      ),
    );
  }

  /// The demo seam shared by the welcome screen and the login form.
  /// A fresh demo visit starts from seeds — leftover categories or
  /// rules from a previous visit would misreport what "demo" means.
  void _enterDemo() {
    _demoCategories = DemoCategoryStore();
    _demoRules = DemoRuleStore(categories: () => _demoCategories.current);
    _demoInbox = DemoInboxStore();
    setState(() => _gate = _Gate.demo);
    _drainQuickAction();
  }

  /// "Điều chỉnh số dư" from the register header — the quick drift fix
  /// MISA/Money Lover users expect. Posts a real labeled transaction
  /// (payee 'Điều chỉnh số dư', note carrying ghi → thực tế, kind forced
  /// by the difference sign), never a silent field overwrite.
  Future<bool> _adjustBalance(BuildContext context, AccountSummary account) {
    return showBalanceAdjustmentDialog(
      context,
      account: account,
      loadCategories: _store.loadCategories,
      submit:
          ({
            required kind,
            required amountMinor,
            required categoryId,
            required note,
          }) => _store
              .createTransaction(
                accountId: account.id,
                categoryId: categoryId,
                kind: kind,
                amount: amountMinor,
                occurredOn: ymd(DateTime.now()),
                note: note,
                payee: 'Điều chỉnh số dư',
                idempotencyKey: newIdempotencyKey(),
              )
              .then((_) {}),
    );
  }

  /// "Đối soát" from the register — the statement workspace mirrors the
  /// web's /accounts/[id]/reconcile flow. It pops `true` whenever a
  /// mutation landed (a completed-with-adjustment posts a real ledger
  /// transaction), so the shell tabs reload like after a capture save.
  /// Demo never reaches here: the register hides the affordance when the
  /// seams are unset.
  Future<void> _openReconciliation(
    BuildContext context,
    AccountSummary account,
  ) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => AccountReconciliationPage(
          account: account,
          loadState: () => _store.loadReconciliationState(account.id),
          loadLedger: () => _store.loadAccountLedger(account.id),
          loadCategories: _store.loadCategories,
          actions: ReconciliationActions(
            start: ({required statementDate, required statementBalance}) =>
                _store
                    .startAccountReconciliation(
                      accountId: account.id,
                      statementDate: statementDate,
                      statementBalance: statementBalance,
                    )
                    .then((_) {}),
            setEntryState: ({required entryId, required state}) =>
                _store.setAccountEntryReconciliationState(
                  entryId: entryId,
                  state: state,
                ),
            complete:
                ({
                  required reconciliationId,
                  adjustmentCategoryId,
                  adjustmentPayee,
                }) => _store.completeAccountReconciliation(
                  reconciliationId: reconciliationId,
                  adjustmentCategoryId: adjustmentCategoryId,
                  adjustmentPayee: adjustmentPayee,
                ),
            reopen: _store.reopenAccountReconciliation,
          ),
        ),
      ),
    );
    if (changed == true) _reloadTabs();
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
          // "Tạo quy tắc" after an approve rides the same upsert RPC the
          // rules manager uses — a failed rule save lands its own honest
          // snackbar and can never masquerade as an approval failure.
          onSaveRule: (draft) => _store.saveInboxRule(
            ruleId: draft.id,
            expectedVersion: draft.expectedVersion,
            matchField: draft.matchField,
            containsText: draft.containsText,
            categoryId: draft.categoryId,
            merchantName: draft.merchantName,
            enabled: draft.enabled,
          ),
          // CSV import stays authenticated-only: the demo "Cần xem" menu
          // entry leaves these seams unset, which keeps the "Nhập CSV" /
          // "Dán tin nhắn" affordances hidden on that surface too.
          // "Dán tin nhắn" rides the same seam — pasted lines become
          // candidates through the prepare RPC, the only write path the
          // hosted backend accepts for this table.
          pickCsvFile: pickCsvFileFromDevice,
          onImportCsv: _store.prepareCsvImport,
          onOpenRules: () => _openRules(context),
        ),
      ),
    );
    if (changed == true) _reloadTabs();
  }

  /// Report drill-in — pushes the same fully-capable feed the tab hosts,
  /// scoped to a breakdown row's slice of the shown period. Edits and
  /// deletes inside it stay live; they're real ledger writes either way.
  Future<void> _openActivitySlice(
    BuildContext context,
    TransactionQuery query,
    String title,
  ) {
    return Navigator.of(context)
        .push(
          MaterialPageRoute(
            builder: (_) => ActivityPage(
              loadPage: _store.loadTransactionPage,
              loadAccounts: _store.loadAccounts,
              loadCategories: _store.loadCategories,
              onDelete: _deleteTransaction,
              onOpenTrash: () => _openTrash(context),
              onEdit: (tx) => _openEdit(context, tx),
              onBulkReview: (ids, {required reviewed}) async {
                await _store.setReviewStatusBulk(ids, reviewed: reviewed);
              },
              onBulkCategory: (ids, categoryId) async {
                await _store.setCategoryBulk(ids, categoryId);
                _planKey.currentState?.reload();
                _reportKey.currentState?.reload();
                _dashKey.currentState?.reload();
              },
              initialQuery: query,
              title: title,
            ),
          ),
        )
        .then((_) {});
  }

  /// "Quy tắc tự điền" — reachable from the review queue because rules are
  /// what prefill its candidates. Reads go through the same PostgREST
  /// selects the web workspace uses; every write rides the definer RPCs
  /// (direct table writes die 42501). Rule edits never touch the ledger,
  /// so no tab reload is needed on return.
  Future<void> _openRules(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => InboxRulesPage(
          loadRules: _store.loadInboxRules,
          // All categories incl. archived — a rule may still target a
          // hidden category and the list must render its name.
          loadCategories: _store.loadAllCategories,
          onSave: (draft) => _store.saveInboxRule(
            ruleId: draft.id,
            expectedVersion: draft.expectedVersion,
            matchField: draft.matchField,
            containsText: draft.containsText,
            categoryId: draft.categoryId,
            merchantName: draft.merchantName,
            enabled: draft.enabled,
          ),
          onDelete: _store.deleteInboxRule,
          onReorder: _store.reorderInboxRules,
        ),
      ),
    );
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
        // Read-only approved-ledger view — the timeline never mutates;
        // edits stay on Hoạt động like the web's /timeline contract.
        label: 'Dòng thời gian',
        icon: Icons.timeline,
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => TimelinePage(loadPage: _store.loadTransactionPage),
          ),
        ),
      ),
      DashboardMenuItem(
        // Opt-in bank-notification capture — the label is the real state:
        // OS grant AND app opt-in. "Tắt" can never overclaim activity.
        label: _notifCaptureOn
            ? 'Thu gom thông báo · đang bật ($_supportedSourceCount nguồn)'
            : 'Thu gom thông báo ngân hàng',
        icon: _notifCaptureOn
            ? Icons.mark_email_read_outlined
            : Icons.notification_add_outlined,
        onTap: () => _openNotificationCapture(context),
      ),
      DashboardMenuItem(
        label: 'Tài khoản',
        icon: Icons.account_balance_wallet,
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => AccountsPage(
              // All accounts incl. archived — the page's "Đã lưu trữ"
              // section keeps the archive reversible.
              loadAccounts: _store.loadAllAccounts,
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
              onOpen: (a) => _openAccountRegister(context, a),
              // Newest-first page ⇒ row 0 is the account's latest data
              // date; an empty page means the account has never seen a
              // transaction.
              latestActivityFor: (id) async {
                final page = await _store.loadTransactionPage(
                  TransactionQuery(accountId: id),
                );
                return page.rows.isEmpty ? null : page.rows.first.occurredOn;
              },
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
        label: 'Chính sách bảo mật',
        icon: Icons.privacy_tip_outlined,
        onTap: _openPrivacyPolicy,
      ),
      DashboardMenuItem(
        label: 'Xóa dữ liệu trên máy',
        icon: Icons.delete_sweep_outlined,
        onTap: () => _deleteLocalData(context),
      ),
      // Play-policy surface: permanent server-side deletion, styled
      // dangerous and kept adjacent to the local wipe so the two scopes
      // read as distinct choices.
      DashboardMenuItem(
        label: 'Xóa tài khoản',
        icon: Icons.person_remove_outlined,
        danger: true,
        onTap: () => _deleteAccount(context),
      ),
      DashboardMenuItem(
        label: 'Cài đặt',
        icon: Icons.settings_outlined,
        onTap: () => _openSettings(context),
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
          onCapture: _openDemoCapture,
          loadAccounts: () async => DemoStore.seedAccounts(),
          loadTransactions: () async => DemoStore.seedTransactions(),
          loadBudgets: (m) async => DemoStore.seedBudgets(m),
          loadCommitments: (_) async => DemoStore.seedCommitments(),
          // Detection runs on the same seeds; the seeds carry no monthly
          // pattern today, so the card simply stays absent — if a seed
          // ever qualifies, the create button repeats the read-only rule.
          loadSuggestionTransactions: (_, _) async =>
              (rows: DemoStore.seedTransactions(), truncated: false),
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
              // Same read-only approved view over seed data.
              label: 'Dòng thời gian',
              icon: Icons.timeline,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => TimelinePage(
                    loadPage: inMemoryPageLoader(DemoStore.seedTransactions()),
                  ),
                ),
              ),
            ),
            DashboardMenuItem(
              label: 'Tài khoản',
              icon: Icons.account_balance_wallet,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => AccountsPage(
                    loadAccounts: () async => DemoStore.seedAccounts(),
                    // Read-only register over the same seeds — no create,
                    // archive, edit or delete seams in demo.
                    latestActivityFor: (id) async {
                      final page = await inMemoryPageLoader(
                        DemoStore.seedTransactions(),
                      )(TransactionQuery(accountId: id));
                      return page.rows.isEmpty
                          ? null
                          : page.rows.first.occurredOn;
                    },
                    onOpen: (a) => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => AccountRegisterPage(
                          account: a,
                          loadPage: inMemoryPageLoader(
                            DemoStore.seedTransactions(),
                          ),
                          loadAccount: () async => _demoAccount(a.id),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            // Demo is read-only except categories: the manager is the
            // showcase surface for the one-tap pack, so writes land in
            // the session-scoped DemoCategoryStore — honest local data,
            // discarded when demo ends.
            DashboardMenuItem(
              label: 'Danh mục',
              icon: Icons.category,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => CategoriesPage(
                    loadCategories: _demoCategories.loadAll,
                    onSave: (draft) => _demoCategories
                        .save(
                          id: draft.id,
                          name: draft.name,
                          kind: draft.kind,
                          icon: draft.icon,
                          color: draft.color,
                        )
                        .then((_) {}),
                    onSetArchived: (id, archived) =>
                        _demoCategories.setArchived(id, archived).then((_) {}),
                    onDelete: _demoCategories.delete,
                  ),
                ),
              ),
            ),
            // Demo "Cần xem" — two seeded candidates run the real review
            // sheet and the rule-from-approve offer; writes stay in the
            // session-scoped stores, so leaving demo discards them.
            DashboardMenuItem(
              label: 'Cần xem',
              icon: Icons.inbox_outlined,
              badge: _demoInbox.pendingCount,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => InboxPage(
                    loadCandidates: _demoInbox.loadPending,
                    loadAccounts: () async => DemoStore.seedAccounts(),
                    loadCategories: _demoCategories.loadAll,
                    onPlan: _demoInbox.plan,
                    onApprove: _demoInbox.approve,
                    onReject: _demoInbox.reject,
                    onSaveRule: (draft) => _demoRules.save(draft).then((_) {}),
                    onOpenRules: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => InboxRulesPage(
                          loadRules: _demoRules.loadAll,
                          loadCategories: _demoCategories.loadAll,
                          onSave: _demoRules.save,
                          onDelete: _demoRules.delete,
                          onReorder: _demoRules.reorder,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            // Rules are also reachable from inside "Cần xem"; the menu
            // entry stays so the manager is discoverable on its own.
            DashboardMenuItem(
              label: 'Quy tắc',
              icon: Icons.rule_outlined,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => InboxRulesPage(
                    loadRules: _demoRules.loadAll,
                    loadCategories: _demoCategories.loadAll,
                    onSave: _demoRules.save,
                    onDelete: _demoRules.delete,
                    onReorder: _demoRules.reorder,
                  ),
                ),
              ),
            ),
            // Play requires the privacy policy reachable in-app; demo
            // mode is still in-app, so the link stays on this menu too.
            DashboardMenuItem(
              label: 'Chính sách bảo mật',
              icon: Icons.privacy_tip_outlined,
              onTap: _openPrivacyPolicy,
            ),
            DashboardMenuItem(
              label: 'Xóa dữ liệu demo',
              icon: Icons.delete_forever,
              onTap: () => _deleteDemoData(context),
            ),
            DashboardMenuItem(
              label: 'Cài đặt',
              icon: Icons.settings_outlined,
              onTap: () => _openSettings(context),
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
          // Session demo store — pack additions filter transactions too.
          loadCategories: () async => _demoCategories.active,
          onDelete: (_) async {},
          // Demo capture is read-only but real — the empty feed's CTA
          // lands on the same honest form as the nav button.
          onCapture: _openDemoCapture,
        ),
        () => PlanningPage(
          loadData: (budgetMonth) async => PlanningData(
            // A future viewed month is a PLAN — spend reads zero rather
            // than re-showing this month's figures under next month's
            // label.
            budgets: DemoStore.seedBudgets(
              budgetMonth,
              planned: budgetMonth.compareTo(monthStart()) > 0,
            ),
            priorBudgets: DemoStore.seedPriorBudgets(budgetMonth),
            // One list feeds both consumers: budgetSuggestions takes the
            // expense rows, averageMonthlyIncome the income rows —
            // kind-filtered inside each, like the real range read.
            budgetSuggestionRows: [
              ...DemoStore.seedBudgetSuggestionRows(monthStart()),
              ...DemoStore.seedIncomeBasisRows(monthStart()),
            ],
            commitments: DemoStore.seedCommitments(),
            goals: DemoStore.seedGoals(),
            accounts: DemoStore.seedAccounts(),
            categories: _demoCategories.active,
            monthStart: monthStart(),
            budgetMonth: budgetMonth,
          ),
          actions: _noopPlanningActions,
        ),
        () => ReportsPage(
          loadTransactions: () async => DemoStore.seedTransactions(),
          // Demo net worth: seeded balances + the same in-memory feed —
          // the window filter drops anything older than six months.
          loadAccounts: () async => DemoStore.seedAccounts(),
          // Drill-in runs against the same in-memory feed the demo tab
          // uses — read-only rows, identical filter semantics.
          onOpenActivity: (q, title) => Navigator.of(context)
              .push(
                MaterialPageRoute(
                  builder: (_) => ActivityPage(
                    loadPage: inMemoryPageLoader(DemoStore.seedTransactions()),
                    loadAccounts: () async => DemoStore.seedAccounts(),
                    loadCategories: () async => _demoCategories.active,
                    onDelete: (_) async {},
                    initialQuery: q,
                    title: title,
                  ),
                ),
              )
              .then((_) {}),
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

  /// Demo register anchor — seeds are constant, but the reload seam stays
  /// identical to the signed-in path.
  static AccountSummary? _demoAccount(String id) {
    for (final a in DemoStore.seedAccounts()) {
      if (a.id == id) return a;
    }
    return null;
  }

  static final _noopPlanningActions = PlanningActions(
    onBudgetSave: (_, _, _, _) async {},
    onBudgetDelete: (_) async {},
    // The cover sheet stays reachable in demo (donor list, preview,
    // confirm), but the write pair reports read-only instead of lying
    // "Đã bù" over unchanged rows.
    onCoverOverspend: (_, _, _) async => throw const DemoReadOnly(),
    onCommitmentSave: (_, _, _, _, _, _, _) async {},
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
  /// inside the scheduler). [budgetMonth] is the month the budgets
  /// section is viewing (this month or next); commitments, income
  /// receipts and the funding basis stay anchored on the real current
  /// month.
  Future<PlanningData> _loadPlanning(String budgetMonth) async {
    final monthStart = _monthStart();
    // Same window the web workspace reads, anchored on the VIEWED month:
    // rollover history inside [windowStart, budgetMonth] from
    // budget_progress. For the month-ahead view the current month is
    // itself a "prior" row — its spend feeds next month's carry figures.
    final windowStart = budgetRolloverWindowStart(budgetMonth);
    // The suggestion/income basis always resolves against the CURRENT
    // month — "trung bình 3 tháng" means three completed months
    // whichever budget month is on screen.
    final suggestionStart = shiftBudgetMonth(
      monthStart,
      -budgetSuggestionMonths,
    );
    final results = await Future.wait([
      _store.loadBudgetsInRange(windowStart, budgetMonth),
      _store.loadCommitments(monthStart),
      _store.loadGoals(),
      _store.loadAccounts(),
      _store.loadCategories(),
      _store.loadIncomeTemplates(monthStart),
      _store.loadTransactionsInRange(suggestionStart, monthStart),
    ]);
    unawaited(
      NotificationService.scheduleCommitmentReminders(
        results[1] as List<RecurringCommitment>,
      ).catchError((_) {}),
    );
    final budgetRows = results[0] as List<BudgetProgress>;
    return PlanningData(
      budgets: budgetRows.where((b) => b.monthStart == budgetMonth).toList(),
      priorBudgets: budgetRows
          .where((b) => b.monthStart.compareTo(budgetMonth) < 0)
          .toList(),
      commitments: results[1] as List<RecurringCommitment>,
      goals: results[2] as List<SavingsGoal>,
      accounts: results[3] as List<AccountSummary>,
      categories: results[4] as List<Category>,
      incomeTemplates: results[5] as List<RecurringIncome>,
      monthStart: monthStart,
      budgetMonth: budgetMonth,
      // A truncated tail only narrows what the average sees — the sheet
      // proposes less, never invents rows.
      budgetSuggestionRows:
          (results[6] as ({List<Transaction> rows, bool truncated})).rows,
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
    // A create lands on the viewed budget month (the page passes
    // budgetMonth) — planning ahead writes next month, never this one.
    onBudgetSave: (editing, categoryId, limit, monthStart) => _store
        .upsertBudget(
          categoryId: categoryId,
          monthStart: editing?.monthStart ?? monthStart,
          limitMinor: limit,
          expectedUpdatedAt: editing?.updatedAt,
        )
        .then((_) {}),
    onBudgetDelete: _store.deleteBudget,
    // Bulk fill reuses the same RPC a manual save does — per-row upserts,
    // counted honestly so a partial apply reports what landed.
    onBudgetFill: (drafts) async {
      var applied = 0;
      for (final d in drafts) {
        try {
          await _store.upsertBudget(
            categoryId: d.categoryId,
            monthStart: d.monthStart,
            limitMinor: d.limitMinor,
          );
          applied++;
        } catch (_) {
          // One failed row does not abort the rest — the caller reports
          // the partial count and the refresh re-reads the ledger.
        }
      }
      return applied;
    },
    // YNAB Rule 3 — two upserts through the same RPC a manual save uses,
    // donor −X then overspent +X. A failure AFTER the donor write lands
    // throws cover_partial: the donor limit really did move, and the
    // page says so instead of reporting "không bù được".
    onCoverOverspend: (donor, overspent, amount) async {
      await _store.upsertBudget(
        categoryId: donor.categoryId,
        monthStart: donor.monthStart,
        limitMinor: donor.limitMinor - amount,
        expectedUpdatedAt: donor.updatedAt,
      );
      try {
        await _store.upsertBudget(
          categoryId: overspent.categoryId,
          monthStart: overspent.monthStart,
          limitMinor: overspent.limitMinor + amount,
          expectedUpdatedAt: overspent.updatedAt,
        );
      } catch (e) {
        // The tag the page recognises: half the pair landed — re-read
        // and say so, never pretend nothing happened.
        throw Exception('cover_partial: $e');
      }
    },
    onCommitmentSave:
        (editing, name, amount, day, accountId, categoryId, interval) => _store
            .upsertCommitment(
              commitmentId: editing?.id,
              name: name,
              amountMinor: amount,
              dueDay: day,
              accountId: accountId,
              categoryId: categoryId,
              intervalMonths: interval,
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
  const _CaptureLoader({
    required this.store,
    required this.submit,
    this.onCreateAccount,
    this.initialKind,
  });

  final TransactionKind? initialKind;

  final RealStore store;
  final Future<void> Function(CaptureIntent intent) submit;
  final Future<List<AccountSummary>?> Function()? onCreateAccount;

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
          initialKind: initialKind,
          accounts: snap.data![0].cast(),
          categories: snap.data![1].cast(),
          transactions: snap.data![2].cast(),
          onSubmit: submit,
          onCreateAccount: onCreateAccount,
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
    this.onCreateAccount,
  });

  final RealStore store;
  final SharedTextPrefill prefill;
  final Future<void> Function(CaptureIntent intent) submit;
  final Future<List<AccountSummary>?> Function()? onCreateAccount;

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
          onCreateAccount: onCreateAccount,
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
