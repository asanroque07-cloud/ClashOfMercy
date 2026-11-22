import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/lib/supabaseClient";

// The redirect Supabase sends the browser back to once Google has finished.
const AUTH_CALLBACK_PREFIX = "com.clashofmercy.game://auth-callback";

// Read the PKCE code out of the redirect URL (or the OAuth error, if any).
function readCallback(url) {
  try {
    const params = new URL(url).searchParams;
    return {
      code: params.get("code") || "",
      error: params.get("error_description") || params.get("error") || "",
    };
  } catch {
    return { code: "", error: "" };
  }
}

/**
 * Android re-opens the app through the auth-callback deep link after Google
 * sign-in. Close the browser tab and hand the code to Supabase so the PKCE
 * verifier stored on this device completes the session.
 *
 * Returns a function that removes the listener.
 */
export async function installNativeAuthListener() {
  const handle = await App.addListener("appUrlOpen", async ({ url }) => {
    if (!url || !url.startsWith(AUTH_CALLBACK_PREFIX)) return;

    const { code, error: oauthError } = readCallback(url);
    await Browser.close().catch(() => {});

    if (oauthError || !code || !supabase) return;

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.warn("[auth] Google sign-in failed:", error.message);
  });

  return () => handle.remove();
}
