package app.moneyflow.moneyflow

/**
 * The `quick` intent-extra contract on the Kotlin side: which extra name
 * carries the action and which values are allowed to reach Dart.
 *
 * SINGLE SOURCE OF TRUTH — Dart mirrors the accepted values in
 * lib/data/quick_action.dart (kQuickActionCapture) and
 * _AuthGateState._onQuickAction; the static shortcut
 * (res/xml/shortcuts.xml) and the widget provider send the literal
 * string. A new action must be added here AND on the Dart side.
 *
 * Kept free of android.* imports so the allowlist is pure-JVM testable.
 */
object QuickActionContract {
    /** Intent extra name read by MainActivity. */
    const val EXTRA_QUICK_ACTION = "quick"

    /** "Open the capture form" — the only action that exists today. */
    const val ACTION_CAPTURE = "capture"

    private val ALLOWED_ACTIONS = setOf(ACTION_CAPTURE)

    /**
     * Returns [raw] only when it is a known action, else null.
     *
     * MainActivity is exported (it is the launcher), so any installed app
     * can send an explicit intent carrying this extra — unknown values
     * are dropped at the boundary rather than forwarded to Dart.
     */
    fun sanitize(raw: String?): String? = raw?.takeIf { it in ALLOWED_ACTIONS }
}
