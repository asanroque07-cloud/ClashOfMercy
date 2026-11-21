import { useState } from "react";
import { LogIn, UserPlus, X } from "lucide-react";

// Player accounts: email + password sign-up and sign-in against the game
// database. Google sign-in stays available as a second option.
export default function AccountModal({ open, onClose, cloudAccount }) {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!open) return null;

  const configured = Boolean(cloudAccount?.configured);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim() || password.length < 6) {
      setError("Enter your email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const result = await cloudAccount.signUpWithEmail(
          email,
          password,
          displayName,
        );
        if (result?.needsConfirmation) {
          setNotice(
            "Account created. Confirm it from the email we sent, then log in.",
          );
          setMode("signin");
        } else {
          onClose();
        }
      } else {
        await cloudAccount.signInWithEmail(email, password);
        onClose();
      }
    } catch (authError) {
      setError(authError?.message || "The account request failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[650] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm border border-[#76a035] bg-stone-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-[#9acd50]">
              Player account
            </div>
            <h2 className="mt-1 font-display text-2xl text-white">
              {mode === "signup" ? "Create account" : "Log in"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account window"
            className="p-1 text-stone-500 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {!configured && (
          <p className="mt-3 border border-amber-700/60 bg-amber-950/40 p-2 font-mono text-[10px] leading-relaxed text-amber-300">
            Online accounts are not connected in this build. Your progress is
            saved on this device.
          </p>
        )}

        <form className="mt-4 space-y-3" onSubmit={submit}>
          {mode === "signup" && (
            <label className="block">
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-stone-400">
                Operator name
              </span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={20}
                disabled={!configured || busy}
                className="mt-1 w-full border border-stone-700 bg-stone-900 px-2 py-2 font-mono text-xs text-white outline-none focus:border-[#76a035] disabled:opacity-50"
                placeholder="Hakey"
              />
            </label>
          )}
          <label className="block">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-stone-400">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={!configured || busy}
              autoComplete="email"
              className="mt-1 w-full border border-stone-700 bg-stone-900 px-2 py-2 font-mono text-xs text-white outline-none focus:border-[#76a035] disabled:opacity-50"
              placeholder="player@example.com"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-stone-400">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={!configured || busy}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              className="mt-1 w-full border border-stone-700 bg-stone-900 px-2 py-2 font-mono text-xs text-white outline-none focus:border-[#76a035] disabled:opacity-50"
              placeholder="••••••"
            />
          </label>

          {error && (
            <p className="font-mono text-[10px] text-red-400" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="font-mono text-[10px] text-emerald-300" role="status">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={!configured || busy}
            className="flex w-full items-center justify-center gap-2 border border-[#9acd50] bg-[#76a035] px-3 py-2.5 font-mono text-[11px] font-black uppercase tracking-widest text-black hover:bg-[#8bc342] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mode === "signup" ? <UserPlus size={14} /> : <LogIn size={14} />}
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : "Log in"}
          </button>
        </form>

        <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setError("");
              setNotice("");
            }}
            className="text-[#9acd50] hover:underline"
          >
            {mode === "signup" ? "I already have an account" : "Create account"}
          </button>
          {configured && (
            <button
              type="button"
              onClick={() => void cloudAccount.connectGoogle?.()}
              disabled={busy}
              className="text-stone-400 hover:text-white disabled:opacity-50"
            >
              Use Google
            </button>
          )}
        </div>

        {cloudAccount?.error && (
          <p className="mt-2 font-mono text-[9px] text-red-400" role="alert">
            {cloudAccount.error}
          </p>
        )}
      </div>
    </div>
  );
}
