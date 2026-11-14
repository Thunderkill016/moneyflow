import 'package:flutter/material.dart';

/// Design tokens for the Obsidian & Midnight Glass Fintech / Neobank palette.
class FintechColors {
  const FintechColors._();

  static const Color canvas = Color(0xFF080B14);
  static const Color surface = Color(0xFF111625);
  static const Color surfaceElevated = Color(0xFF182036);
  static const Color surfaceGlass = Color(0xE6121829);
  static const Color border = Color(0xFF232E4B);
  static const Color borderSubtle = Color(0xFF1A2238);

  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);

  static const Color indigo = Color(0xFF6366F1);
  static const Color indigoBright = Color(0xFF818CF8);
  static const Color cyan = Color(0xFF06B6D4);
  static const Color emerald = Color(0xFF10B981);
  static const Color coral = Color(0xFFF43F5E);
  static const Color amber = Color(0xFFF59E0B);
  static const Color violet = Color(0xFF8B5CF6);
  static const Color sky = Color(0xFF38BDF8);
}

BoxDecoration bentoDecoration({
  Color? fill,
  Color? borderColor,
  double radius = 22,
  List<BoxShadow>? shadows,
}) {
  return BoxDecoration(
    color: fill ?? FintechColors.surface,
    borderRadius: BorderRadius.circular(radius),
    border: Border.all(
      color: borderColor ?? FintechColors.borderSubtle,
      width: 1,
    ),
    boxShadow: shadows,
  );
}

BoxDecoration heroMeshDecoration({double radius = 26}) {
  return BoxDecoration(
    borderRadius: BorderRadius.circular(radius),
    gradient: const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        Color(0xFF282B78),
        Color(0xFF161C3A),
        Color(0xFF0F2538),
      ],
      stops: [0.0, 0.56, 1.0],
    ),
    border: Border.all(
      color: Color(0x52818CF8),
      width: 1,
    ),
    boxShadow: const [
      BoxShadow(
        color: Color(0x4D3730A3),
        blurRadius: 28,
        offset: Offset(0, 12),
      ),
    ],
  );
}

TextStyle tabularStyle(TextStyle base) {
  return base.copyWith(
    fontFeatures: const [FontFeature.tabularFigures()],
  );
}

ThemeData buildFintechTheme() {
  const colorScheme = ColorScheme.dark(
    brightness: Brightness.dark,
    primary: FintechColors.indigoBright,
    onPrimary: FintechColors.textPrimary,
    secondary: FintechColors.cyan,
    onSecondary: FintechColors.canvas,
    surface: FintechColors.surface,
    onSurface: FintechColors.textPrimary,
    error: FintechColors.coral,
    onError: FintechColors.textPrimary,
    outline: FintechColors.border,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: FintechColors.canvas,
    splashColor: FintechColors.indigo.withValues(alpha: 0.14),
    highlightColor: Colors.transparent,
    cardColor: FintechColors.surface,
    dividerColor: FintechColors.borderSubtle,
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      foregroundColor: FintechColors.textPrimary,
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: FintechColors.surface,
      modalBackgroundColor: FintechColors.surface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: FintechColors.surfaceElevated,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: FintechColors.border),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: FintechColors.surfaceElevated,
      contentTextStyle: const TextStyle(
        color: FintechColors.textPrimary,
        fontWeight: FontWeight.w500,
      ),
      behavior: SnackBarBehavior.floating,
      insetPadding: const EdgeInsets.fromLTRB(16, 0, 16, 88),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: FintechColors.border),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: FintechColors.surfaceElevated,
      hintStyle: const TextStyle(color: FintechColors.textMuted),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: FintechColors.borderSubtle),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: FintechColors.borderSubtle),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: FintechColors.indigoBright, width: 1.4),
      ),
    ),
  );
}
