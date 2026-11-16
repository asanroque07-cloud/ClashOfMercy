import { useEffect, useRef, useState } from "react";

// Poll the deployed page for a different entry bundle. Vite names the entry
// `/assets/index-<hash>.js`, so a changed hash means a newer build is live and
// the tab (which keeps the old bundle in memory) needs a reload to pick it up.
const POLL_INTERVAL_MS = 15_000;

function currentEntryBundle() {
  if (typeof document === "undefined") return null;
  const script = document.querySelector('script[type="module"][src*="/assets/"]');
  if (!script) return null; // dev server (module served from /src) — nothing to watch
  try {
    const url = new URL(script.src, window.location.href);
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

async function deployedEntryBundle() {
  // Absolute path + unique query string: the CDN must reach the origin, so a
  // fresh deployment is seen immediately instead of a cached HTML document.
  const url = new URL("index.html", window.location.href);
  url.search = `?ts=${Date.now()}`;
  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
  return match ? match[0] : null;
}

/**
 * Returns `{ available, restart }` — `available` flips to true when the server
 * is serving a bundle other than the one this tab is running.
 */
export function useUpdateAvailable(enabled = true) {
  const [available, setAvailable] = useState(false);
  const mineRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    mineRef.current = currentEntryBundle();
    if (!mineRef.current) return undefined; // development build

    let stopped = false;
    const check = async () => {
      try {
        const deployed = await deployedEntryBundle();
        if (!stopped && deployed && deployed !== mineRef.current) {
          setAvailable(true);
        }
      } catch {
        // Offline or a blocked request: keep playing on the current build.
      }
    };

    void check(); // catch a deploy that landed while the tab was loading
    const id = window.setInterval(check, POLL_INTERVAL_MS);
    const onFocus = () => void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onPageShow = () => void check(); // back/forward-cache restore
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);

  const restart = () => {
    // The new index.html references fresh hashed assets, so a plain reload
    // picks them up (the old bundle is never reused).
    window.location.reload();
  };

  return { available, restart };
}
