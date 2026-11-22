import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Google sign-in inside the Android shell cannot redirect back to the WebView,
// so it returns through this custom scheme instead.
export const NATIVE_AUTH_REDIRECT_URL = "com.clashofmercy.game://auth-callback";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const isNativeApp =
  typeof window !== "undefined" && Capacitor.isNativePlatform();

// The browser tab uses the normal site origin; the installed app uses the
// deep link it registered in AndroidManifest.xml.
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
