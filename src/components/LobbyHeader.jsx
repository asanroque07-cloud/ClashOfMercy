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
} from "lucide-react";
import { ADMIRALS_AVATARS } from "@/lib/lobbyData";

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
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
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
    <header className="px-3 py-2 short:py-1.5 bg-stone-950/95 border-b border-military flex flex-row gap-2 justify-between items-center select-none shadow-lg relative z-20 flex-shrink-0">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(118,160,53,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(118,160,53,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#76a035]/40 to-transparent pointer-events-none" />

      <div className="flex items-center gap-2.5 min-w-0 relative">
        {/* Avatar — opens profile modal */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="relative group cursor-pointer flex-shrink-0"
          aria-label="Open commander profile"
        >
          <div
            className={`w-10 h-10 short:w-9 short:h-9 rounded border-2 ${borderClass} group-hover:border-emerald-500 overflow-hidden transition-all bg-stone-900`}
          >
            <img
              src={avatar.url}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-black text-emerald-400 border border-[#76a035] font-mono text-[8px] px-1 font-bold rounded">
            L{profile.level}
          </div>
          <span className="absolute -top-1 -left-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </button>

        <div className="min-w-0">
          {activeScreen === "home" ? (
            <h1 className="text-base md:text-xl font-display tracking-widest text-[#76a035] glow-green uppercase leading-none truncate">
              OT:WARTACTICS
            </h1>
          ) : (
            <div className="flex items-center gap-1 min-w-0">
              <button
                type="button"
                onClick={() => onChangeScreen("home")}
                className="text-stone-500 hover:text-stone-300 cursor-pointer text-[10px] font-mono font-bold uppercase transition-colors"
              >
                LOBBY
              </button>
              <ChevronRight size={12} className="text-stone-600 flex-shrink-0" aria-hidden="true" />
              <h1 className="text-base md:text-xl font-display tracking-widest text-[#76a035] glow-green uppercase leading-none truncate">
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
          <button
            type="button"
            onClick={onOpenSettings}
            className="block mt-1 text-[9px] font-mono text-stone-400 tracking-wider hover:text-white cursor-pointer uppercase truncate max-w-[160px]"
          >
            CMD: {profile.name}
          </button>
        </div>
      </div>

      <div className="flex flex-nowrap items-center justify-end gap-1.5 sm:gap-2 relative flex-shrink-0">
        <button
          type="button"
          onClick={onOpenSettings}
          className={`flex items-center gap-1.5 bg-white/5 border px-2 h-9 rounded cursor-pointer hover:bg-white/10 transition-colors ${rankBadge.color}`}
          aria-label={`Rank ${profile.rankName} ${profile.rankTier}`}
        >
          <Award size={14} aria-hidden="true" />
          <div className="font-mono text-left">
            <div className="text-[8px] text-stone-400 font-bold leading-none uppercase short:hidden">
              RANK
            </div>
            <div className="text-[11px] font-bold leading-tight flex items-center gap-1">
              <span>{profile.rankName}</span>
              <span className="text-emerald-400 text-[10px]">
                {profile.rankTier}
              </span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1.5 bg-white/5 border border-amber-500/20 pl-2 h-9 rounded overflow-hidden">
          <Coins className="text-amber-500 w-3.5 h-3.5" aria-hidden="true" />
          <div className="font-mono text-left">
            <div className="text-[8px] text-stone-400 font-bold leading-none uppercase short:hidden">
              COINS
            </div>
            <div className="text-[11px] font-bold text-amber-400 leading-tight tabular-nums">
              ${profile.coins.toLocaleString()}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onAddCurrency("coins", 2500)}
            className="h-full ml-0.5 bg-amber-500/15 hover:bg-amber-500 active:bg-amber-500 text-amber-400 hover:text-stone-900 active:text-stone-900 w-7 flex items-center justify-center font-bold text-sm transition-colors border-l border-amber-500/20"
            aria-label="Add 2500 coins"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-1.5 bg-white/5 border border-cyan-500/20 pl-2 h-9 rounded overflow-hidden">
          <Sparkles className="text-cyan-400 w-3.5 h-3.5" aria-hidden="true" />
          <div className="font-mono text-left">
            <div className="text-[8px] text-stone-400 font-bold leading-none uppercase short:hidden">
              DIAMONDS
            </div>
            <div className="text-[11px] font-bold text-cyan-400 leading-tight tabular-nums">
              {profile.diamonds.toLocaleString()}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onAddCurrency("diamonds", 50)}
            className="h-full ml-0.5 bg-cyan-500/15 hover:bg-cyan-500 active:bg-cyan-500 text-cyan-400 hover:text-stone-900 active:text-stone-900 w-7 flex items-center justify-center font-bold text-sm transition-colors border-l border-cyan-500/20"
            aria-label="Add 50 diamonds"
          >
            +
          </button>
        </div>
        {/* Menu button with dropdown */}
        <div className="flex-shrink-0 relative" ref={menuRef}>
          {activeScreen === "home" ? (
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={`bg-white/5 hover:bg-[#76a035]/20 hover:border-[#76a035]/50 border border-military text-[#76a035] p-2 rounded transition-all flex items-center justify-center cursor-pointer h-9 w-9 ${menuOpen ? "bg-[#76a035]/20 border-[#76a035]/50" : ""}`}
            >
              <Menu size={18} />
            </button>
          ) : (
            <button
              onClick={() => onChangeScreen("home")}
              className="bg-[#76a035]/10 hover:bg-[#76a035]/25 border border-military-active text-[#76a035] p-2 rounded transition-all flex items-center justify-center cursor-pointer h-9 w-9 animate-pulse"
            >
              <Home size={18} />
            </button>
          )}

          {/* Settings dropdown */}
          {menuOpen && activeScreen === "home" && (
            <div className="absolute right-0 top-full mt-2 w-56 max-h-[calc(100cqh-64px)] overflow-y-auto bg-stone-950 border border-military rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 bg-zinc-900/80 border-b border-military/50">
                <div className="text-[9px] font-mono font-black text-stone-500 uppercase tracking-widest">
                  SETTINGS
                </div>
              </div>

              {/* Music toggle */}
              <button
                onClick={() => setMusicOn((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-stone-900/60 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  {musicOn ? (
                    <Music size={14} className="text-[#76a035]" />
                  ) : (
                    <Music2 size={14} className="text-stone-500" />
                  )}
                  <span className="font-mono text-xs font-bold text-stone-300 group-hover:text-white uppercase tracking-wide">
                    Music
                  </span>
                </div>
                <div
                  className={`w-8 h-4 rounded-full relative transition-colors ${musicOn ? "bg-[#76a035]" : "bg-stone-700"}`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow ${musicOn ? "left-4" : "left-0.5"}`}
                  />
                </div>
              </button>

              {/* Sound toggle */}
              <button
                onClick={() => setSoundOn((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-stone-900/60 transition-colors group border-t border-military/20"
              >
                <div className="flex items-center gap-2.5">
                  {soundOn ? (
                    <Volume2 size={14} className="text-[#76a035]" />
                  ) : (
                    <VolumeX size={14} className="text-stone-500" />
                  )}
                  <span className="font-mono text-xs font-bold text-stone-300 group-hover:text-white uppercase tracking-wide">
                    Sound FX
                  </span>
                </div>
                <div
                  className={`w-8 h-4 rounded-full relative transition-colors ${soundOn ? "bg-[#76a035]" : "bg-stone-700"}`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow ${soundOn ? "left-4" : "left-0.5"}`}
                  />
                </div>
              </button>

              {/* Controller settings */}
              <div className="border-t border-military/20 px-3 py-2.5">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <Gamepad size={14} className="text-stone-400" />
                  <span className="font-mono text-xs font-bold text-stone-400 uppercase tracking-wide">
                    Controller
                  </span>
                </div>
                <div className="font-mono text-[9px] text-stone-600 space-y-0.5 pl-5">
                  <div>
                    <span className="text-stone-500">Move</span> — Left pad
                  </div>
                  <div>
                    <span className="text-stone-500">Jump / Crouch</span> — Up / Down
                  </div>
                  <div>
                    <span className="text-stone-500">Fire</span> — Big red button
                  </div>
                  <div>
                    <span className="text-stone-500">Reload</span> — Right pad
                  </div>
                </div>
              </div>

              {/* Exit */}
              <div className="border-t border-military/30">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    window.location.reload();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-red-950/30 transition-colors group"
                >
                  <LogOut size={14} className="text-red-500" />
                  <span className="font-mono text-xs font-bold text-red-400 group-hover:text-red-300 uppercase tracking-wide">
                    Exit Game
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
