// Generates public/update.json — the release feed the installed app polls.
// Run after the signed APK has been copied into public/download/.
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { APP_VERSION, APP_VERSION_CODE, RELEASE_NOTES } from "../src/lib/version.js";
import { UPDATE_APK_URL } from "../src/lib/updateFeed.js";

const apkPath = "public/download/clash-of-mercy.apk";
const size = statSync(apkPath).size;
const manifest = {
  version: APP_VERSION,
  versionCode: APP_VERSION_CODE,
  released: new Date().toISOString(),
  size,
  apkUrl: UPDATE_APK_URL,
  notes: RELEASE_NOTES,
};

writeFileSync("public/update.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `update.json → v${manifest.version} (${manifest.versionCode}), ${(size / (1024 * 1024)).toFixed(1)} MB`,
);
