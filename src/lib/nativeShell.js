// Leaving the installed app, and the Android hardware back button.
//
// Inside the Capacitor shell a page reload only restarts the game, so "Exit"
// has to quit the app process itself. A browser tab cannot be closed from
// script, so there the exit button still reloads the start screen.
import { App } from "@capacitor/app";
import { isNativeApp } from "@/lib/supabaseClient";

export async function exitApp() {
  if (!isNativeApp) {
    window.location.reload();
    return;
  }
  try {
    // Android-only: finishes the activity and removes the app from recents.
    await App.exitApp();
  } catch {
    // iOS has no programmatic exit; the player swipes the app away instead.
  }
}

/**
 * Android only delivers "backButton" while a listener is attached; without one
 * the system default (leaving the app) applies. `onBack` returns true when it
 * handled the press itself, false to let Android leave the app.
 *
 * Returns a function that removes the listener.
 */
export function installBackButtonHandler(onBack) {
  if (!isNativeApp) return () => {};

  let removed = false;
  let handle = null;

  App.addListener("backButton", (event) => {
    if (onBack(event)) return;
    void exitApp();
  })
    .then((listener) => {
      if (removed) listener.remove();
      else handle = listener;
    })
    .catch(() => {});

  return () => {
    removed = true;
    handle?.remove();
  };
}
