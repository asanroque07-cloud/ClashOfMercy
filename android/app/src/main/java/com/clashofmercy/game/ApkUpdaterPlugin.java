package com.clashofmercy.game;

import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Downloads a newer APK, reports progress to the web layer and opens Android's
 * package installer. The app is signed with the same key for every release, so
 * the installer replaces the installed build instead of refusing it.
 */
@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    private static final String APK_NAME = "clash-of-mercy-update.apk";

    private File updateFile() {
        return new File(getContext().getCacheDir(), APK_NAME);
    }

    @PluginMethod
    public void download(final PluginCall call) {
        final String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("A download URL is required.");
            return;
        }

        new Thread(() -> {
            HttpURLConnection connection = null;
            InputStream input = null;
            FileOutputStream output = null;
            File target = updateFile();
            try {
                if (target.exists() && !target.delete()) {
                    throw new IOException("Could not clear the previous download.");
                }

                connection = (HttpURLConnection) new URL(url).openConnection();
                connection.setInstanceFollowRedirects(true);
                connection.setConnectTimeout(20000);
                connection.setReadTimeout(30000);
                connection.setRequestProperty("Cache-Control", "no-cache");

                int code = connection.getResponseCode();
                if (code < 200 || code >= 300) {
                    throw new IOException("Server returned HTTP " + code);
                }

                long total = connection.getContentLengthLong();
                input = new BufferedInputStream(connection.getInputStream());
                output = new FileOutputStream(target);

                byte[] buffer = new byte[64 * 1024];
                long received = 0;
                long lastReport = 0;
                int read;
                while ((read = input.read(buffer)) != -1) {
                    output.write(buffer, 0, read);
                    received += read;
                    long now = System.currentTimeMillis();
                    if (now - lastReport >= 120) {
                        lastReport = now;
                        emitProgress(received, total);
                    }
                }
                output.flush();
                output.close();
                output = null;
                input.close();
                input = null;

                emitProgress(received, received);

                JSObject result = new JSObject();
                result.put("path", target.getAbsolutePath());
                result.put("size", target.length());
                resolveOnMain(call, result);
            } catch (Exception error) {
                call.reject("Update download failed: " + error.getMessage(), error);
            } finally {
                try {
                    if (output != null) output.close();
                } catch (IOException ignored) {
                }
                try {
                    if (input != null) input.close();
                } catch (IOException ignored) {
                }
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    @PluginMethod
    public void install(PluginCall call) {
        File apk = updateFile();
        if (!apk.exists() || apk.length() == 0) {
            call.reject("There is no downloaded update yet.");
            return;
        }
        try {
            Uri uri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apk);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not open the installer: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void restart(PluginCall call) {
        call.resolve();
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try {
                Intent intent = new Intent(getContext(), MainActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                getContext().startActivity(intent);
                if (getActivity() != null) getActivity().finishAffinity();
                android.os.Process.killProcess(android.os.Process.myPid());
            } catch (Exception ignored) {
                // Android restarts the app from the launcher if this is blocked.
            }
        }, 250);
    }

    private void emitProgress(long received, long total) {
        JSObject progress = new JSObject();
        progress.put("received", received);
        progress.put("total", total);
        notifyListeners("progress", progress);
    }

    private void resolveOnMain(final PluginCall call, final JSObject result) {
        new Handler(Looper.getMainLooper()).post(() -> call.resolve(result));
    }
}
