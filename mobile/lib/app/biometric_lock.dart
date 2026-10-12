import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists the biometric app-lock toggle (settings screen owns the switch).
/// Off by default — unlocking is opt-in.
class BiometricPrefs {
  static const _key = 'mf_biometric_enabled';

  static Future<bool> loadBiometricEnabled() async =>
      (await SharedPreferences.getInstance()).getBool(_key) ?? false;

  static Future<void> saveBiometricEnabled(bool enabled) async =>
      (await SharedPreferences.getInstance()).setBool(_key, enabled);
}

/// Auth adapter — the real impl wraps local_auth; tests inject a fake.
abstract class BiometricService {
  Future<bool> isAvailable();
  Future<bool> authenticate({required String reason});
}

/// Device-backed biometric/PIN auth via package:local_auth.
class DeviceBiometricService implements BiometricService {
  DeviceBiometricService({LocalAuthentication? localAuth})
    : _auth = localAuth ?? LocalAuthentication();

  final LocalAuthentication _auth;

  /// True when the device can do biometric or device-credential auth.
  /// Plugin errors report as unavailable — the gate fails open on them.
  @override
  Future<bool> isAvailable() async {
    try {
      return await _auth.canCheckBiometrics || await _auth.isDeviceSupported();
    } catch (_) {
      return false;
    }
  }

  @override
  Future<bool> authenticate({required String reason}) => _auth.authenticate(
    localizedReason: reason,
    // Resume the system prompt after backgrounding instead of failing the
    // attempt — users often switch away mid-unlock.
    persistAcrossBackgrounding: true,
  );
}

/// Gate widget — wraps [child], requiring biometric unlock when enabled.
///
/// Fail-open policy: `enabled=false` or unavailable hardware shows [child]
/// immediately — locking a user out of their finance data on a device without
/// biometrics is worse than no lock.
class BiometricGate extends StatefulWidget {
  const BiometricGate({
    super.key,
    required this.child,
    required this.service,
    this.enabled = true,
  });

  final Widget child;
  final BiometricService service;
  final bool enabled;

  @override
  State<BiometricGate> createState() => _BiometricGateState();
}

enum _LockPhase { checking, locked, unlocked }

class _BiometricGateState extends State<BiometricGate> {
  _LockPhase _phase = _LockPhase.checking;

  /// True while a system auth prompt is in flight — blocks double-taps.
  bool _authenticating = false;

  /// True after a failed/cancelled attempt — switches the button to retry.
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    if (widget.enabled) _probe();
  }

  @override
  void didUpdateWidget(BiometricGate oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Toggling the setting on at runtime locks immediately instead of
    // waiting for the next cold start.
    if (widget.enabled && !oldWidget.enabled) _probe();
  }

  Future<void> _probe() async {
    bool available;
    try {
      available = await widget.service.isAvailable();
    } catch (_) {
      // Adapter blew up (missing plugin, etc.) — fail open like unavailable.
      available = false;
    }
    if (!mounted) return;
    if (!available) {
      setState(() => _phase = _LockPhase.unlocked);
      return;
    }
    setState(() => _phase = _LockPhase.locked);
    // Auto-prompt on the lock screen's first frame — the user shouldn't have
    // to tap before the system biometric sheet appears.
    WidgetsBinding.instance.addPostFrameCallback((_) => _attemptAuth());
  }

  Future<void> _attemptAuth() async {
    if (_authenticating || _phase != _LockPhase.locked) return;
    setState(() => _authenticating = true);
    bool ok;
    try {
      ok = await widget.service.authenticate(reason: 'Mở khóa MoneyFlow');
    } catch (_) {
      // Cancelled/erroring prompts keep the gate locked, same as `false`.
      ok = false;
    }
    if (!mounted) return;
    setState(() {
      _authenticating = false;
      if (ok) {
        _phase = _LockPhase.unlocked;
      } else {
        _failed = true;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled || _phase == _LockPhase.unlocked) return widget.child;

    return switch (_phase) {
      _LockPhase.checking => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      _LockPhase.locked => _lockScreen(context),
      _LockPhase.unlocked => widget.child,
    };
  }

  Widget _lockScreen(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.lock_outline,
                size: 64,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(height: 16),
              Text('Mở khóa MoneyFlow', style: theme.textTheme.headlineSmall),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: _authenticating ? null : _attemptAuth,
                icon: const Icon(Icons.fingerprint),
                label: Text(_failed ? 'Mở lại' : 'Mở khóa'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
