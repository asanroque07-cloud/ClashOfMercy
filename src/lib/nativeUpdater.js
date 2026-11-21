import { Capacitor, registerPlugin } from "@capacitor/core";

// The native side (android/.../ApkUpdaterPlugin.java) downloads the APK with
// progress events and opens Android's package installer.
const ApkUpdater = registerPlugin("ApkUpdater");

export function canInstallUpdates() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export function formatSize(bytes) {
  const value = Number(bytes) || 0;
  if (value <= 0) return "—";
  if (value >= 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export async function downloadUpdate(url, onProgress) {
  if (!canInstallUpdates()) {
    throw new Error("Updates can only be installed from the Android app.");
  }
  const listener = await ApkUpdater.addListener("progress", (event) => {
    if (onProgress) onProgress(event);
  });
  try {
    return await ApkUpdater.download({ url });
  } finally {
    await listener.remove();
  }
}

export async function installUpdate() {
  return ApkUpdater.install();
}

export async function restartApp() {
  return ApkUpdater.restart();
}
