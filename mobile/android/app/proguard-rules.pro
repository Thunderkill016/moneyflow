# Flutter embedding + engine surface. The Flutter AAR ships consumer
# rules, but an explicit keep documents the intent and covers embedder
# code reached reflectively from Dart platform channels.
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# flutter_local_notifications serializes scheduled-notification details
# with Gson; R8 must not rename the model classes or deserialization
# breaks on reboot/reschedule.
-keep class com.dexterous.** { *; }

# Plugin models reconstructed via reflection/Gson-style deserialization.
-keep class * extends com.google.gson.TypeAdapter { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# The Flutter engine references Play Core's deferred-component API
# (PlayStoreDeferredComponentManager / FlutterPlayStoreSplitApplication)
# but the Play Core library is not packaged — deferred components are
# unused here. These dontwarn rules are the R8 output's own
# missing_rules.txt recommendations for that dead linkage.
-dontwarn com.google.android.play.core.**
