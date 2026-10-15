import 'package:flutter/material.dart';

import '../../theme/brand_mark.dart';
import '../../theme/mf_theme.dart';

/// Shared auth-screen chrome — logo lockup, title, description, then the
/// form [children]. Login, register and forgot-password keep identical
/// structure so moving between them never re-teaches the layout. The
/// ListView stays shrink-wrapped and centered for 200% text scale.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({
    super.key,
    required this.title,
    required this.description,
    required this.children,
  });

  final String title;
  final String description;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 380),
            child: ListView(
              shrinkWrap: true,
              padding: const EdgeInsets.all(24),
              children: [
                const Center(child: BrandMark(size: 56)),
                const SizedBox(height: 16),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  description,
                  textAlign: TextAlign.center,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: context.mf.textMuted),
                ),
                const SizedBox(height: 28),
                ...children,
              ],
            ),
          ),
        ),
      ),
    );
  }
}
