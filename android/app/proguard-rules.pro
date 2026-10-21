# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# ─── React Native Camera - MLKit opcional ────────────────────
-dontwarn com.google.mlkit.**
-dontwarn org.reactnative.camera.**

# ─── Stripe Push Provisioning ────────────────────────────────
-dontwarn com.stripe.android.pushProvisioning.**
-dontwarn com.reactnativestripesdk.pushprovisioning.**

# ─── React Native Core ───────────────────────────────────────
# Necesario por el crash que apareció con R8:
# ClassNotFoundException:
# com.facebook.react.devsupport.CxxInspectorPackagerConnection
-keep class com.facebook.react.devsupport.** { *; }

# ─── React Native JNI ────────────────────────────────────────
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.jni.**

# ─── OneSignal ───────────────────────────────────────────────
-keep class com.onesignal.** { *; }
-dontwarn com.onesignal.**

# ─── AsyncStorage ────────────────────────────────────────────
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ─── react-native-config (.env) ──────────────────────────────
-keep class com.lugg.RNCConfig.** { *; }
# Mantener BuildConfig porque react-native-config
# lo obtiene mediante reflexión.
-keep class com.tabtrack.BuildConfig { *; }

# ─── react-native-linear-gradient ────────────────────────────
-keep class com.BV.LinearGradient.** { *; }

# ─── react-native-vector-icons ───────────────────────────────
-keep class com.oblador.vectoricons.** { *; }

# ─── react-native-safe-area-context ──────────────────────────
-keep class com.th3rdwave.safeareacontext.** { *; }

# ─── react-native-screens ────────────────────────────────────
-keep class com.swmansion.rnscreens.** { *; }

# ─── react-native-gesture-handler ────────────────────────────
-keep class com.swmansion.gesturehandler.** { *; }

# ─── react-navigation / Reanimated ───────────────────────────
-keep class com.swmansion.reanimated.** { *; }
-dontwarn com.swmansion.reanimated.**

# ─── PayPal Fraud Protection ─────────────────────────────────
-keep class com.paypal.** { *; }
-dontwarn com.paypal.**

# ─── ML Kit Barcode ──────────────────────────────────────────
-keep class com.google.mlkit.vision.barcode.** { *; }

# ─── Multidex ────────────────────────────────────────────────
-keep class androidx.multidex.** { *; }

# ─── Clases anotadas con @Keep ───────────────────────────────
-keep @androidx.annotation.Keep class * { *; }
-keepclassmembers class * {
    @androidx.annotation.Keep *;
}

# ─── Serialización / Modelos de datos ────────────────────────
# Evita que R8 elimine getters/setters usados por JSON
-keepclassmembers class * {
    public <init>();
    public <fields>;
}

# ─── Enums ───────────────────────────────────────────────────
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}