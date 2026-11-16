// LobbyHeader.jsx is the top bar shown on every lobby screen. It displays the
// player's name, level, and currency (coins/diamonds), the navigation tabs, and
// a settings button. Clicking things here tells App.jsx which screen to open.
import { useState, useRef, useEffect } from "react";
import {
  Menu,
  Home,
  Coins,
  Sparkles,
  ChevronRight,
  Award,
  Music,
  Volume2,
  Gamepad,
  LogOut,
  Music2,
  VolumeX,
  LogIn,
} from "lucide-react";
import { ADMIRALS_AVATARS } from "@/lib/lobbyData";
import ControllerSettingsModal from "@/components/ControllerSettingsModal";

// this is for choosing the avatar frame color shown around the player's portrait in the header
const BORDER_STYLES = {
  none: "border-military",
  green: "border-[#76a035]",
  gold: "border-amber-500",
  diamond: "border-cyan-400",
  combat: "border-red-500",
  elite: "border-purple-500",
};

// This is the top bar shown on every lobby screen: back/home button, player avatar + currency,
// and the dropdown menu with music/sound toggles and settings/logout.
export function LobbyHeader({
  activeScreen,
  profile,
  onChangeScreen,
  onOpenSettings,
  onAddCurrency,
  musicOn,
  soundOn,
  onToggleMusic,
  onToggleSound,
  cloudAccount,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [controllerSettingsOpen, setControllerSettingsOpen] = useState(false);
  const menuRef = useRef(null);

  const avatar =
    ADMIRALS_AVATARS.find((a) => a.id === profile.avatarId) ||
    ADMIRALS_AVATARS[0];
  const borderClass =
    BORDER_STYLES[profile.avatarBorder ?? "none"] ?? "border-military";

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // this is for picking the badge color/abbreviation shown for the player's current rank tier
  const getRankStats = (rankName) => {
    switch (rankName) {
      case "Bronze":
        return {
          color: "text-amber-700 bg-amber-950/20 border-amber-900/35",
          abbreviation: "BRZ",
        };
      case "Silver":
        return {
          color: "text-slate-300 bg-slate-800/20 border-slate-700/35",
          abbreviation: "SLV",
        };
      case "Gold":
        return {
          color: "text-yellow-500 bg-yellow-950/20 border-yellow-800/35",
          abbreviation: "GLD",
        };
      case "Platinum":
        return {
          color: "text-cyan-400 bg-cyan-950/20 border-cyan-800/35",
          abbreviation: "PLT",
        };
      case "Diamond":
        return {
          color: "text-blue-400 bg-blue-950/20 border-blue-800/35",
          abbreviation: "DMD",
        };
      case "Master":
        return {
          color: "text-purple-400 bg-purple-950/20 border-purple-800/35",
          abbreviation: "MSTR",
        };
      default:
        return {
          color: "text-green-500 bg-green-950/20 border-green-800/35",
          abbreviation: "REC",
        };
    }
  };

  const rankBadge = getRankStats(profile.rankName);

  return (
    <div className="lobby-header px-3 py-2.5 bg-stone-950/95 border-b border-military flex flex-col md:flex-row gap-3 md:gap-0 justify-between items-center select-none shadow-lg relative z-20">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(118,160,53,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(118,160,53,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#76a035]/40 to-transparent pointer-events-none" />

      <div className="lobby-header__identity flex items-center gap-3 w-full md:w-auto">
        {/* Avatar — opens profile modal */}
        <div
          onClick={onOpenSettings}
          className="relative group cursor-pointer flex-shrink-0"
          title="Commander Profile"
        >
          <div
            className={`w-11 h-11 rounded border-2 ${borderClass} group-hover:border-emerald-500 overflow-hidden transition-all bg-stone-900`}
          >
            <img
              src={avatar.url}
              alt={profile.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-black text-emerald-400 border border-[#76a035] font-mono text-[9px] px-1 font-bold rounded">
            L{profile.level}
          </div>
          <span className="absolute -top-1 -left-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            {activeScreen === "home" ? (
              <h1 className="text-lg md:text-2xl font-display font-extrabold tracking-widest text-[#76a035] glow-green uppercase">
                OT:WARTACTICS
              </h1>
            ) : (
              <div className="flex items-center gap-1">
                <span
                  onClick={() => onChangeScreen("home")}
                  className="text-stone-500 hover:text-stone-300 cursor-pointer text-xs font-mono font-bold uppercase transition-colors"
                >
                  LOBBY
                </span>
                <ChevronRight size={14} className="text-stone-600" />
                <h1 className="text-lg md:text-2xl font-display font-extrabold tracking-widest text-[#76a035] glow-green uppercase">
                  {activeScreen === "rank"
                    ? "RANK"
                    : activeScreen === "offline"
                      ? "OFFLINE"
                      : activeScreen === "classic"
                        ? "CLASSIC"
                        : activeScreen === "custom"
                          ? "CUSTOM"
                          : "QUEUEING"}
                </h1>
              </div>
            )}
          </div>
          <p
            onClick={onOpenSettings}
            className="text-[10px] font-mono text-stone-400 tracking-wider hover:text-white cursor-pointer uppercase"
          >
            CMD: {profile.name}
          </p>
        </div>
      </div>

      <div className="lobby-header__economy flex flex-wrap md:flex-nowrap items-center justify-between md:justify-end gap-2.5 w-full md:w-auto mt-2 md:mt-0">
        <div
          onClick={onOpenSettings}
          className={`flex items-center gap-2 bg-white/5 border px-2.5 py-1.5 rounded cursor-pointer hover:bg-white/10 transition-colors ${rankBadge.color}`}
        >
          <Award size={15} className="animate-pulse" />
          <div className="font-mono text-left">
            <div className="text-[9px] text-stone-400 font-bold leading-none uppercase">
              RANK BADGE
            </div>
            <div className="text-xs font-bold leading-tight flex items-center gap-1">
              <span>{profile.rankName}</span>
              <span className="text-emerald-400 text-[10px]">
                {profile.rankTier}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/5 border border-amber-500/20 px-2.5 py-1.5 rounded relative group overflow-hidden">
          <Coins className="text-amber-500 w-4 h-4" />
          <div className="font-mono text-left min-w-[70px]">
            <div className="text-[9px] text-stone-400 font-bold leading-none uppercase">
              COIN RESERVES
            </div>
            <div className="text-xs font-bold text-amber-400 leading-tight">
              ${profile.coins.toLocaleString()}
            </div>
          </div>
          <button
            onClick={() => onAddCurrency("coins", 2500)}
            className="opacity-0 group-hover:opacity-100 absolute inset-y-0 right-0 bg-amber-500 hover:bg-amber-400 text-stone-900 w-6 flex items-center justify-center font-bold text-xs transition-opacity duration-200"
            title="Add $2500"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white/5 border border-cyan-500/20 px-2.5 py-1.5 rounded relative group overflow-hidden">
          <Sparkles className="text-cyan-400 w-4 h-4" />
          <div className="font-mono text-left min-w-[50px]">
            <div className="text-[9px] text-stone-400 font-bold leading-none uppercase">
              DIAMONDS
            </div>
            <div className="text-xs font-bold text-cyan-400 leading-tight">
              {profile.diamonds.toLocaleString()}
            </div>
          </div>
          <button
            onClick={() => onAddCurrency("diamonds", 50)}
            className="opacity-0 group-hover:opacity-100 absolute inset-y-0 right-0 bg-cyan-500 hover:bg-cyan-400 text-stone-900 w-6 flex items-center justify-center font-bold text-xs transition-opacity duration-200"
            title="Add 50 Diamonds"
          >
            +
          </button>
        </div>

        {/* Account: sign in, or the account currently connected */}
        <div className="flex-shrink-0">
          {cloudAccount.user ? (
            <div
              title={
                cloudAccount.user.email
                  ? `Signed in as ${cloudAccount.user.email}`
                  : "Signed in"
              }
              className="flex h-[38px] items-center gap-2 rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-300"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="max-w-[120px] truncate">
                {cloudAccount.playerProfile?.username
                  ? `@${cloudAccount.playerProfile.username}`
                  : cloudAccount.user.email || "ACCOUNT"}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void cloudAccount.connectGoogle?.()}
              disabled={!cloudAccount.configured || cloudAccount.busy}
              aria-label="Log in with Google"
              title={
                cloudAccount.error ||
                (cloudAccount.configured
                  ? "Log in with Google to save your account and add friends"
                  : "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable login")
              }
              className="flex h-[38px] items-center gap-2 rounded border border-military-active bg-[#76a035]/10 px-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#76a035] transition-all hover:bg-[#76a035]/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogIn size={14} />
              {cloudAccount.busy
                ? "SIGNING IN…"
                : cloudAccount.configured
                  ? "LOGIN"
                  : "SET UP"}
            </button>
          )}
        </div>

        {/* Menu button with dropdown */}
        <div className="flex-shrink-0 relative" ref={menuRef}>
          {activeScreen === "home" ? (
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={`lobby-header__menu-toggle bg-white/5 hover:bg-[#76a035]/20 hover:border-[#76a035]/50 border border-military text-[#76a035] p-2 rounded transition-all flex items-center justify-center cursor-pointer h-[38px] w-[38px] ${menuOpen ? "bg-[#76a035]/20 border-[#76a035]/50" : ""}`}
            >
              <Menu size={18} />
            </button>
          ) : (
            <button
              onClick={() => onChangeScreen("home")}
              className="lobby-header__menu-toggle bg-[#76a035]/10 hover:bg-[#76a035]/25 border border-military-active text-[#76a035] p-2 rounded transition-all flex items-center justify-center cursor-pointer h-[38px] w-[38px] animate-pulse"
            >
              <Home size={18} />
            </button>
          )}

          {/* Settings dropdown */}
          {menuOpen && activeScreen === "home" && (
            <div className="home-settings-menu">
              <div className="home-settings-menu__header">
                <div className="home-settings-menu__title">Game settings</div>
                <div className="home-settings-menu__subtitle">
                  Audio, controller, and account
                </div>
              </div>

              <div className="home-settings-account">
                <div className="home-settings-account__heading">
                  <span className="home-settings-row__icon">
                    <LogIn size={14} />
                  </span>
                  <span className="home-settings-row__copy">
                    <span className="home-settings-row__label">
                      {cloudAccount.user ? "Google account connected" : "Save your account"}
                    </span>
                    <span className="home-settings-row__hint">
                      {cloudAccount.user
                        ? cloudAccount.playerProfile?.username
                          ? `@${cloudAccount.playerProfile.username}`
                          : cloudAccount.user.email
                        : "Guest progress is saved only on this device."}
                    </span>
                  </span>
                </div>
                {cloudAccount.user ? (
                  <button
                    type="button"
                    onClick={cloudAccount.disconnectGoogle}
                    disabled={cloudAccount.busy}
                    className="home-settings-account__button"
                  >
                    {cloudAccount.busy ? "PLEASE WAIT…" : "DISCONNECT"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={cloudAccount.connectGoogle}
                    disabled={!cloudAccount.configured || cloudAccount.busy}
                    className="home-settings-account__button"
                  >
                    {cloudAccount.busy
                      ? "CONNECTING…"
                      : cloudAccount.configured
                        ? "CONNECT GOOGLE"
                        : "SET UP SUPABASE"}
                  </button>
                )}
                {!cloudAccount.configured && (
                  <div className="home-settings-account__note">
                    Add the Supabase URL and publishable key to the app
                    environment before connecting.
                  </div>
                )}
                {cloudAccount.error && (
                  <div className="home-settings-account__error" role="alert">
                    {cloudAccount.error}
                  </div>
                )}
              </div>

              {/* Music toggle */}
              <button
                onClick={onToggleMusic}
                aria-pressed={musicOn}
                className="home-settings-row"
              >
                <span className="home-settings-row__icon">
                  {musicOn ? (
                    <Music size={14} className="text-[#76a035]" />
                  ) : (
                    <Music2 size={14} className="text-stone-500" />
                  )}
                </span>
                <span className="home-settings-row__copy">
                  <span className="home-settings-row__label">Music</span>
                  <span className="home-settings-row__hint">Lobby and match soundtrack</span>
                </span>
                <span className={`home-settings-switch ${musicOn ? "is-on" : ""}`}>
                  <span />
                </span>
                <span className="home-settings-row__state">{musicOn ? "On" : "Off"}</span>
              </button>

              {/* Sound toggle */}
              <button
                onClick={onToggleSound}
                aria-pressed={soundOn}
                className="home-settings-row"
              >
                <span className="home-settings-row__icon">
                  {soundOn ? (
                    <Volume2 size={14} className="text-[#76a035]" />
                  ) : (
                    <VolumeX size={14} className="text-stone-500" />
                  )}
                </span>
                <span className="home-settings-row__copy">
                  <span className="home-settings-row__label">Sound effects</span>
                  <span className="home-settings-row__hint">Weapons and gameplay audio</span>
                </span>
                <span className={`home-settings-switch ${soundOn ? "is-on" : ""}`}>
                  <span />
                </span>
                <span className="home-settings-row__state">{soundOn ? "On" : "Off"}</span>
              </button>

              {/* Controller settings */}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setControllerSettingsOpen(true);
                }}
                className="home-settings-controller"
              >
                <span className="home-settings-row__icon">
                  <Gamepad size={15} />
                </span>
                <span className="home-settings-row__copy">
                  <span className="home-settings-row__label">Controller layout</span>
                  <span className="home-settings-row__hint">
                    Configure mobile control layout
                  </span>
                </span>
                <ChevronRight
                  size={14}
                  className="home-settings-controller__arrow"
                />
              </button>

              {/* Exit */}
              <div className="home-settings-menu__footer">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    window.location.reload();
                  }}
                  className="home-settings-exit"
                >
                  <LogOut size={14} className="text-red-500" />
                  <span>
                    Exit Game
                  </span>
                </button>
              </div>
            </div>
          )}
          {controllerSettingsOpen && (
            <ControllerSettingsModal
              onClose={() => setControllerSettingsOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
