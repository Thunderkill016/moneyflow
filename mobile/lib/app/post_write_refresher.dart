import 'dart:async';

/// Neon Data API read-after-write lag (see the migration packet's Known
/// behavior): a refetch issued immediately after a mutation can be
/// served a pre-write snapshot by a lagging read replica. Running the
/// refresh once now and once more after [delay] converges the UI to the
/// committed state without optimistic-update bookkeeping — which would
/// have to be honest about a write that actually failed and is the
/// larger defect surface.
class PostWriteRefresher {
  PostWriteRefresher({this.delay = const Duration(seconds: 3)});

  /// How long to wait before the follow-up refresh. Three seconds covers
  /// the observed replica-lag window cheaply; a longer tail still
  /// resolves on the user's next visit or pull-to-refresh.
  final Duration delay;

  Timer? _timer;
  bool _disposed = false;

  /// Refresh immediately, then schedule exactly one more pass. A new
  /// [call] before the pending pass fires reschedules it, so a burst of
  /// saves only pays for one extra fetch wave.
  void call(void Function() refresh) {
    if (_disposed) return;
    refresh();
    _timer?.cancel();
    _timer = Timer(delay, () {
      if (!_disposed) refresh();
    });
  }

  void dispose() {
    _disposed = true;
    _timer?.cancel();
  }
}
