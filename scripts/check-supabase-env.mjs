// Preflight for the Supabase settings baked into the build.
//
// The web bundle and the APK embed VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY at
// build time. Placeholder or malformed values silently turn the game into guest
// mode, so the build must refuse to start instead. Runs via `prebuild`.
import { loadEnv } from "vite";

const REQUIRED = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];

const PLACEHOLDER_PATTERNS = [
  /[<>]/, // https://<ref>.supabase.co
  /\.\.\./, // sb_publishable_...
  /YOUR[_-]?/i, // YOUR_PROJECT_ID
  /PASTE/i,
  /CHANGEME/i,
  /REPLACE[_-]?ME/i,
  /example/i,
  /^x+$/i,
];

function looksLikePlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

// https://<20-char-ref>.supabase.co, project root only.
function checkUrl(value) {
  if (!value) {
    return "VITE_SUPABASE_URL is missing. Add your project URL, e.g. https://abcdefghijklmnopqrst.supabase.co";
  }
  const url = value.trim();
  if (looksLikePlaceholder(url)) {
    return `VITE_SUPABASE_URL is still a placeholder ("${url}"). Paste the real Project URL from Supabase → Project Settings → API.`;
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return `VITE_SUPABASE_URL is not a valid URL ("${url}").`;
  }
  if (parsed.protocol !== "https:") {
    return "VITE_SUPABASE_URL must start with https://";
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    return `VITE_SUPABASE_URL must be the bare project root, not "${parsed.pathname}".`;
  }
  if (!parsed.hostname.endsWith(".supabase.co")) {
    return `VITE_SUPABASE_URL must be a *.supabase.co project URL, got "${parsed.hostname}".`;
  }
  const ref = parsed.hostname.slice(0, -".supabase.co".length);
  if (!/^[a-z0-9]{16,32}$/.test(ref)) {
    return `VITE_SUPABASE_URL project ref "${ref}" doesn't look like a Supabase ref (16-32 lowercase letters/digits).`;
  }
  return null;
}

// New publishable keys (sb_publishable_…) or the legacy anon JWT. Secret keys
// must never reach a browser bundle.
function checkKey(value) {
  if (!value) {
    return "VITE_SUPABASE_ANON_KEY is missing. Add the project's publishable key (or legacy anon key).";
  }
  const key = value.trim();
  if (looksLikePlaceholder(key)) {
    return `VITE_SUPABASE_ANON_KEY is still a placeholder ("${key.slice(0, 24)}…"). Paste the real publishable/anon key.`;
  }
  if (key.startsWith("sb_secret_") || key.startsWith("sbp_")) {
    return "VITE_SUPABASE_ANON_KEY is a secret key. Only the publishable (or legacy anon) key may ship in the app.";
  }
  if (/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key)) return null;

  const parts = key.split(".");
  if (parts.length === 3 && parts[0].startsWith("eyJ")) {
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8"),
      );
      if (payload.role && payload.role !== "anon") {
        return `VITE_SUPABASE_ANON_KEY is a "${payload.role}" key. Only the anon key may ship in the app.`;
      }
      return null;
    } catch {
      return "VITE_SUPABASE_ANON_KEY looks like a JWT but its payload cannot be read.";
    }
  }

  if (key.startsWith("eyJ")) {
    return "VITE_SUPABASE_ANON_KEY looks truncated — the anon JWT must have three dot-separated parts.";
  }
  return "VITE_SUPABASE_ANON_KEY is neither a publishable key (sb_publishable_…) nor a legacy anon JWT (eyJ…).";
}

const fromFiles = loadEnv("production", process.cwd(), "");
const values = {};
for (const name of REQUIRED) {
  values[name] = (process.env[name] || fromFiles[name] || "").trim();
}

const problems = [checkUrl(values.VITE_SUPABASE_URL), checkKey(values.VITE_SUPABASE_ANON_KEY)].filter(Boolean);

if (problems.length > 0) {
  console.error("\n✖ Supabase preflight failed — the build was stopped.\n");
  for (const problem of problems) console.error(`  • ${problem}`);
  console.error(
    "\nPut the values in the project's .env file (it is gitignored):\n" +
      "  VITE_SUPABASE_URL=https://<your-ref>.supabase.co\n" +
      "  VITE_SUPABASE_ANON_KEY=sb_publishable_…   (or the legacy anon key)\n",
  );
  process.exit(1);
}

console.log(`✓ Supabase preflight ok — ${new URL(values.VITE_SUPABASE_URL).hostname}`);
