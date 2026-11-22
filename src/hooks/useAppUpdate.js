import { useCallback, useEffect, useRef, useState } from "react";
import { APP_VERSION, APP_VERSION_CODE } from "@/lib/version";
import {
  compareVersions,
  fetchLatestRelease,
  releaseFileName,
} from "@/lib/updateFeed";
import {
  canInstallUpdates,
  downloadUpdate,
  installUpdate,
  restartApp,
} from "@/lib/nativeUpdater";

// Re-check the published feed while the app stays open, so an update that ships
// mid-session is offered without a restart.
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

function isNewer(release) {
  if (!release) return false;
  if (Number.isFinite(Number(release.versionCode))) {
    return Number(release.versionCode) > APP_VERSION_CODE;
  }
  return compareVersions(release.version, APP_VERSION) > 0;
}

export function useAppUpdate(enabled = true) {
  const [release, setRelease] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | downloading | ready | error
  const [progress, setProgress] = useState({ received: 0, total: 0 });
  const [error, setError] = useState("");

  const releaseRef = useRef(null);
  const autoStartedRef = useRef("");

  // A newer build replaces the previous offer and starts from a clean slate.
  const acceptRelease = useCallback((latest) => {
    if (releaseRef.current?.apkUrl === latest.apkUrl) return;
    releaseRef.current = latest;
    setRelease(latest);
    setDismissed(false);
    setStatus("idle");
    setError("");
    setProgress({ received: 0, total: Number(latest.size) || 0 });
  }, []);

  useEffect(() => {
    if (!enabled || !canInstallUpdates()) return undefined;

    let active = true;
    const check = async () => {
      try {
        const latest = await fetchLatestRelease();
        if (active && isNewer(latest)) acceptRelease(latest);
      } catch {
        // Offline or a blocked feed: keep playing the installed build.
      }
    };

    void check();
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, acceptRelease]);

  const startDownload = useCallback(async () => {
    if (!release) return;
    setStatus("downloading");
    setError("");
    setProgress({ received: 0, total: Number(release.size) || 0 });
    try {
      await downloadUpdate(release.apkUrl, (event) => {
        setProgress({
          received: Number(event?.received) || 0,
          total: Number(event?.total) || Number(release.size) || 0,
        });
      });
      setStatus("ready");
    } catch (downloadError) {
      setStatus("error");
      setError(downloadError?.message || "The update download failed.");
    }
  }, [release]);

  // Download the APK in the background as soon as a newer build is known: the
  // player keeps using the game and only sees the "restart the game" popup once
  // the file is actually on the device. On a fresh launch this starts while the
  // loading screen is still up, so its percentage and file name are visible
  // there, and the popup is shown again on the boot screen.
  useEffect(() => {
    if (!enabled || !release || status !== "idle") return;
    const key = release.apkUrl || release.version;
    if (autoStartedRef.current === key) return;
    autoStartedRef.current = key;
    void startDownload();
  }, [enabled, release, status, startDownload]);

  const openInstaller = useCallback(async () => {
    setError("");
    try {
      await installUpdate();
    } catch (installError) {
      setError(installError?.message || "Android could not open the installer.");
    }
  }, []);

  const restartNow = useCallback(async () => {
    try {
      await restartApp();
    } catch {
      window.location.reload();
    }
  }, []);

  return {
    available: Boolean(release),
    release,
    fileName: release ? releaseFileName(release) : "",
    dismissed,
    dismiss: () => setDismissed(true),
    status,
    progress,
    error,
    startDownload,
    openInstaller,
    restartNow,
  };
}
