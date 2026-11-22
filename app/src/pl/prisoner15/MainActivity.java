package pl.prisoner15;

import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import java.util.Locale;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

/** One screen: a WebView with the interface, plus the proximity sensor, cues and the reminder. */
public class MainActivity extends Activity implements SensorEventListener {
    private WebView web;
    private SensorManager sensors;
    private Sensor prox;
    private boolean listening, near;
    private ToneGenerator tone;
    private Vibrator vib;
    private TextToSpeech tts;
    private volatile boolean ttsOk;
    private AudioManager am;
    private AudioFocusRequest focus;
    private final Handler h = new Handler(Looper.getMainLooper());
    private final Runnable letGo = () -> { if (am != null && focus != null) am.abandonAudioFocusRequest(focus); };

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        sensors = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        prox = sensors.getDefaultSensor(Sensor.TYPE_PROXIMITY);
        vib = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        try { tone = new ToneGenerator(AudioManager.STREAM_MUSIC, 80); } catch (RuntimeException e) { tone = null; }
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        // The workout voice speaks over the user's music, which is only lowered while it speaks.
        am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        AudioAttributes aa = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build();
        focus = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK).setAudioAttributes(aa).build();
        tts = new TextToSpeech(this, status -> {
            if (status != TextToSpeech.SUCCESS) return;
            int r = tts.setLanguage(Locale.US);
            tts.setAudioAttributes(aa);
            ttsOk = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED;
        });
        web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.setBackgroundColor(0xFF0B0B0B);
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Bridge(), "Android");
        // Android 15 and later draw the app under the status and navigation bars: keep the page clear of them, of the camera cutout and of the keyboard.
        android.widget.FrameLayout root = new android.widget.FrameLayout(this);
        root.setBackgroundColor(0xFF0B0B0B);
        root.addView(web, new android.widget.FrameLayout.LayoutParams(-1, -1));
        if (Build.VERSION.SDK_INT >= 30) root.setOnApplyWindowInsetsListener((v, in) -> {
            android.graphics.Insets i = in.getInsets(android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.displayCutout() | android.view.WindowInsets.Type.ime());
            v.setPadding(i.left, i.top, i.right, i.bottom);
            return in;
        });
        setContentView(root);
        web.loadUrl("file:///android_asset/index.html");
        Reminder.schedule(this);
    }

    @Override protected void onPause() {
        super.onPause();
        stopProx();
        if (tts != null) tts.stop();
        web.evaluateJavascript("window.hold&&hold()", null);
    }

    @Override protected void onDestroy() { if (tone != null) tone.release(); if (tts != null) tts.shutdown(); super.onDestroy(); }

    @Override public void onBackPressed() {
        web.evaluateJavascript("window.back?back():false", v -> { if (!"true".equals(v)) finish(); });
    }

    private String pendingExport;
    private void js(String code) { web.evaluateJavascript("window." + code.substring(0, code.indexOf('(')) + "&&" + code, null); }

    /** Backup: the system file picker returns where to write the history, or which file to read back. No storage permission is needed. */
    @Override protected void onActivityResult(int req, int res, android.content.Intent data) {
        if (res != RESULT_OK || data == null || data.getData() == null) return;
        try {
            if (req == 10 && pendingExport != null) {
                try (java.io.OutputStream o = getContentResolver().openOutputStream(data.getData())) { o.write(pendingExport.getBytes(java.nio.charset.StandardCharsets.UTF_8)); }
                js("onBackup(true)");
            } else if (req == 11) {
                java.io.ByteArrayOutputStream b = new java.io.ByteArrayOutputStream();
                try (java.io.InputStream in = getContentResolver().openInputStream(data.getData())) {
                    byte[] buf = new byte[8192]; int n;
                    while ((n = in.read(buf)) > 0 && b.size() < 8000000) b.write(buf, 0, n);
                }
                js("onImport(" + org.json.JSONObject.quote(new String(b.toByteArray(), java.nio.charset.StandardCharsets.UTF_8)) + ")");
            }
        } catch (Exception e) { js("onBackup(false)"); }
    }

    private void stopProx() { if (listening) { sensors.unregisterListener(this); listening = false; } }

    @Override public void onSensorChanged(SensorEvent e) {
        boolean n = e.values[0] < Math.min(prox.getMaximumRange(), 5f);
        if (n == near) return;
        near = n;
        web.evaluateJavascript("window.onProx&&onProx(" + n + ")", null);
    }
    @Override public void onAccuracyChanged(Sensor s, int a) {}

    private class Bridge {
        @JavascriptInterface public boolean hasProx() { return prox != null; }

        @JavascriptInterface public void prox(boolean on) {
            runOnUiThread(() -> {
                if (on && prox != null && !listening) { near = false; listening = sensors.registerListener(MainActivity.this, prox, SensorManager.SENSOR_DELAY_GAME); }
                else if (!on) stopProx();
            });
        }

        @JavascriptInterface public void cue(String kind, boolean sound, boolean vibe) {
            boolean rep = "rep".equals(kind), end = "end".equals(kind);
            if (sound && tone != null) tone.startTone(rep ? ToneGenerator.TONE_PROP_BEEP : end ? ToneGenerator.TONE_PROP_ACK : ToneGenerator.TONE_PROP_BEEP2, rep ? 60 : 250);
            if (vibe && vib != null && vib.hasVibrator()) vib.vibrate(VibrationEffect.createOneShot(rep ? 30 : end ? 400 : 150, VibrationEffect.DEFAULT_AMPLITUDE));
        }

        @JavascriptInterface public void keepOn(boolean on) {
            runOnUiThread(() -> { if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); });
        }

        @JavascriptInterface public void runStart(int run, int walk, int total, boolean loud) {
            startForegroundService(new android.content.Intent(MainActivity.this, RunService.class).putExtra("run", run).putExtra("walk", walk).putExtra("total", total).putExtra("loud", loud));
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED)
                runOnUiThread(() -> requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 2));
        }
        @JavascriptInterface public void runStop() { stopService(new android.content.Intent(MainActivity.this, RunService.class)); RunService.on = false; }
        @JavascriptInterface public String runState() { return RunService.state(); }

        @JavascriptInterface public void say(String text) {
            if (!ttsOk) return;
            runOnUiThread(() -> {
                am.requestAudioFocus(focus);
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "p15");
                h.removeCallbacks(letGo); h.postDelayed(letGo, 3500);
            });
        }

        @JavascriptInterface public void setLastDone(String date) { Reminder.prefs(MainActivity.this).edit().putString("last", date).apply(); }

        @JavascriptInterface public void exportData(String json) {
            pendingExport = json;
            android.content.Intent i = new android.content.Intent(android.content.Intent.ACTION_CREATE_DOCUMENT).addCategory(android.content.Intent.CATEGORY_OPENABLE)
                    .setType("application/json").putExtra(android.content.Intent.EXTRA_TITLE, "prisoner15-backup.json");
            runOnUiThread(() -> { try { startActivityForResult(i, 10); } catch (RuntimeException e) { js("onBackup(false)"); } });
        }

        @JavascriptInterface public void importData() {
            android.content.Intent i = new android.content.Intent(android.content.Intent.ACTION_OPEN_DOCUMENT).addCategory(android.content.Intent.CATEGORY_OPENABLE).setType("*/*");
            runOnUiThread(() -> { try { startActivityForResult(i, 11); } catch (RuntimeException e) { js("onBackup(false)"); } });
        }

        @JavascriptInterface public String getReminder() {
            return "{\"on\":" + Reminder.on(MainActivity.this) + ",\"h\":" + Reminder.hour(MainActivity.this) + ",\"m\":" + Reminder.minute(MainActivity.this) + "}";
        }

        @JavascriptInterface public void setReminder(boolean on, int h, int m) {
            Reminder.save(MainActivity.this, on, h, m);
            if (on && Build.VERSION.SDK_INT >= 33 && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED)
                runOnUiThread(() -> requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 1));
        }
    }
}
