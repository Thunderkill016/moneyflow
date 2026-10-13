import 'package:flutter/material.dart';

/// One honest empty-state card — icon, title, a one-line explanation of
/// what fills the space, and an optional action. Replaces the bare
/// "Chưa có …" ListTile pattern so an empty surface always says what it
/// is for; a surface with no meaningful action (e.g. an empty review
/// inbox) simply omits the button instead of inventing one.
class EmptyStateCard extends StatelessWidget {
  const EmptyStateCard({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String? message;

  /// Shown only when [onAction] is set — a label with no handler would
  /// be a dead affordance, so the button never renders without one.
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 18, color: scheme.onSurfaceVariant),
                const SizedBox(width: 8),
                Expanded(child: Text(title, style: text.titleSmall)),
              ],
            ),
            if (message != null) ...[
              const SizedBox(height: 4),
              Text(
                message!,
                style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 8),
              FilledButton.tonal(
                onPressed: onAction,
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
