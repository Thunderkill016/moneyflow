// Home-screen widget feed — the last-known dashboard figures, written on
// every successful dashboard load alongside the offline snapshot. The
// Android provider (QuickCaptureWidgetProvider) reads the same value out
// of the FlutterSharedPreferences file, where shared_preferences stores
// this key as "flutter.mf_widget_snapshot", and renders it under an
// explicit "cập nhật lúc" label — last-known data only. The widget never
// fetches, so a wiped, absent or >24h-old value renders an honest "—".

import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// The figures the home-screen widget mirrors — integer đồng like the
/// ledger. [safeSpendVnd] is null when the month has no budget or the
/// planning read failed (the widget shows "—", matching the dashboard's
/// hidden-tile honesty). [savedAtMs] is the load's wall-clock time, the
/// same moment the offline snapshot carries.
class WidgetSnapshot {
  const WidgetSnapshot({
    required this.totalVnd,
    required this.savedAtMs,
    this.safeSpendVnd,
  });

  final int totalVnd;
  final int? safeSpendVnd;
  final int savedAtMs;

  /// Field names are the Kotlin contract — WidgetSnapshotContract.parse
  /// reads exactly these keys.
  Map<String, Object?> toJson() => {
    'total': totalVnd,
    'safeSpend': safeSpendVnd,
    'savedAtMs': savedAtMs,
  };
}

/// SharedPreferences-backed writer for [WidgetSnapshot]. One shared
/// value, no account scoping: it is session state (a signed-in user's
/// balance must never reach the next account's widget), so
/// signOutResidueKeys names the key explicitly and wipeLocalData's `mf_`
/// prefix sweep covers the destructive path.
class WidgetSnapshotStore {
  const WidgetSnapshotStore(this._prefs);

  final SharedPreferences _prefs;

  /// `mf_` prefix keeps the key inside the wipeLocalData contract.
  static const key = 'mf_widget_snapshot';

  static const _channel = MethodChannel('app.moneyflow/widget');

  /// Persists the figures, then asks the provider to re-render now —
  /// updatePeriodMillis is 0, so without the push the widget would sit
  /// on the previous value until the system felt like updating.
  Future<void> save(WidgetSnapshot snap) async {
    await _prefs.setString(key, jsonEncode(snap.toJson()));
    await refresh();
  }

  /// Best-effort provider nudge. A missing channel (tests, iOS, desktop)
  /// is not a failure — the stored value still stands for the next
  /// system update pass; a channel error changes nothing the caller
  /// could act on.
  static Future<void> refresh() async {
    try {
      await _channel.invokeMethod<void>('refresh');
    } on Object {
      /* no widget host on this platform — nothing to refresh */
    }
  }
}
