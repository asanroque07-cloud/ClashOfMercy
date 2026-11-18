// version.js — the single place the app version lives.
//
// Bump APP_VERSION whenever a build ships something players should notice. The
// loading screen prints it, and the update watcher uses the deployed bundle to
// tell an out-of-date tab that a newer build exists.
export const APP_VERSION = "1.5.2";

// Short label used in small HUD chips ("V 1.1.0").
export const VERSION_LABEL = `V ${APP_VERSION}`;
