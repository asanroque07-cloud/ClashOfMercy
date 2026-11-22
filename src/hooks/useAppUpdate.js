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
  const inFlightRef = useRef(""); // the file that is downloading right now

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

  // Downloads the published APK for the release we already know about. This is
  // deliberately not started from an effect here: UpdateOverlay calls it, and
  // the overlay only exists on the boot screen and in the lobby, so a player in
  // a live match never has the update pulled underneath them. The download
  // itself then runs on, and the popup appears again on the next lobby visit.
  const startDownload = useCallback(async () => {
    const next = releaseRef.current;
    if (!next) return;
    const key = next.apkUrl || next.version;
    if (inFlightRef.current === key) return;
    inFlightRef.current = key;
    setStatus("downloading");
    setError("");
    setProgress({ received: 0, total: Number(next.size) || 0 });
    try {
      await downloadUpdate(next.apkUrl, (event) => {
        setProgress({
          received: Number(event?.received) || 0,
          total: Number(event?.total) || Number(next.size) || 0,
        });
      });
      // A newer build may have replaced this one while it was downloading.
      if (releaseRef.current?.apkUrl !== next.apkUrl) return;
      setStatus("ready");
    } catch (downloadError) {
      if (releaseRef.current?.apkUrl !== next.apkUrl) return;
      setStatus("error");
      setError(downloadError?.message || "The update download failed.");
    } finally {
      if (inFlightRef.current === key) inFlightRef.current = "";
    }
  }, []);

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
