package app.moneyflow.moneyflow

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel

/**
 * Forwards two kinds of entry intents to Dart:
 *
 *  - ACTION_SEND text shares: cold start via
 *    MethodChannel("app.moneyflow/share_text").consumeSharedText(), warm
 *    shares via EventChannel("app.moneyflow/share_stream").
 *  - [EXTRA_QUICK_ACTION] extras from the launcher shortcut / home-screen
 *    widget: cold start via consumeQuickAction(), warm taps via
 *    EventChannel("app.moneyflow/quick_action_stream").
 *
 * FlutterFragmentActivity (not FlutterActivity) — local_auth's
 * BiometricPrompt needs a FragmentActivity host.
 */
class MainActivity : FlutterFragmentActivity() {
    private var pendingShare: String? = null
    private var shareSink: EventChannel.EventSink? = null
    private var pendingQuickAction: String? = null
    private var quickActionSink: EventChannel.EventSink? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        sharedText(intent)?.let { pendingShare = it }
        quickAction(intent)?.let { pendingQuickAction = it }

        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "app.moneyflow/share_text",
        ).setMethodCallHandler { call, result ->
            if (call.method == "consumeSharedText") {
                result.success(pendingShare)
                pendingShare = null
            } else {
                result.notImplemented()
            }
        }

        EventChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "app.moneyflow/share_stream",
        ).setStreamHandler(
            object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
                    shareSink = events
                }

                override fun onCancel(arguments: Any?) {
                    shareSink = null
                }
            },
        )

        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "app.moneyflow/quick_action",
        ).setMethodCallHandler { call, result ->
            if (call.method == "consumeQuickAction") {
                result.success(pendingQuickAction)
                pendingQuickAction = null
            } else {
                result.notImplemented()
            }
        }

        EventChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "app.moneyflow/quick_action_stream",
        ).setStreamHandler(
            object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
                    quickActionSink = events
                }

                override fun onCancel(arguments: Any?) {
                    quickActionSink = null
                }
            },
        )

        // The home-screen widget's refresh nudge: the Dart side invokes
        // this right after writing mf_widget_snapshot so the launcher
        // tile re-reads the new figures immediately (updatePeriodMillis
        // is 0 — without the push the widget would keep stale figures).
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "app.moneyflow/widget",
        ).setMethodCallHandler { call, result ->
            if (call.method == "refresh") {
                QuickCaptureWidgetProvider.requestRefresh(this@MainActivity)
                result.success(true)
            } else {
                result.notImplemented()
            }
        }

        // Bank-notification capture pilot: the service has no engine of its
        // own, so the stream forwards live events through a shared sink and
        // the method channel answers permission state + drains the queue that
        // parks events while Dart is detached.
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "app.moneyflow/notification_capture",
        ).setMethodCallHandler { call, result ->
            when (call.method) {
                "isAccessEnabled" ->
                    result.success(isNotificationAccessEnabled())
                "openAccessSettings" ->
                    result.success(openNotificationAccessSettings())
                "consumePendingCaptures" ->
                    result.success(NotificationCaptureBridge.consumePending(this))
                "clearPendingCaptures" -> {
                    NotificationCaptureBridge.clearPending(this)
                    result.success(true)
                }
                "supportedSources" ->
                    result.success(BankNotificationSources.byPackage.values.toList())
                else -> result.notImplemented()
            }
        }

        EventChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "app.moneyflow/notification_capture_stream",
        ).setStreamHandler(
            object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
                    NotificationCaptureBridge.sink = events
                }

                override fun onCancel(arguments: Any?) {
                    NotificationCaptureBridge.sink = null
                }
            },
        )
    }

    /**
     * True only when the user granted this app Notification Access in system
     * settings — the OS-level switch. There is no runtime prompt for it; the
     * enabled-listeners string is the only honest signal. Both flatten forms
     * are matched because OEM builds differ on which they persist.
     */
    private fun isNotificationAccessEnabled(): Boolean {
        val enabled =
            Settings.Secure.getString(
                contentResolver,
                "enabled_notification_listeners",
            ) ?: return false
        val component = ComponentName(this, NotificationCaptureService::class.java)
        val flat = component.flattenToString()
        val flatShort = component.flattenToShortString()
        return enabled.split(':').any { it == flat || it == flatShort }
    }

    /** Opens the system Notification Access screen. Returns false when the
     *  device exposes no handler — the caller then shows an honest notice
     *  instead of a dead end. */
    private fun openNotificationAccessSettings(): Boolean =
        try {
            startActivity(
                Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
            true
        } catch (e: Exception) {
            false
        }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        sharedText(intent)?.let { shareSink?.success(it) ?: run { pendingShare = it } }
        // A tap can land while Dart is still attaching its listener — the
        // pending slot is consumed once Dart asks, so it is never dropped.
        quickAction(intent)?.let {
            quickActionSink?.success(it) ?: run { pendingQuickAction = it }
        }
    }

    private fun sharedText(intent: Intent?): String? =
        if (intent?.action == Intent.ACTION_SEND && intent.type == "text/plain") {
            intent.getStringExtra(Intent.EXTRA_TEXT)
        } else {
            null
        }

    private fun quickAction(intent: Intent?): String? =
        // The activity is exported, so the extra is attacker-controllable —
        // only allowlisted actions cross into Dart.
        QuickActionContract.sanitize(intent?.getStringExtra(EXTRA_QUICK_ACTION))

    companion object {
        // Carries the one-tap action from the static shortcut and the
        // widget's PendingIntent; Dart maps the value to a route.
        // The accepted-value set lives in QuickActionContract.
        const val EXTRA_QUICK_ACTION = QuickActionContract.EXTRA_QUICK_ACTION
        const val QUICK_ACTION_CAPTURE = QuickActionContract.ACTION_CAPTURE
    }
}
