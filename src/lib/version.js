// version.js — the single place the app version lives.
//
// Bump APP_VERSION / APP_VERSION_CODE whenever a build ships something players
// should notice. The loading screen prints it, and the in-app updater compares
// it with the published release feed to decide whether a newer APK exists.
export const APP_VERSION = "1.6.6";

// Android versionCode — must increase with every published APK.
export const APP_VERSION_CODE = 22;

// Short label used in small HUD chips ("V 1.1.0").
export const VERSION_LABEL = `V ${APP_VERSION}`;

// "What's new" shown on the loading screen when an update is available.
// `scripts/write-update-manifest.mjs` publishes this list to public/update.json.
export const RELEASE_NOTES = [
  "Online accounts are live: create your player account with an email and password, or sign in with Google.",
  "Progress, friends, invites and match history now sync through the cloud database.",
  "The in-app updater keeps showing the new version, its size and these notes.",
];
