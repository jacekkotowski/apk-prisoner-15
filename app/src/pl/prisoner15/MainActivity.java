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

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        sensors = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        prox = sensors.getDefaultSensor(Sensor.TYPE_PROXIMITY);
        vib = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        try { tone = new ToneGenerator(AudioManager.STREAM_MUSIC, 80); } catch (RuntimeException e) { tone = null; }
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.setBackgroundColor(0xFF0B0B0B);
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Bridge(), "Android");
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
        Reminder.schedule(this);
    }

    @Override protected void onPause() {
        super.onPause();
        stopProx();
        web.evaluateJavascript("window.hold&&hold()", null);
    }

    @Override protected void onDestroy() { if (tone != null) tone.release(); super.onDestroy(); }

    @Override public void onBackPressed() {
        web.evaluateJavascript("window.back?back():false", v -> { if (!"true".equals(v)) finish(); });
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
