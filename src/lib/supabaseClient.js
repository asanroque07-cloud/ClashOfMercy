import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// The Android WebView cannot be redirected back into from the browser tab that
// runs Google sign-in, so the app has to be re-opened through its own scheme.
//
// Android only accepts that scheme (see AndroidManifest.xml), while Supabase
// only redirects to https URLs on its allow-list - and the game site is always
// on it. So the browser comes back to a page on the site, and that page forwards
// the PKCE code to the scheme below. This also works when nobody remembers to
// add the custom scheme to the Supabase redirect allow-list.
export const NATIVE_AUTH_SCHEME = "com.clashofmercy.game://auth-callback";
export const NATIVE_AUTH_RELAY_URL =
  "https://clash-of-mercy.vercel.app/auth-callback.html";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const isNativeApp =
  typeof window !== "undefined" && Capacitor.isNativePlatform();

// The browser tab uses the normal site origin; the installed app goes through
// the relay page and then the deep link.
export const NATIVE_AUTH_REDIRECT_URL = NATIVE_AUTH_RELAY_URL;

export const OAUTH_REDIRECT_URL = isNativeApp
  ? NATIVE_AUTH_REDIRECT_URL
  : typeof window !== "undefined"
    ? window.location.origin
    : NATIVE_AUTH_REDIRECT_URL;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      // PKCE is required for the deep-link exchange. The installed app reads the
      // code itself in nativeAuth.js, so the client must not parse the URL.
      auth: isNativeApp
        ? { flowType: "pkce", detectSessionInUrl: false }
        : undefined,
    })
  : null;
