import 'package:flutter/material.dart';

import '../../data/offline_queue.dart';

/// Persistent strip shown while capture intents wait for connectivity.
/// Dismissible-resistant by design: it only leaves when the queue is
/// actually drained (or wiped) — a held write can never be swiped away
/// and forgotten. It reads [OfflineCaptureQueue] as a listenable, so it
/// updates the moment a replay lands or a new intent is held.
class QueuedCapturesBanner extends StatelessWidget {
  const QueuedCapturesBanner({
    super.key,
    required this.queue,
    required this.onRetry,
  });

  final OfflineCaptureQueue queue;

  /// Manual replay trigger — runs the same drain as app start.
  final VoidCallback onRetry;

  static String _hhmm(int epochMs) {
    final t = DateTime.fromMillisecondsSinceEpoch(epochMs);
    final hh = t.hour.toString().padLeft(2, '0');
    final mm = t.minute.toString().padLeft(2, '0');
    return '$hh:$mm';
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: queue,
      builder: (context, _) {
        final count = queue.pendingCount;
        if (count == 0) return const SizedBox.shrink();
        final scheme = Theme.of(context).colorScheme;
        final text = Theme.of(context).textTheme;
        final last = queue.lastAttemptAtMs;
        final hint = queue.draining
            ? 'Đang gửi lại…'
            : last == null
            ? 'Sẽ gửi lại khi có mạng'
            : 'Thử lại lúc ${_hhmm(last)}';
        // secondaryContainer keeps this distinct from the dashboard's
        // errorContainer stale-data banner — pending is not an error.
        return Material(
          color: scheme.secondaryContainer,
          child: Padding(
            padding: const EdgeInsets.only(left: 16, right: 4),
            child: Row(
              children: [
                Icon(
                  Icons.cloud_upload_outlined,
                  size: 20,
                  color: scheme.onSecondaryContainer,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '$count khoản chờ gửi',
                          style: text.titleSmall?.copyWith(
                            color: scheme.onSecondaryContainer,
                          ),
                        ),
                        Text(
                          hint,
                          style: text.bodySmall?.copyWith(
                            color: scheme.onSecondaryContainer,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                TextButton(
                  onPressed: queue.draining ? null : onRetry,
                  child: const Text('Gửi lại'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
