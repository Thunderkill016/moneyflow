package app.moneyflow.moneyflow

import android.content.Intent
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
        intent?.getStringExtra(EXTRA_QUICK_ACTION)?.takeIf { it.isNotBlank() }

    companion object {
        // Carries the one-tap action from the static shortcut and the
        // widget's PendingIntent; Dart maps the value to a route.
        const val EXTRA_QUICK_ACTION = "quick"
        const val QUICK_ACTION_CAPTURE = "capture"
    }
}
