import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import {
  NATIVE_AUTH_RELAY_URL,
  NATIVE_AUTH_SCHEME,
  supabase,
} from "@/lib/supabaseClient";

// Supabase returns to the relay page on the site, which re-opens the app through
// the custom scheme; when the scheme itself is allow-listed the app is opened
// directly. Both forms are accepted here.
const AUTH_CALLBACK_PREFIXES = [NATIVE_AUTH_SCHEME, NATIVE_AUTH_RELAY_URL];

// Read the PKCE code out of the redirect URL (or the OAuth error, if any).
function readCallback(url) {
  try {
    const parsed = new URL(url);
    const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    return {
      code: parsed.searchParams.get("code") || hashParams.get("code") || "",
      error:
        parsed.searchParams.get("error_description") ||
        parsed.searchParams.get("error") ||
        hashParams.get("error_description") ||
        hashParams.get("error") ||
        "",
    };
  } catch {
    return { code: "", error: "" };
  }
}

// The player comes back from the browser too late for the login window, so the
// result is reported on top of the game instead.
function showAuthNotice(message) {
  if (typeof document === "undefined" || !document.body) return;
  const previous = document.getElementById("com-auth-notice");
  if (previous) previous.remove();

  const notice = document.createElement("div");
  notice.id = "com-auth-notice";
  notice.textContent = message;
  notice.style.cssText = [
    "position:fixed",
    "left:50%",
    "bottom:24px",
    "transform:translateX(-50%)",
    "z-index:9999",
    "max-width:90vw",
    "padding:12px 18px",
    "border:1px solid #8ec63f",
    "background:#10140c",
    "color:#d7e8b8",
    "font-family:inherit",
    "font-size:13px",
    "letter-spacing:0.04em",
    "text-align:center",
    "box-shadow:0 8px 24px rgba(0,0,0,0.6)",
  ].join(";");
  document.body.appendChild(notice);
  window.setTimeout(() => notice.remove(), 10000);
}

/**
 * Android re-opens the app through the auth-callback deep link after Google
 * sign-in. Close the browser tab and hand the code to Supabase so the PKCE
 * verifier stored on this device completes the session.
 */
async function completeSignIn(url) {
  if (
    !url ||
    !AUTH_CALLBACK_PREFIXES.some((prefix) => url.startsWith(prefix))
  ) {
    return;
  }

  const { code, error: oauthError } = readCallback(url);
  await Browser.close().catch(() => {});

  if (oauthError) {
    showAuthNotice(`Google sign-in was cancelled: ${oauthError}`);
    return;
  }
  if (!code || !supabase) return;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.warn("[auth] Google sign-in failed:", error.message);
    showAuthNotice(`Google sign-in failed: ${error.message}`);
    return;
  }

  showAuthNotice(
    "Signed in with Google. Restart Clash Of Mercy if your name has not updated.",
  );
}

/**
 * Returns a function that removes the listener.
 */
export async function installNativeAuthListener() {
  const handle = await App.addListener("appUrlOpen", ({ url }) => {
    void completeSignIn(url);
  });

  // When Android killed the app while Google was still open, the deep link
  // arrives as the launch URL instead of an appUrlOpen event.
  App.getLaunchUrl()
    .then((launch) => completeSignIn(launch?.url))
    .catch(() => {});

  return () => handle.remove();
}
