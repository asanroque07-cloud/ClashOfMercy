// The release feed is a small JSON file published with every APK. The installed
// app downloads it from the public repository so it can tell whether a newer
// build exists without needing an app store.
const REPO_RAW =
  "https://raw.githubusercontent.com/asanroque07-cloud/ClashOfMercy/main";

export const UPDATE_FEED_URL = `${REPO_RAW}/public/update.json`;
export const UPDATE_APK_URL = `${REPO_RAW}/public/download/clash-of-mercy.apk`;

// "1.6.10" is newer than "1.6.9": compare each numeric part, not the string.
export function compareVersions(a, b) {
  const left = String(a || "0").split(".").map((part) => Number(part) || 0);
  const right = String(b || "0").split(".").map((part) => Number(part) || 0);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

// The file name shown while an update downloads ("clash-of-mercy.apk").
export function releaseFileName(release) {
  const url = String(release?.apkUrl || "").split(/[?#]/)[0];
  const name = url.slice(url.lastIndexOf("/") + 1);
  return name || "clash-of-mercy.apk";
}

// Fetch the published manifest. The query string and no-store header keep a CDN
// from handing the app a stale copy right after a release.
export async function fetchLatestRelease() {
  const res = await fetch(`${UPDATE_FEED_URL}?t=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) throw new Error(`Update feed returned HTTP ${res.status}`);
  const release = await res.json();
  if (!release || !release.version) throw new Error("Update feed is malformed");
  return release;
}
