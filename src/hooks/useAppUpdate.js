import { useCallback, useEffect, useState } from "react";
import { APP_VERSION, APP_VERSION_CODE } from "@/lib/version";
import { compareVersions, fetchLatestRelease } from "@/lib/updateFeed";
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

  useEffect(() => {
    if (!enabled || !canInstallUpdates()) return undefined;

    let active = true;
    const check = async () => {
      try {
        const latest = await fetchLatestRelease();
        if (active && isNewer(latest)) setRelease(latest);
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
  }, [enabled]);

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
